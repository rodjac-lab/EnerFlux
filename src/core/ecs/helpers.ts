import { DHWTank, WATER_HEAT_CAPACITY_WH_PER_L_PER_K } from '../../devices/DHWTank';
import type { StrategyRequest } from '../strategy';
import type { EcsServiceContract } from './contract';

export interface EcsHelperState {
  hysteresisLatch: Map<string, boolean>;
}

export interface ForcedAllocation {
  device: DHWTank;
  power_kW: number;
}

export interface ProcessEcsRequestsArgs {
  requests: StrategyRequest[];
  contract: EcsServiceContract;
  dt_s: number;
  time_s: number;
  surplus_kW: number;
}

export interface ProcessEcsRequestsResult {
  requests: StrategyRequest[];
  forcedAllocations: ForcedAllocation[];
  remainingSurplus_kW: number;
}

export const createEcsHelperState = (): EcsHelperState => ({
  hysteresisLatch: new Map<string, boolean>()
});

const computeLowThreshold = (contract: EcsServiceContract): number =>
  contract.targetCelsius - Math.max(0.1, contract.helpers.hysteresisBand_K);

const computeHighThreshold = (contract: EcsServiceContract, lowThreshold: number): number => {
  const nearTarget = contract.targetCelsius - 0.2;
  if (nearTarget <= lowThreshold) {
    return Math.max(lowThreshold + 0.1, contract.targetCelsius);
  }
  return nearTarget;
};

const normalizeTimeOfDay = (time_s: number): number => {
  const daySeconds = 86400;
  const mod = time_s % daySeconds;
  return mod >= 0 ? mod : mod + daySeconds;
};

const hoursToSeconds = (hours: number): number => hours * 3600;

const computeDeficitEnergy_kWh = (tank: DHWTank, deficit_K: number): number => {
  if (deficit_K <= 0) {
    return 0;
  }
  const energy_Wh = deficit_K * tank.volume_L * WATER_HEAT_CAPACITY_WH_PER_L_PER_K;
  return energy_Wh / 1000;
};

export const processEcsRequests = (
  args: ProcessEcsRequestsArgs,
  state: EcsHelperState
): ProcessEcsRequestsResult => {
  const { contract, dt_s } = args;
  const hysteresisEnabled = contract.helpers.hysteresisEnabled;
  const deadlineEnabled = contract.helpers.deadlineEnabled;
  const lowThreshold = computeLowThreshold(contract);
  const highThreshold = computeHighThreshold(contract, lowThreshold);
  let availableSurplus = Math.max(0, args.surplus_kW);
  const forcedAllocations: ForcedAllocation[] = [];
  const filteredRequests: StrategyRequest[] = [];
  const timeOfDay_s = normalizeTimeOfDay(args.time_s);
  const deadline_s = normalizeTimeOfDay(contract.deadlineHour * 3600);
  let timeUntilDeadline_s = deadline_s - timeOfDay_s;
  if (timeUntilDeadline_s < 0) {
    timeUntilDeadline_s += 86400;
  }
  const preheatWindow_s = hoursToSeconds(contract.helpers.deadlinePreheatWindowHours);

  for (const request of args.requests) {
    const device = request.device;
    const nextState = { ...request.state };
    request.state = nextState;

    if (!(device instanceof DHWTank)) {
      filteredRequests.push(request);
      continue;
    }

    const measuredTemp =
      typeof nextState.temp_C === 'number' && Number.isFinite(nextState.temp_C)
        ? Number(nextState.temp_C)
        : device.temperature;

    let latchedOff = state.hysteresisLatch.get(device.id) ?? false;
    if (!hysteresisEnabled) {
      latchedOff = false;
      state.hysteresisLatch.set(device.id, latchedOff);
    } else {
      if (!latchedOff && measuredTemp >= highThreshold) {
        latchedOff = true;
      } else if (latchedOff && measuredTemp <= lowThreshold) {
        latchedOff = false;
      }
      state.hysteresisLatch.set(device.id, latchedOff);
    }

    if (latchedOff) {
      nextState.ecs_hysteresis_blocked = true;
      continue;
    }

    const deficit_K = Math.max(0, contract.targetCelsius - measuredTemp);
    let remainingRequest = request.request.maxAccept_kW;

    if (
      deadlineEnabled &&
      preheatWindow_s > 0 &&
      timeUntilDeadline_s <= preheatWindow_s &&
      deficit_K > 0
    ) {
      const energyNeeded_kWh = computeDeficitEnergy_kWh(device, deficit_K);
      const powerNeeded_kW = Math.min((energyNeeded_kWh * 3600) / dt_s, request.request.maxAccept_kW);
      const powerToAllocate = Math.min(powerNeeded_kW, availableSurplus);
      if (powerToAllocate > 0) {
        forcedAllocations.push({ device, power_kW: powerToAllocate });
        availableSurplus = Math.max(0, availableSurplus - powerToAllocate);
        remainingRequest = Math.max(0, remainingRequest - powerToAllocate);
        nextState.ecs_deadline_preheat_kW = (typeof nextState.ecs_deadline_preheat_kW === 'number' ? nextState.ecs_deadline_preheat_kW : 0) + powerToAllocate;
      }
      nextState.ecs_deadline_urgent = true;
      nextState.ecs_deadline_priority = 0;
    }

    if (remainingRequest > 1e-6) {
      if (nextState.ecs_deadline_priority === undefined) {
        nextState.ecs_deadline_priority = 1;
      }
      filteredRequests.push({
        device: request.device,
        request: { ...request.request, maxAccept_kW: remainingRequest },
        state: nextState
      });
    }
  }

  return {
    requests: filteredRequests,
    forcedAllocations,
    remainingSurplus_kW: availableSurplus
  };
};
