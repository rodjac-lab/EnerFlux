/**
 * Model Predictive Control (MPC) strategy system for Mode Coach.
 *
 * MPC strategies extend reactive strategies with forecast-based lookahead:
 * - Anticipate tomorrow's weather (sunny/cloudy)
 * - React to Tempo color changes (BLUE/WHITE/RED pricing)
 * - Optimize energy storage (battery + ECS) based on 24h horizon
 *
 * Phase 1-2: Implements 4 simple heuristics with mock forecasts.
 * Phase 4+: Can integrate real weather APIs (Météo France, Open-Meteo).
 *
 * @module core/mpcStrategy
 */

import type { Strategy, StrategyContext, StrategyAllocation, StrategyRequest } from './strategy';
import type { Forecast, TempoColor } from './forecast';

/**
 * MPC strategy identifiers.
 * Extends StrategyId from strategy.ts (reactive strategies).
 */
export type MPCStrategyId =
  | 'mpc_sunny_tomorrow'
  | 'mpc_cloudy_tomorrow'
  | 'mpc_tempo_red_guard'
  | 'mpc_balanced';

/**
 * Extended strategy context with forecast data.
 * Used by MPC strategies to make anticipatory decisions.
 */
export interface MPCStrategyContext extends StrategyContext {
  /** Forecast horizon (24-48h lookahead) */
  forecast: Forecast;

  /** Current day's tariff color (if Tempo) */
  tempoColor?: TempoColor;

  /** Tomorrow's tariff color (if Tempo, J-1 announcement at 11h) */
  tempoColorTomorrow?: TempoColor;
}

/**
 * MPC strategy function signature.
 * Returns allocations like reactive strategies, but uses forecast data.
 */
export type MPCStrategy = (context: MPCStrategyContext) => StrategyAllocation[];

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Check if device is thermal storage (DHW tank or heating).
 */
function isThermalStorage(req: StrategyRequest): boolean {
  return req.device.capabilities.includes('thermal-storage');
}

/**
 * Check if device is electrical storage (battery).
 */
function isElectricalStorage(req: StrategyRequest): boolean {
  return req.device.capabilities.includes('electrical-storage');
}

/**
 * Check if device is DHW tank specifically (vs heating).
 */
function isDhwTank(req: StrategyRequest): boolean {
  return (
    req.device.capabilities.includes('thermal-storage') &&
    !('heating_power_kW' in req.state)
  );
}

/**
 * Get battery SOC percentage from request state.
 */
function getBatterySocPercent(requests: StrategyRequest[]): number | undefined {
  const batteryReq = requests.find((req) => isElectricalStorage(req));
  if (!batteryReq) {
    return undefined;
  }
  const socPercent = batteryReq.state.soc_percent ?? batteryReq.state.socFraction;
  if (typeof socPercent === 'number') {
    return socPercent;
  }
  return undefined;
}

/**
 * Analyze forecast to estimate tomorrow's PV production.
 * Looks at next 24h window and computes expected energy yield.
 */
function estimateTomorrowPV(forecast: Forecast, currentHour: number): number {
  const horizonHours = Math.min(forecast.horizon_hours, 48);
  let tomorrowPV_kWh = 0;

  // Look at hours 24-48 (tomorrow's profile if forecast is 48h)
  // If forecast is only 24h, we get partial tomorrow data
  const startHour = Math.max(0, 24 - currentHour);
  const endHour = Math.min(horizonHours, 48 - currentHour);

  for (let h = startHour; h < endHour; h++) {
    if (h < forecast.pvNext_kW.length) {
      tomorrowPV_kWh += forecast.pvNext_kW[h]; // Approximate energy as sum of power
    }
  }

  return tomorrowPV_kWh;
}

/**
 * Analyze forecast to estimate today's remaining PV production.
 */
function estimateTodayRemainingPV(forecast: Forecast): number {
  let remainingPV_kWh = 0;
  const lookAhead = Math.min(12, forecast.horizon_hours); // Next 12h

  for (let h = 0; h < lookAhead; h++) {
    if (h < forecast.pvNext_kW.length) {
      remainingPV_kWh += forecast.pvNext_kW[h];
    }
  }

  return remainingPV_kWh;
}

/**
 * Allocate power following priority order (shared logic).
 * Reuses waterfall allocation from reactive strategies.
 */
function allocateFollowingOrder(
  context: StrategyContext,
  priorityFn: (req: StrategyRequest) => number
): StrategyAllocation[] {
  let remaining = context.surplus_kW;
  const allocations: StrategyAllocation[] = [];

  const sorted = [...context.requests].sort((a, b) => {
    const priorityDiff = priorityFn(a) - priorityFn(b);
    if (priorityDiff !== 0) return priorityDiff;
    return a.device.id.localeCompare(b.device.id);
  });

  for (const req of sorted) {
    if (remaining <= 0) break;
    const power = Math.min(req.request.maxAccept_kW, remaining);
    if (power <= 0) continue;
    allocations.push({ deviceId: req.device.id, power_kW: power });
    remaining -= power;
  }

  return allocations;
}

// ============================================================================
// MPC Heuristic 1: "Sunny Tomorrow" Strategy
// ============================================================================

/**
 * **MPC Heuristic 1: Prioritize ECS heating if tomorrow is sunny.**
 *
 * **Logic**:
 * - If tomorrow's PV forecast is strong (≥20 kWh), fill DHW tank today
 * - Save battery capacity for tomorrow's surplus absorption
 * - Anticipates that tomorrow's sun will provide excess energy for battery
 *
 * **Expected Gain**: +15-25% vs reactive (avoids grid import for ECS)
 *
 * **Pseudocode** (from algorithms_playbook.md):
 * ```
 * IF tomorrow_pv_forecast ≥ 20 kWh THEN
 *   priority_order = [ECS, Battery]
 * ELSE
 *   priority_order = [Battery, ECS] (fallback to reactive)
 * END IF
 * ```
 */
export const mpcSunnyTomorrowStrategy: MPCStrategy = (context) => {
  const currentHour = Math.floor((context.time_s % 86400) / 3600);
  const tomorrowPV = estimateTomorrowPV(context.forecast, currentHour);

  const SUNNY_THRESHOLD = 20; // kWh (roughly 6kWp * 3-4h peak)

  if (tomorrowPV >= SUNNY_THRESHOLD) {
    // Tomorrow is sunny → Prioritize thermal storage (ECS)
    // Reasoning: DHW tank will store energy thermally, freeing battery for tomorrow
    return allocateFollowingOrder(context, (req) => {
      if (isDhwTank(req)) return 0; // Highest priority
      if (isThermalStorage(req)) return 1; // Heating second
      if (isElectricalStorage(req)) return 2; // Battery third
      return 5; // Other devices
    });
  }

  // Tomorrow is cloudy/uncertain → Default to battery-first (reactive behavior)
  return allocateFollowingOrder(context, (req) => {
    if (isElectricalStorage(req)) return 0;
    if (isThermalStorage(req)) return 1;
    return 5;
  });
};

// ============================================================================
// MPC Heuristic 2: "Cloudy Tomorrow" Strategy
// ============================================================================

/**
 * **MPC Heuristic 2: Maximize battery charge if tomorrow is cloudy.**
 *
 * **Logic**:
 * - If tomorrow's PV forecast is weak (≤10 kWh), prioritize battery charging today
 * - Ensures battery is full before low-production day
 * - Thermal loads (ECS) deferred or grid-powered if necessary
 *
 * **Expected Gain**: +10-20% vs reactive (avoids expensive grid import tomorrow)
 *
 * **Pseudocode**:
 * ```
 * IF tomorrow_pv_forecast ≤ 10 kWh AND battery_soc < 80% THEN
 *   priority_order = [Battery, ECS]
 * ELSE
 *   priority_order = [ECS, Battery]
 * END IF
 * ```
 */
export const mpcCloudyTomorrowStrategy: MPCStrategy = (context) => {
  const currentHour = Math.floor((context.time_s % 86400) / 3600);
  const tomorrowPV = estimateTomorrowPV(context.forecast, currentHour);
  const batterySoc = getBatterySocPercent(context.requests) ?? 100;

  const CLOUDY_THRESHOLD = 10; // kWh
  const SOC_TARGET = 80; // %

  if (tomorrowPV <= CLOUDY_THRESHOLD && batterySoc < SOC_TARGET) {
    // Tomorrow is cloudy + battery not full → Prioritize battery
    return allocateFollowingOrder(context, (req) => {
      if (isElectricalStorage(req)) return 0; // Battery first
      if (isThermalStorage(req)) return 2; // Thermal second
      return 5;
    });
  }

  // Tomorrow is sunny or battery full → Prioritize thermal
  return allocateFollowingOrder(context, (req) => {
    if (isThermalStorage(req)) return 0;
    if (isElectricalStorage(req)) return 1;
    return 5;
  });
};

// ============================================================================
// MPC Heuristic 3: "Tempo RED Guard" Strategy
// ============================================================================

/**
 * **MPC Heuristic 3: Maximum battery reserve if Tempo RED tomorrow.**
 *
 * **Logic**:
 * - If tomorrow is Tempo RED (0.76€/kWh peak), ensure battery is ≥90% SOC
 * - Minimize grid import on RED days (4x more expensive than BLUE)
 * - Absolute priority to battery charging, defer all other loads
 *
 * **Expected Gain**: +30-40% cost savings on RED weeks vs reactive
 *
 * **Pseudocode**:
 * ```
 * IF tempo_tomorrow = RED AND battery_soc < 90% THEN
 *   priority_order = [Battery ONLY]
 *   // ECS and other loads wait until battery full
 * ELSE IF tempo_today = RED THEN
 *   // Discharge battery aggressively, avoid grid
 *   (handled by engine discharge logic)
 * ELSE
 *   priority_order = [ECS, Battery]
 * END IF
 * ```
 */
export const mpcTempoRedGuardStrategy: MPCStrategy = (context) => {
  const batterySoc = getBatterySocPercent(context.requests) ?? 100;
  const tomorrowIsRed = context.tempoColorTomorrow === 'RED';
  const todayIsRed = context.tempoColor === 'RED';

  const RED_RESERVE_TARGET = 90; // % SOC

  if (tomorrowIsRed && batterySoc < RED_RESERVE_TARGET) {
    // RED day coming → ABSOLUTE priority to battery
    return allocateFollowingOrder(context, (req) => {
      if (isElectricalStorage(req)) return 0;
      return 100; // All other devices deprioritized
    });
  }

  if (todayIsRed) {
    // Today is RED → Avoid charging battery (discharge is preferred)
    // Prioritize direct PV usage for loads
    return allocateFollowingOrder(context, (req) => {
      if (isThermalStorage(req)) return 0; // Direct PV to loads
      if (isElectricalStorage(req)) return 10; // Battery charging low priority
      return 5;
    });
  }

  // Normal day (BLUE/WHITE) → Balanced strategy
  return allocateFollowingOrder(context, (req) => {
    if (isThermalStorage(req)) return 0;
    if (isElectricalStorage(req)) return 1;
    return 5;
  });
};

// ============================================================================
// MPC Heuristic 4: "Balanced" Strategy
// ============================================================================

/**
 * **MPC Heuristic 4: Balanced strategy combining all heuristics.**
 *
 * **Logic**:
 * - Integrates sunny/cloudy detection + Tempo awareness
 * - Uses multi-criteria decision:
 *   - If tomorrow sunny → ECS priority
 *   - If tomorrow cloudy → Battery priority
 *   - If tomorrow RED → Battery maximum
 *   - If today RED → Direct loads, minimal battery charge
 *
 * **Expected Gain**: +20-30% vs reactive (best average performance)
 *
 * **Pseudocode**:
 * ```
 * IF tempo_tomorrow = RED THEN
 *   APPLY tempo_red_guard logic
 * ELSE IF tomorrow_pv ≥ 20 kWh THEN
 *   APPLY sunny_tomorrow logic
 * ELSE IF tomorrow_pv ≤ 10 kWh THEN
 *   APPLY cloudy_tomorrow logic
 * ELSE
 *   DEFAULT balanced allocation
 * END IF
 * ```
 */
export const mpcBalancedStrategy: MPCStrategy = (context) => {
  const currentHour = Math.floor((context.time_s % 86400) / 3600);
  const tomorrowPV = estimateTomorrowPV(context.forecast, currentHour);
  const batterySoc = getBatterySocPercent(context.requests) ?? 100;
  const tomorrowIsRed = context.tempoColorTomorrow === 'RED';
  const todayIsRed = context.tempoColor === 'RED';

  const SUNNY_THRESHOLD = 20; // kWh
  const CLOUDY_THRESHOLD = 10; // kWh
  const RED_RESERVE_TARGET = 90; // %
  const NORMAL_SOC_TARGET = 70; // %

  // Rule 1: Tempo RED tomorrow → Maximum battery reserve
  if (tomorrowIsRed && batterySoc < RED_RESERVE_TARGET) {
    return allocateFollowingOrder(context, (req) => {
      if (isElectricalStorage(req)) return 0;
      return 100; // Defer all loads
    });
  }

  // Rule 2: Today is RED → Avoid battery charging, direct loads
  if (todayIsRed) {
    return allocateFollowingOrder(context, (req) => {
      if (isThermalStorage(req)) return 0;
      if (isElectricalStorage(req)) return 10;
      return 5;
    });
  }

  // Rule 3: Tomorrow sunny → Prioritize thermal storage
  if (tomorrowPV >= SUNNY_THRESHOLD) {
    return allocateFollowingOrder(context, (req) => {
      if (isDhwTank(req)) return 0;
      if (isThermalStorage(req)) return 1;
      if (isElectricalStorage(req)) return 2;
      return 5;
    });
  }

  // Rule 4: Tomorrow cloudy → Prioritize battery if not full
  if (tomorrowPV <= CLOUDY_THRESHOLD && batterySoc < NORMAL_SOC_TARGET) {
    return allocateFollowingOrder(context, (req) => {
      if (isElectricalStorage(req)) return 0;
      if (isThermalStorage(req)) return 2;
      return 5;
    });
  }

  // Rule 5: Normal conditions → Standard priority (ECS first)
  return allocateFollowingOrder(context, (req) => {
    if (isThermalStorage(req)) return 0;
    if (isElectricalStorage(req)) return 1;
    return 5;
  });
};

/**
 * Resolve MPC strategy by ID.
 * Returns the corresponding strategy function.
 */
export function resolveMPCStrategy(id: MPCStrategyId): MPCStrategy {
  switch (id) {
    case 'mpc_sunny_tomorrow':
      return mpcSunnyTomorrowStrategy;
    case 'mpc_cloudy_tomorrow':
      return mpcCloudyTomorrowStrategy;
    case 'mpc_tempo_red_guard':
      return mpcTempoRedGuardStrategy;
    case 'mpc_balanced':
      return mpcBalancedStrategy;
    default:
      return mpcBalancedStrategy;
  }
}

/**
 * Convert MPC strategy to reactive strategy by ignoring forecast.
 * Used by engine when forecast is not available (backward compatibility).
 */
export function mpcToReactiveStrategy(mpcStrategy: MPCStrategy): Strategy {
  return (context: StrategyContext): StrategyAllocation[] => {
    // Create empty forecast (MPC strategy will fall back to reactive behavior)
    const emptyForecast: Forecast = {
      horizon_hours: 0,
      pvNext_kW: [],
      importPricesNext_eur_kWh: [],
      exportPricesNext_eur_kWh: [],
      ambientTempNext_C: []
    };

    const mpcContext: MPCStrategyContext = {
      ...context,
      forecast: emptyForecast
    };

    return mpcStrategy(mpcContext);
  };
}
