/**
 * Weekly simulation orchestrator for Mode Coach Prédictif.
 *
 * Extends the existing 24h engine (engine.ts) to run 7-day simulations with:
 * - Daily weather/tariff variations
 * - MPC strategies with forecast lookahead
 * - Cross-day device state persistence (battery SOC, DHW temp)
 * - Weekly KPIs aggregation
 *
 * **Architecture**:
 * - Runs engine.runSimulation() 7 times (once per day)
 * - Carries device state across days (battery SOC, tank temperature)
 * - Injects daily weather/tariff profiles from WeeklyForecast
 * - Computes weekly totals and averages
 *
 * @module core/weekSimulation
 */

import { runSimulation, type SimulationInput, type SimulationResult } from './engine';
import type { Device } from '../devices/Device';
import type { WeeklyForecast, Forecast } from './forecast';
import type { MPCStrategy, MPCStrategyContext } from './mpcStrategy';
import type { SimulationKPIs } from './kpis';
import { Battery } from '../devices/Battery';
import { DHWTank } from '../devices/DHWTank';

/**
 * Weekly simulation input configuration.
 * Extends SimulationInput with multi-day forecast.
 */
export interface WeeklySimulationInput {
  /** Time step in seconds (e.g., 900 = 15min) */
  dt_s: number;

  /** Weekly forecast (7 days of weather + tariffs) */
  forecast: WeeklyForecast;

  /** Device instances (battery, DHW tank, EV charger, etc.) */
  devices: readonly Device[];

  /** MPC strategy to use (with forecast lookahead) */
  mpcStrategy: MPCStrategy;

  /** Base load profile type ('residential', 'high-consumption', etc.) - optional */
  baseLoadProfile?: 'residential' | 'high-consumption';

  /** ECS service contract options (deadline, mode, etc.) - optional */
  ecsService?: {
    mode?: 'force' | 'penalize' | 'monitor';
    deadlineHour?: number;
    targetCelsius?: number;
  };
}

/**
 * Daily simulation result within weekly run.
 * Contains one day's data + cumulative state.
 */
export interface DailyResult {
  /** Day index (0-6) */
  day: number;

  /** ISO date string */
  date: string;

  /** Daily KPIs */
  kpis: SimulationKPIs;

  /** Full simulation result for this day */
  simulation: SimulationResult;
}

/**
 * Weekly simulation result.
 * Aggregates 7 daily results + computes weekly totals.
 */
export interface WeeklySimulationResult {
  /** Weekly forecast used */
  forecast: WeeklyForecast;

  /** Daily results (length = 7) */
  days: readonly DailyResult[];

  /** Weekly aggregated KPIs */
  weeklyKPIs: {
    /** Total PV production (kWh) */
    pvProduction_kWh: number;

    /** Total consumption (kWh) */
    consumption_kWh: number;

    /** Total grid import (kWh) */
    gridImport_kWh: number;

    /** Total grid export (kWh) */
    gridExport_kWh: number;

    /** Self-consumption rate (%) */
    selfConsumption_percent: number;

    /** Autarky rate (%) */
    autarky_percent: number;

    /** Total cost (€) */
    totalCost_eur: number;

    /** Total import cost (€) */
    importCost_eur: number;

    /** Total export revenue (€) */
    exportRevenue_eur: number;

    /** Net cost with penalties (€) */
    netCostWithPenalties_eur: number;

    /** Average ECS comfort (hit rate, 0-1) */
    ecsComfortAvg: number;

    /** Total ECS rescue energy (kWh) */
    ecsRescueTotal_kWh: number;
  };
}

/**
 * Resample hourly data (24 values) to arbitrary time step resolution.
 * Uses linear interpolation between hourly values.
 */
function resampleHourlyToSteps(hourlyData: readonly number[], targetSteps: number): number[] {
  const result = new Array<number>(targetSteps);
  
  for (let i = 0; i < targetSteps; i++) {
    const hourFloat = (i / targetSteps) * 24; // Hour position in [0, 24)
    const hourIndex = Math.floor(hourFloat);
    const fraction = hourFloat - hourIndex;
    
    const value1 = hourlyData[hourIndex % 24];
    const value2 = hourlyData[(hourIndex + 1) % 24];
    
    // Linear interpolation
    result[i] = value1 + (value2 - value1) * fraction;
  }
  
  return result;
}

/**
 * Generate base load series for a day.
 * Simplified profile (can be replaced with real load profiles later).
 */
function generateBaseLoadSeries(dt_s: number, profile: 'residential' | 'high-consumption'): number[] {
  const stepsPerDay = Math.floor(86400 / dt_s);
  const load: number[] = new Array(stepsPerDay);

  const baseLevel = profile === 'high-consumption' ? 1.2 : 0.8; // kW
  const eveningPeak = profile === 'high-consumption' ? 2.5 : 1.5; // kW

  for (let i = 0; i < stepsPerDay; i++) {
    const hour = (i * dt_s) / 3600;

    // Morning bump (7h-9h)
    const morningBump = Math.exp(-((hour - 7.5) ** 2) / 1.5) * 0.5;

    // Evening peak (18h-22h)
    const eveningBump = Math.exp(-((hour - 20) ** 2) / 3) * eveningPeak;

    load[i] = baseLevel + morningBump + eveningBump;
  }

  return load;
}

/**
 * Build forecast horizon from weekly data for MPC strategy.
 * Extracts next 24h from current time position in week.
 */
function buildForecastHorizon(
  forecast: WeeklyForecast,
  currentDay: number,
  currentHour: number
): Forecast {
  const horizonHours = 24;
  const pvNext_kW: number[] = [];
  const importPricesNext: number[] = [];
  const exportPricesNext: number[] = [];
  const ambientTempNext: number[] = [];

  for (let h = 0; h < horizonHours; h++) {
    const totalHours = currentDay * 24 + currentHour + h;
    const targetDay = Math.floor(totalHours / 24);
    const targetHour = totalHours % 24;

    if (targetDay >= 7) {
      // Beyond week end - repeat last day
      const lastWeather = forecast.weather[6];
      const lastTariff = forecast.tariffs[6];
      pvNext_kW.push(lastWeather.pvProfile_kW[targetHour]);
      importPricesNext.push(lastTariff.importPriceSeries_eur_kWh[targetHour]);
      exportPricesNext.push(lastTariff.exportPriceSeries_eur_kWh[targetHour]);
      ambientTempNext.push(lastWeather.ambientTempProfile_C[targetHour]);
    } else {
      const weather = forecast.weather[targetDay];
      const tariff = forecast.tariffs[targetDay];
      pvNext_kW.push(weather.pvProfile_kW[targetHour]);
      importPricesNext.push(tariff.importPriceSeries_eur_kWh[targetHour]);
      exportPricesNext.push(tariff.exportPriceSeries_eur_kWh[targetHour]);
      ambientTempNext.push(weather.ambientTempProfile_C[targetHour]);
    }
  }

  return {
    horizon_hours: horizonHours,
    pvNext_kW,
    importPricesNext_eur_kWh: importPricesNext,
    exportPricesNext_eur_kWh: exportPricesNext,
    ambientTempNext_C: ambientTempNext
  };
}

/**
 * Run weekly simulation (7 days) with MPC strategy.
 *
 * **Process**:
 * 1. For each day (0-6):
 *    - Extract daily weather/tariff from forecast
 *    - Build 24h forecast horizon for MPC
 *    - Wrap MPC strategy with forecast injection
 *    - Run engine.runSimulation() for 24h
 *    - Carry device states to next day (battery SOC, DHW temp)
 * 2. Aggregate daily KPIs into weekly totals
 * 3. Return complete weekly result
 *
 * @param input - Weekly simulation configuration
 * @returns Weekly simulation result with daily breakdowns
 */
export function runWeeklySimulation(input: WeeklySimulationInput): WeeklySimulationResult {
  const { dt_s, forecast, devices, mpcStrategy, baseLoadProfile = 'residential', ecsService } = input;

  const dailyResults: DailyResult[] = [];

  // Weekly accumulation variables
  let weeklyPV_kWh = 0;
  let weeklyConsumption_kWh = 0;
  let weeklyGridImport_kWh = 0;
  let weeklyGridExport_kWh = 0;
  let weeklyImportCost_eur = 0;
  let weeklyExportRevenue_eur = 0;
  let weeklyNetCost_eur = 0;
  let weeklyEcsRescue_kWh = 0;
  let ecsComfortSum = 0;
  let ecsComfortCount = 0;

  // Device state persistence across days
  // (Devices already maintain internal state, but we track for logging)
  const batteries = devices.filter((d): d is Battery => d instanceof Battery);
  const dhwTanks = devices.filter((d): d is DHWTank => d instanceof DHWTank);

  for (let day = 0; day < 7; day++) {
    const weather = forecast.weather[day];
    const tariff = forecast.tariffs[day];

    // Generate daily series (resample hourly data to dt_s resolution)
    const stepsPerDay = Math.floor(86400 / dt_s);
    const pvSeries_kW = resampleHourlyToSteps(weather.pvProfile_kW, stepsPerDay);
    const baseLoadSeries_kW = generateBaseLoadSeries(dt_s, baseLoadProfile);
    const importPrices = resampleHourlyToSteps(tariff.importPriceSeries_eur_kWh, stepsPerDay);
    const exportPrices = resampleHourlyToSteps(tariff.exportPriceSeries_eur_kWh, stepsPerDay);

    // Wrap MPC strategy to inject forecast at each step
    // The forecast horizon updates throughout the day (e.g., at 0h, 6h, 12h, 18h)
    const wrappedStrategy = (context: any) => {
      const currentHour = Math.floor((context.time_s % 86400) / 3600);
      const forecastHorizon = buildForecastHorizon(forecast, day, currentHour);

      const mpcContext: MPCStrategyContext = {
        ...context,
        forecast: forecastHorizon,
        tempoColor: tariff.tempoColor,
        tempoColorTomorrow: day < 6 ? forecast.tariffs[day + 1].tempoColor : undefined
      };

      return mpcStrategy(mpcContext);
    };

    // Run daily simulation
    const dailyInput: SimulationInput = {
      dt_s,
      pvSeries_kW: [...pvSeries_kW], // Clone to avoid mutation
      baseLoadSeries_kW,
      devices,
      strategy: wrappedStrategy,
      ambientTemp_C: weather.avgAmbientTemp_C,
      importPrices_EUR_per_kWh: [...importPrices],
      exportPrices_EUR_per_kWh: [...exportPrices],
      ecsService,
      debugTrace: false
    };

    const dailySimulation = runSimulation(dailyInput);

    // Accumulate weekly totals
    weeklyPV_kWh += dailySimulation.totals.pvProduction_kWh;
    weeklyConsumption_kWh += dailySimulation.totals.consumption_kWh;
    weeklyGridImport_kWh += dailySimulation.totals.gridImport_kWh;
    weeklyGridExport_kWh += dailySimulation.totals.gridExport_kWh;
    weeklyImportCost_eur += dailySimulation.kpis.euros.import_cost;
    weeklyExportRevenue_eur += dailySimulation.kpis.euros.export_revenue;
    weeklyNetCost_eur += dailySimulation.kpis.euros.net_cost_with_penalties;
    weeklyEcsRescue_kWh += dailySimulation.totals.ecsRescue_kWh;

    if (dailySimulation.kpis.ecs_hit_rate !== undefined) {
      ecsComfortSum += dailySimulation.kpis.ecs_hit_rate;
      ecsComfortCount += 1;
    }

    dailyResults.push({
      day,
      date: weather.date,
      kpis: dailySimulation.kpis,
      simulation: dailySimulation
    });

    // Device states automatically persist (mutable objects)
    // Log state transitions for debugging (optional)
    if (batteries.length > 0) {
      const battSOC = batteries[0].soc_kWhValue;
      console.debug(`[Day ${day}] Battery SOC end: ${battSOC.toFixed(2)} kWh`);
    }
    if (dhwTanks.length > 0) {
      const dhwTemp = dhwTanks[0].temperature;
      console.debug(`[Day ${day}] DHW temp end: ${dhwTemp.toFixed(1)} °C`);
    }
  }

  // Compute weekly aggregated KPIs
  const selfConsumption_percent =
    weeklyPV_kWh > 0 ? ((weeklyPV_kWh - weeklyGridExport_kWh) / weeklyPV_kWh) * 100 : 0;
  const autarky_percent =
    weeklyConsumption_kWh > 0 ? ((weeklyConsumption_kWh - weeklyGridImport_kWh) / weeklyConsumption_kWh) * 100 : 0;
  const ecsComfortAvg = ecsComfortCount > 0 ? ecsComfortSum / ecsComfortCount : 0;

  return {
    forecast,
    days: dailyResults,
    weeklyKPIs: {
      pvProduction_kWh: weeklyPV_kWh,
      consumption_kWh: weeklyConsumption_kWh,
      gridImport_kWh: weeklyGridImport_kWh,
      gridExport_kWh: weeklyGridExport_kWh,
      selfConsumption_percent,
      autarky_percent,
      totalCost_eur: weeklyImportCost_eur,
      importCost_eur: weeklyImportCost_eur,
      exportRevenue_eur: weeklyExportRevenue_eur,
      netCostWithPenalties_eur: weeklyNetCost_eur,
      ecsComfortAvg,
      ecsRescueTotal_kWh: weeklyEcsRescue_kWh
    }
  };
}

/**
 * Compare two weekly simulations (MPC vs baseline).
 * Returns delta metrics showing MPC gains.
 */
export interface WeeklyComparisonResult {
  mpc: WeeklySimulationResult;
  baseline: WeeklySimulationResult;
  gains: {
    costReduction_eur: number;
    costReduction_percent: number;
    gridImportReduction_kWh: number;
    gridImportReduction_percent: number;
    selfConsumptionGain_percent: number;
    ecsComfortGain_percent: number;
  };
}

export function compareWeeklySimulations(
  mpc: WeeklySimulationResult,
  baseline: WeeklySimulationResult
): WeeklyComparisonResult {
  const mpcCost = mpc.weeklyKPIs.netCostWithPenalties_eur;
  const baselineCost = baseline.weeklyKPIs.netCostWithPenalties_eur;
  const costReduction_eur = baselineCost - mpcCost;
  const costReduction_percent = baselineCost > 0 ? (costReduction_eur / baselineCost) * 100 : 0;

  const mpcImport = mpc.weeklyKPIs.gridImport_kWh;
  const baselineImport = baseline.weeklyKPIs.gridImport_kWh;
  const gridImportReduction_kWh = baselineImport - mpcImport;
  const gridImportReduction_percent = baselineImport > 0 ? (gridImportReduction_kWh / baselineImport) * 100 : 0;

  const selfConsumptionGain_percent =
    mpc.weeklyKPIs.selfConsumption_percent - baseline.weeklyKPIs.selfConsumption_percent;

  const ecsComfortGain_percent = (mpc.weeklyKPIs.ecsComfortAvg - baseline.weeklyKPIs.ecsComfortAvg) * 100;

  return {
    mpc,
    baseline,
    gains: {
      costReduction_eur,
      costReduction_percent,
      gridImportReduction_kWh,
      gridImportReduction_percent,
      selfConsumptionGain_percent,
      ecsComfortGain_percent
    }
  };
}
