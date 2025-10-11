import { Device, PowerRequest } from '../devices/Device';

export type StrategyId =
  | 'ecs_first'
  | 'ecs_hysteresis'
  | 'deadline_helper'
  | 'battery_first'
  | 'mix_soc_threshold'
  | 'reserve_evening'
  | 'ev_departure_guard';

export interface StrategyRequest {
  device: Device;
  request: PowerRequest;
  state: Record<string, number | boolean>;
}

export interface StrategyContext {
  surplus_kW: number;
  requests: StrategyRequest[];
  time_s: number;
  dt_s: number;
}

export interface StrategyAllocation {
  deviceId: string;
  power_kW: number;
}

export type Strategy = (context: StrategyContext) => StrategyAllocation[];

const getDeadlinePriority = (request: StrategyRequest): number => {
  const rawPriority = request.state['ecs_deadline_priority'];
  if (typeof rawPriority === 'number' && Number.isFinite(rawPriority)) {
    return rawPriority;
  }
  const urgentFlag = request.state['ecs_deadline_urgent'];
  if (typeof urgentFlag === 'boolean' && urgentFlag) {
    return 0;
  }
  return 1;
};

const allocateFollowingOrder = (
  context: StrategyContext,
  order: (req: StrategyRequest) => number
): StrategyAllocation[] => {
  let remaining = context.surplus_kW;
  const allocations: StrategyAllocation[] = [];
  const sorted = [...context.requests].sort((a, b) => {
    const deadlineDiff = getDeadlinePriority(a) - getDeadlinePriority(b);
    if (deadlineDiff !== 0) {
      return deadlineDiff;
    }
    const orderDiff = order(a) - order(b);
    if (orderDiff !== 0) {
      return orderDiff;
    }
    const priorityHintDiff = (b.request.priorityHint ?? 0) - (a.request.priorityHint ?? 0);
    if (priorityHintDiff !== 0) {
      return priorityHintDiff;
    }
    return a.device.id.localeCompare(b.device.id);
  });
  for (const req of sorted) {
    if (remaining <= 0) {
      break;
    }
    const power = Math.min(req.request.maxAccept_kW, remaining);
    if (power <= 0) {
      continue;
    }
    allocations.push({ deviceId: req.device.id, power_kW: power });
    remaining -= power;
  }
  return allocations;
};

const isThermal = (req: StrategyRequest): boolean => req.device.capabilities.includes('thermal-storage');
const isElectricalStorage = (req: StrategyRequest): boolean =>
  req.device.capabilities.includes('electrical-storage');
const isVehicleCharger = (req: StrategyRequest): boolean => req.device.capabilities.includes('vehicle-charger');

const normalizeTimeOfDayHours = (time_s: number): number => {
  const secondsPerDay = 86400;
  const normalized = ((time_s % secondsPerDay) + secondsPerDay) % secondsPerDay;
  return normalized / 3600;
};

export const ecsFirstStrategy: Strategy = (context) =>
  allocateFollowingOrder(context, (req) => (isThermal(req) ? 0 : 1));

export const ecsHysteresisStrategy: Strategy = (context) => ecsFirstStrategy(context);

export const ecsDeadlineHelperStrategy: Strategy = (context) => ecsFirstStrategy(context);

export const batteryFirstStrategy: Strategy = (context) =>
  allocateFollowingOrder(context, (req) => (isElectricalStorage(req) ? 0 : 1));

const getBatterySocPercent = (requests: StrategyRequest[]): number | undefined => {
  const batteryReq = requests.find((req) => isElectricalStorage(req));
  if (!batteryReq) {
    return undefined;
  }
  const socPercent = batteryReq.state.soc_percent ?? batteryReq.state.socFraction;
  if (typeof socPercent === 'number') {
    return socPercent;
  }
  return undefined;
};

export const mixSocThresholdStrategy = (thresholdPercent: number): Strategy => {
  const clamped = Math.max(0, Math.min(thresholdPercent, 100));
  return (context) => {
    const soc = getBatterySocPercent(context.requests);
    if (soc !== undefined && soc < clamped) {
      return allocateFollowingOrder(context, (req) => (isElectricalStorage(req) ? 0 : 1));
    }
    return allocateFollowingOrder(context, (req) => (isThermal(req) ? 0 : 1));
  };
};

const EVENING_WINDOW_START_HOUR = 18;
const RESERVE_SOC_TARGET_PERCENT = 60;
const EV_ARRIVAL_SOON_HOURS = 6;
const EV_URGENCY_THRESHOLD_HOURS = 1.5;
const EV_REQUIRED_POWER_RATIO_URGENT = 0.8;
const BASE_RESERVE_TARGET_PERCENT = 55;
const EV_RESERVE_TARGET_PERCENT = 70;

export const reserveEveningStrategy: Strategy = (context) => {
  const hourOfDay = normalizeTimeOfDayHours(context.time_s);
  const socPercent = getBatterySocPercent(context.requests);
  const needsReserveBuild =
    typeof socPercent === 'number' &&
    socPercent < RESERVE_SOC_TARGET_PERCENT &&
    hourOfDay < EVENING_WINDOW_START_HOUR;

  return allocateFollowingOrder(context, (req) => {
    if (isThermal(req)) {
      if (hourOfDay >= EVENING_WINDOW_START_HOUR) {
        return 0;
      }
      if (needsReserveBuild) {
        return 2;
      }
      return 0;
    }
    if (isElectricalStorage(req)) {
      if (needsReserveBuild) {
        return 0;
      }
      return 1;
    }
    return 5;
  });
};

const getNumberState = (state: Record<string, number | boolean>, key: string): number | undefined => {
  const value = state[key];
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }
  return undefined;
};

export const evDepartureGuardStrategy: Strategy = (context) => {
  const hourOfDay = normalizeTimeOfDayHours(context.time_s);
  const batterySoc = getBatterySocPercent(context.requests);
  const evRequests = context.requests.filter((request) => isVehicleCharger(request));

  let hasActiveEv = false;
  let hasUrgentEv = false;
  let soonestArrival_h = Number.POSITIVE_INFINITY;

  for (const request of evRequests) {
    const active = Boolean(request.state.session_active);
    const remainingEnergy = getNumberState(request.state, 'energy_remaining_kWh') ?? 0;
    const timeRemaining_h = getNumberState(request.state, 'session_time_remaining_h') ?? 0;
    const timeToStart_h = getNumberState(request.state, 'session_time_to_start_h');

    if (active) {
      hasActiveEv = true;
      if (timeRemaining_h <= EV_URGENCY_THRESHOLD_HOURS + 1e-6) {
        hasUrgentEv = true;
      }
      const requiredPower_kW = timeRemaining_h > 1e-6 ? remainingEnergy / timeRemaining_h : remainingEnergy * 10;
      if (requiredPower_kW >= (request.request.maxAccept_kW ?? 0) * EV_REQUIRED_POWER_RATIO_URGENT) {
        hasUrgentEv = true;
      }
    } else if (typeof timeToStart_h === 'number' && Number.isFinite(timeToStart_h)) {
      soonestArrival_h = Math.min(soonestArrival_h, Math.max(timeToStart_h, 0));
    }
  }

  const arrivalSoon = soonestArrival_h <= EV_ARRIVAL_SOON_HOURS;
  const needsReserveBuild =
    batterySoc !== undefined &&
    batterySoc < (hasActiveEv || arrivalSoon ? EV_RESERVE_TARGET_PERCENT : BASE_RESERVE_TARGET_PERCENT);
  const eveningReserveNeeded =
    batterySoc !== undefined && batterySoc < RESERVE_SOC_TARGET_PERCENT && hourOfDay < EVENING_WINDOW_START_HOUR;
  const shouldPrioritiseBattery = needsReserveBuild || eveningReserveNeeded;

  return allocateFollowingOrder(context, (req) => {
    if (isVehicleCharger(req)) {
      if (hasUrgentEv) {
        return -5;
      }
      if (hasActiveEv) {
        return shouldPrioritiseBattery ? 1 : 0;
      }
      if (arrivalSoon) {
        return 3;
      }
      return 5;
    }
    if (isElectricalStorage(req)) {
      if (shouldPrioritiseBattery) {
        return -4;
      }
      if (hasActiveEv && !hasUrgentEv) {
        return 3;
      }
      return 1;
    }
    if (isThermal(req)) {
      if (shouldPrioritiseBattery) {
        return 4;
      }
      if (hasUrgentEv) {
        return 3;
      }
      return 2;
    }
    return 6;
  });
};

export const resolveStrategy = (
  id: StrategyId,
  options?: { thresholdPercent?: number }
): Strategy => {
  switch (id) {
    case 'ecs_first':
      return ecsFirstStrategy;
    case 'ecs_hysteresis':
      return ecsHysteresisStrategy;
    case 'deadline_helper':
      return ecsDeadlineHelperStrategy;
    case 'battery_first':
      return batteryFirstStrategy;
    case 'mix_soc_threshold':
      return mixSocThresholdStrategy(options?.thresholdPercent ?? 50);
    case 'reserve_evening':
      return reserveEveningStrategy;
    case 'ev_departure_guard':
      return evDepartureGuardStrategy;
    default:
      return ecsFirstStrategy;
  }
};
