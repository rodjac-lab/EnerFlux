import { Device, PowerRequest } from '../devices/Device';

export type StrategyId = 'ecs_first' | 'battery_first' | 'mix_soc_threshold';

export interface StrategyRequest {
  device: Device;
  request: PowerRequest;
  state: Record<string, number | boolean>;
}

export interface StrategyContext {
  surplus_kW: number;
  requests: StrategyRequest[];
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

export const ecsFirstStrategy: Strategy = (context) =>
  allocateFollowingOrder(context, (req) => (isThermal(req) ? 0 : 1));

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

export const resolveStrategy = (
  id: StrategyId,
  options?: { thresholdPercent?: number }
): Strategy => {
  switch (id) {
    case 'ecs_first':
      return ecsFirstStrategy;
    case 'battery_first':
      return batteryFirstStrategy;
    case 'mix_soc_threshold':
      return mixSocThresholdStrategy(options?.thresholdPercent ?? 50);
    default:
      return ecsFirstStrategy;
  }
};
