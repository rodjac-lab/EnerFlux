import { Battery } from '../devices/Battery';
import { Device, EnvContext } from '../devices/Device';
import { DHWTank, WATER_HEAT_CAPACITY_WH_PER_L_PER_K } from '../devices/DHWTank';
import { PoolPump } from '../devices/PoolPump';
import { Heating } from '../devices/Heating';
import { EVCharger } from '../devices/EVCharger';
import { computeKPIs, KPIInput, SimulationKPIs, SimulationKPIsCore } from './kpis';
import { sumPositive } from './power-graph';
import { Strategy, StrategyContext, StrategyRequest } from './strategy';
import type { StepFlows } from '../data/types';
import {
  defaultEcsServiceContract,
  mergeEcsServiceContract,
  resolveTargetTemperature,
  type EcsServiceContract
} from '../data/ecs-service';
import { createEcsHelperState, processEcsRequests } from './ecs/helpers';
import { allocateByPriority, allocationsToMap, type PowerDemand } from './allocation';
import { getAllocationOrder, type DeviceType, type StrategyId } from './strategy';



export interface SimulationStepDevice {
  id: string;
  label: string;
  power_kW: number;
  state: Record<string, number | boolean>;
}

export interface SimulationStep {
  time_s: number;
  pv_kW: number;
  baseLoad_kW: number;
  pvUsedOnSite_kW: number;
  gridImport_kW: number;
  gridExport_kW: number;
  deviceStates: SimulationStepDevice[];
}

export interface SimulationTraceStep {
  time_s: number;
  pv_kW: number;
  baseLoad_kW: number;
  surplusBeforeStrategy_kW: number;
  deficitBeforeStrategy_kW: number;
  battery_power_kW: number;
  battery_soc_kWh: number;
  dhw_power_kW: number;
  dhw_temp_C: number;
  gridImport_kW: number;
  gridExport_kW: number;
  pvUsedOnSite_kW: number;
  decision_reason: string;
}

export interface SimulationTrace {
  dt_s: number;
  steps: SimulationTraceStep[];
}

export interface SimulationResult {
  dt_s: number;
  steps: SimulationStep[];
  flows: StepFlows[];
  totals: {
    pvProduction_kWh: number;
    consumption_kWh: number;
    gridImport_kWh: number;
    gridExport_kWh: number;
    batteryDelta_kWh: number;
    ecsRescue_kWh: number;
    ecsEnergy_kWh: number;
    poolEnergy_kWh: number;
    evEnergy_kWh: number;
    ecsDeficit_K: number;
    ecsPenalty_EUR: number;
  };
  kpis: SimulationKPIs;
  trace: SimulationTrace;
}

export interface SimulationInput {
  dt_s: number;
  pvSeries_kW: readonly number[];
  baseLoadSeries_kW: readonly number[];
  devices: readonly Device[];
  strategy: Strategy;
  strategyId?: StrategyId; // LOT 3: Added to support getAllocationOrder()
  ambientTemp_C?: number;
  importPrices_EUR_per_kWh?: readonly number[];
  exportPrices_EUR_per_kWh?: readonly number[];
  ecsService?: Partial<EcsServiceContract>;
  debugTrace?: boolean;
}

const energyFromPowerSeries = (series: readonly number[], dt_s: number): number => {
  let sum = 0;
  for (const value of series) {
    sum += value;
  }
  return (sum * dt_s) / 3600;
};

const fillPriceSeries = (values: readonly number[] | undefined, steps: number): number[] => {
  const series = new Array<number>(steps);
  let lastValue = 0;
  if (values && values.length > 0) {
    lastValue = Number.isFinite(values[0]) ? Number(values[0]) : 0;
  }
  for (let index = 0; index < steps; index += 1) {
    if (values && values[index] !== undefined) {
      const current = Number(values[index]);
      if (Number.isFinite(current)) {
        lastValue = current;
      }
    }
    series[index] = lastValue;
  }
  return series;
};

const getStateNumber = (
  state: Record<string, number | boolean> | undefined,
  key: string
): number | undefined => {
  if (!state) {
    return undefined;
  }
  const value = state[key];
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }
  return undefined;
};

interface DecisionReasonInputs {
  surplusBeforeStrategy_kW: number;
  deficitBeforeStrategy_kW: number;
  battery_power_kW: number;
  dhw_power_kW: number;
  gridImport_kW: number;
  gridExport_kW: number;
  preheatForced: boolean;
  deadlineForcePower_kW: number;
}

const EPSILON = 1e-6;
const POWER_EPSILON = 0.05;

const inferDecisionReason = (inputs: DecisionReasonInputs): string => {
  if (inputs.deadlineForcePower_kW > POWER_EPSILON) {
    return 'ecs_deadline_force';
  }
  if (inputs.preheatForced) {
    return 'ecs_preheat';
  }
  if (inputs.battery_power_kW > POWER_EPSILON && inputs.surplusBeforeStrategy_kW > EPSILON) {
    return 'batt_charge';
  }
  if (inputs.battery_power_kW < -POWER_EPSILON && inputs.deficitBeforeStrategy_kW > EPSILON) {
    return 'batt_discharge';
  }
  if (inputs.gridExport_kW > POWER_EPSILON && inputs.surplusBeforeStrategy_kW > EPSILON) {
    return 'export_surplus';
  }
  if (inputs.gridImport_kW > POWER_EPSILON && inputs.deficitBeforeStrategy_kW > EPSILON) {
    return 'grid_import';
  }
  return 'idle';
};

/**
 * Computes energy flows using priority-based allocation.
 *
 * This function replaces the fixed waterfall with configurable priority allocation.
 * It uses allocateByPriority() to determine how available power is distributed.
 *
 * @param available_kW - Available power to allocate (PV surplus or battery discharge)
 * @param demands - Power demands from each device type
 * @param order - Priority order for allocation (will come from strategy in LOT 3)
 * @returns Object with individual flow values (e.g., pv_to_ecs_kW, batt_to_load_kW)
 */
interface FlowDemands {
  baseload: number;
  heating: number;
  pool: number;
  ev: number;
  ecs: number;
  battery: number;
}

interface AllocatedFlows {
  to_baseload_kW: number;
  to_heating_kW: number;
  to_pool_kW: number;
  to_ev_kW: number;
  to_ecs_kW: number;
  to_battery_kW: number;
  to_grid_kW: number;
}

function computeFlowsWithPriority(
  available_kW: number,
  demands: FlowDemands,
  order: Array<keyof FlowDemands>
): AllocatedFlows {
  // Convert demands to PowerDemand format
  const powerDemands: PowerDemand[] = order.map(deviceType => ({
    id: deviceType,
    demand_kW: demands[deviceType]
  }));

  // Allocate using priority order
  const allocations = allocateByPriority(available_kW, powerDemands, order);
  const allocationMap = allocationsToMap(allocations);

  // Build flows object
  const flows: AllocatedFlows = {
    to_baseload_kW: allocationMap.get('baseload') ?? 0,
    to_heating_kW: allocationMap.get('heating') ?? 0,
    to_pool_kW: allocationMap.get('pool') ?? 0,
    to_ev_kW: allocationMap.get('ev') ?? 0,
    to_ecs_kW: allocationMap.get('ecs') ?? 0,
    to_battery_kW: allocationMap.get('battery') ?? 0,
    to_grid_kW: 0
  };

  // Calculate surplus going to grid (what wasn't allocated)
  const totalAllocated = Object.values(flows).reduce((sum, val) => sum + val, 0);
  flows.to_grid_kW = Math.max(0, available_kW - totalAllocated);

  return flows;
}

export const runSimulation = (input: SimulationInput): SimulationResult => {
  const { dt_s, pvSeries_kW, baseLoadSeries_kW } = input;
  if (pvSeries_kW.length !== baseLoadSeries_kW.length) {
    throw new Error('Les séries PV et consommation doivent avoir la même longueur.');
  }
  const stepsCount = pvSeries_kW.length;
  const ambientTemp = input.ambientTemp_C ?? 20;
  const importPriceSeries = fillPriceSeries(input.importPrices_EUR_per_kWh, stepsCount);
  const exportPriceSeries = fillPriceSeries(input.exportPrices_EUR_per_kWh, stepsCount);

  const batteries = input.devices.filter((device): device is Battery => device instanceof Battery);
  const dhwTanks = input.devices.filter((device): device is DHWTank => device instanceof DHWTank);
  const heatingSystems = input.devices.filter((device): device is Heating => device instanceof Heating);
  const poolPumps = input.devices.filter((device): device is PoolPump => device instanceof PoolPump);
  const evChargers = input.devices.filter((device): device is EVCharger => device instanceof EVCharger);

  const baseServiceContract = defaultEcsServiceContract();
  let ecsService: EcsServiceContract = mergeEcsServiceContract(
    baseServiceContract,
    input.ecsService
  );
  ecsService = resolveTargetTemperature(ecsService, dhwTanks[0]);

  const batteryCapacity = batteries.reduce((acc, battery) => acc + battery.usableCapacity_kWh, 0);
  const batterySoc = new Map<string, number>(
    batteries.map((battery) => [battery.id, battery.soc_kWhValue])
  );

  // LOT 3: Get allocation order from strategy
  // If strategyId is provided, use it to get the order
  // Otherwise, use default historical order (for backward compatibility)
  const allocationOrder: DeviceType[] = input.strategyId
    ? getAllocationOrder(input.strategyId)
    : ['baseload', 'heating', 'pool', 'ev', 'ecs', 'battery'];

  const steps: SimulationStep[] = [];
  const traceSteps: SimulationTraceStep[] = [];
  const deviceConsumptionSeries: number[] = [];
  const pvUsedSeries: number[] = [];
  const gridImportSeries: number[] = [];
  const gridExportSeries: number[] = [];
  const batteryDeltaSeries: number[] = [];
  const batteryDischargeSeries: number[] = [];
  const ecsTempSeries: number[] = [];
  const flowsSeries: StepFlows[] = [];

  let heatingComfortSamples = 0;
  let heatingComfortSatisfied = 0;
  let poolRuntimeSeconds = 0;
  const evSessionTracking = new Map<string, { counted: boolean; required: number }>();

  const devicesById = new Map(input.devices.map((device) => [device.id, device]));
  const envCtx: EnvContext = {
    pv_kW: 0,
    baseLoad_kW: 0,
    ambientTemp_C: ambientTemp
  };

  const rescueEnergyPerTank_kWh = new Map<string, number>();
  const ecsHelperState = createEcsHelperState();

  const stepsPerDay = dt_s > 0 ? Math.max(1, Math.round(86400 / dt_s)) : 1;
  const resolveDeadlineStep = (): number | null => {
    if (ecsService.mode !== 'force') {
      return null;
    }
    const deadlineSeconds = Math.max(0, ecsService.deadlineHour) * 3600;
    if (dt_s <= 0) {
      return 0;
    }
    const rawIndex = Math.round(deadlineSeconds / dt_s);
    const clamped = Math.max(0, Math.min(rawIndex, stepsPerDay - 1));
    return clamped;
  };
  const deadlineStepWithinDay = resolveDeadlineStep();

  for (let index = 0; index < stepsCount; index += 1) {
    const pv_kW = pvSeries_kW[index];
    const baseLoad_kW = baseLoadSeries_kW[index];
    const time_s = index * dt_s;
    const stepWithinDay = index % stepsPerDay;
    const isDeadlineWindow =
      ecsService.mode === 'force' && deadlineStepWithinDay !== null && stepWithinDay >= deadlineStepWithinDay;
    envCtx.pv_kW = pv_kW;
    envCtx.baseLoad_kW = baseLoad_kW;
    envCtx.time_s = time_s;
    envCtx.priceImport_EUR_per_kWh = importPriceSeries[index];
    envCtx.priceExport_EUR_per_kWh = exportPriceSeries[index];

    const plans = input.devices.map((device) => ({ device, plan: device.plan(dt_s, envCtx) }));

    let requests: StrategyRequest[] = plans
      .filter((entry) => entry.plan.request)
      .map((entry) => ({
        device: entry.device,
        request: entry.plan.request!,
        state: entry.device.state()
      }));

    const offers = plans.filter((entry) => entry.plan.offer);

    let surplus_kW = Math.max(pv_kW - baseLoad_kW, 0);
    let deficit_kW = Math.max(baseLoad_kW - pv_kW, 0);
    const baselineSurplus_kW = surplus_kW;
    const baselineDeficit_kW = deficit_kW;

    const devicePower = new Map<string, number>();

    const processedRequests = processEcsRequests(
      {
        requests,
        contract: ecsService,
        dt_s,
        time_s,
        surplus_kW
      },
      ecsHelperState
    );

    let forcedPreheatPower_kW = 0;
    for (const forced of processedRequests.forcedAllocations) {
      forced.device.apply(forced.power_kW, dt_s, envCtx);
      devicePower.set(
        forced.device.id,
        (devicePower.get(forced.device.id) ?? 0) + forced.power_kW
      );
      forcedPreheatPower_kW += forced.power_kW;
    }

    const rawSurplusBeforeStrategy_kW = processedRequests.remainingSurplus_kW;
    const rawDeficitBeforeStrategy_kW = deficit_kW;
    const forcedDeadlinePreheat = processedRequests.forcedAllocations.length > 0;

    surplus_kW = processedRequests.remainingSurplus_kW;
    requests = processedRequests.requests;

    const strategyContext: StrategyContext = {
      surplus_kW,
      requests,
      time_s,
      dt_s
    };
    const allocations = input.strategy(strategyContext);

    const requestMap = new Map(requests.map((req) => [req.device.id, req]));

    for (const allocation of allocations) {
      const request = requestMap.get(allocation.deviceId);
      if (!request || surplus_kW <= 0) {
        continue;
      }
      const desiredPower = Math.max(allocation.power_kW, 0);
      if (desiredPower <= 0) {
        continue;
      }
      const power = Math.min(request.request.maxAccept_kW, desiredPower, surplus_kW);
      if (power <= 0) {
        continue;
      }
      request.device.apply(power, dt_s, envCtx);
      devicePower.set(request.device.id, (devicePower.get(request.device.id) ?? 0) + power);
      surplus_kW -= power;
    }

    let deadlineForcePower_kW = 0;
    if (isDeadlineWindow) {
      for (const tank of dhwTanks) {
        const ambientForTank = envCtx.ambientTemp_C;
        const requiredPower = tank.powerToReachTarget(dt_s, ambientForTank);
        if (requiredPower <= 0) {
          continue;
        }
        const power = Math.min(requiredPower, tank.maxPower_kW);
        if (power <= 0) {
          continue;
        }
        tank.apply(power, dt_s, envCtx);
        devicePower.set(tank.id, (devicePower.get(tank.id) ?? 0) + power);
        const coveredBySurplus = Math.min(surplus_kW, power);
        if (coveredBySurplus > 0) {
          surplus_kW -= coveredBySurplus;
        }
        const remainder = power - coveredBySurplus;
        if (remainder > 0) {
          deficit_kW += remainder;
        }
        deadlineForcePower_kW += power;
      }
    }

    const sortedOffers = offers
      .map((entry) => ({
        device: entry.device,
        offer: entry.plan.offer!,
        state: entry.device.state()
      }))
      .sort((a, b) => (a.offer.costPenalty ?? 0) - (b.offer.costPenalty ?? 0));

    for (const offer of sortedOffers) {
      if (deficit_kW <= 0) {
        break;
      }
      const power = Math.min(offer.offer.maxSupply_kW, deficit_kW);
      if (power <= 0) {
        continue;
      }
      offer.device.apply(-power, dt_s, envCtx);
      devicePower.set(offer.device.id, (devicePower.get(offer.device.id) ?? 0) - power);
      deficit_kW -= power;
    }

    const deviceStates: SimulationStepDevice[] = input.devices.map((device) => ({
      id: device.id,
      label: device.label,
      power_kW: devicePower.get(device.id) ?? 0,
      state: device.state()
    }));

    const deviceStateMap = new Map<string, Record<string, number | boolean>>(
      deviceStates.map((entry) => [entry.id, entry.state])
    );

    for (const deviceState of deviceStates) {
      if (!('heating_power_kW' in deviceState.state)) {
        continue;
      }
      const state = deviceStateMap.get(deviceState.id);
      if (!state) {
        continue;
      }
      const temp = getStateNumber(state, 'temp_C');
      const target = getStateNumber(state, 'target_C');
      const comfortLower = getStateNumber(state, 'comfort_lower_bound_C');
      const lowerBound = comfortLower ?? (target !== undefined ? target - 0.5 : undefined);
      if (temp !== undefined && lowerBound !== undefined) {
        heatingComfortSamples += 1;
        if (temp >= lowerBound - 1e-6) {
          heatingComfortSatisfied += 1;
        }
      }
    }

    for (const pump of poolPumps) {
      const delivered = Math.max(devicePower.get(pump.id) ?? 0, 0);
      const rated = pump.ratedPower_kW;
      if (rated > 0 && delivered > 0) {
        const runFraction = Math.min(delivered / rated, 1);
        poolRuntimeSeconds += dt_s * runFraction;
      }
    }

    for (const charger of evChargers) {
      const state = deviceStateMap.get(charger.id);
      if (!state) {
        continue;
      }
      const active = Boolean(state.session_active);
      const energyNeed =
        getStateNumber(state, 'session_energy_need_kWh') ?? charger.sessionEnergyNeed_kWh;
      const remaining = getStateNumber(state, 'energy_remaining_kWh') ?? 0;
      const tracker = evSessionTracking.get(charger.id) ?? { counted: false, required: 0 };
      if (active && !tracker.counted && energyNeed > 0) {
        tracker.required += energyNeed;
        tracker.counted = true;
      }
      if (!active && remaining <= 1e-3) {
        tracker.counted = false;
      }
      evSessionTracking.set(charger.id, tracker);
    }

    const deviceConsumption_kW = sumPositive(devicePower.values());
    const batteryCharge_kW_raw = batteries.reduce((acc, battery) => {
      const power = devicePower.get(battery.id) ?? 0;
      return acc + Math.max(power, 0);
    }, 0);
    const batteryDischarge_kW_raw = batteries.reduce((acc, battery) => {
      const power = devicePower.get(battery.id) ?? 0;
      return acc + Math.max(-power, 0);
    }, 0);
    const batteryCharge_kW = batteryCharge_kW_raw > POWER_EPSILON ? batteryCharge_kW_raw : 0;
    const batteryDischarge_kW = batteryDischarge_kW_raw > POWER_EPSILON ? batteryDischarge_kW_raw : 0;
    batteryDischargeSeries.push(batteryDischarge_kW_raw);
    const ecsConsumption_kW = dhwTanks.reduce((acc, tank) => {
      const power = devicePower.get(tank.id) ?? 0;
      return acc + Math.max(power, 0);
    }, 0);
    const heatingConsumption_kW = heatingSystems.reduce((acc, system) => {
      const power = devicePower.get(system.id) ?? 0;
      return acc + Math.max(power, 0);
    }, 0);
    const poolConsumption_kW = poolPumps.reduce((acc, pump) => {
      const power = devicePower.get(pump.id) ?? 0;
      return acc + Math.max(power, 0);
    }, 0);
    const evConsumption_kW = evChargers.reduce((acc, charger) => {
      const power = devicePower.get(charger.id) ?? 0;
      return acc + Math.max(power, 0);
    }, 0);

    // LOT 3: Use getAllocationOrder() to get priority order from strategy
    // Order now depends on strategyId (e.g., 'ecs_first' vs 'battery_first')
    const pvFlows = computeFlowsWithPriority(
      pv_kW,
      {
        baseload: baseLoad_kW,
        heating: heatingConsumption_kW,
        pool: poolConsumption_kW,
        ev: evConsumption_kW,
        ecs: ecsConsumption_kW,
        battery: batteryCharge_kW
      },
      allocationOrder
    );

    const pvToLoad_kW = pvFlows.to_baseload_kW;
    const pvToHeat_kW = pvFlows.to_heating_kW;
    const pvToPool_kW = pvFlows.to_pool_kW;
    const pvToEv_kW = pvFlows.to_ev_kW;
    const pvToEcs_kW = pvFlows.to_ecs_kW;
    const pvToBatt_kW = pvFlows.to_battery_kW;
    const pvToGrid_kW = pvFlows.to_grid_kW;

    const loadDeficitAfterPV_kW = Math.max(baseLoad_kW - pvToLoad_kW, 0);
    const heatingDeficitAfterPV_kW = Math.max(heatingConsumption_kW - pvToHeat_kW, 0);
    const poolDeficitAfterPV_kW = Math.max(poolConsumption_kW - pvToPool_kW, 0);
    const evDeficitAfterPV_kW = Math.max(evConsumption_kW - pvToEv_kW, 0);
    const ecsDeficitAfterPV_kW = Math.max(ecsConsumption_kW - pvToEcs_kW, 0);

    // LOT 3: Use allocationOrder for battery discharge (without 'battery' itself)
    // Filter out 'battery' from order since battery can't discharge to itself
    const batteryDischargeOrder = allocationOrder.filter(d => d !== 'battery');
    const battFlows = computeFlowsWithPriority(
      batteryDischarge_kW,
      {
        baseload: loadDeficitAfterPV_kW,
        heating: heatingDeficitAfterPV_kW,
        pool: poolDeficitAfterPV_kW,
        ev: evDeficitAfterPV_kW,
        ecs: ecsDeficitAfterPV_kW,
        battery: 0 // Battery doesn't discharge to itself
      },
      batteryDischargeOrder
    );

    const battToLoad_kW = battFlows.to_baseload_kW;
    const battToHeat_kW = battFlows.to_heating_kW;
    const battToPool_kW = battFlows.to_pool_kW;
    const battToEv_kW = battFlows.to_ev_kW;
    const battToEcs_kW = battFlows.to_ecs_kW;

    const loadDeficitAfterBattery_kW = Math.max(loadDeficitAfterPV_kW - battToLoad_kW, 0);
    const heatingDeficitAfterBattery_kW = Math.max(heatingDeficitAfterPV_kW - battToHeat_kW, 0);
    const poolDeficitAfterBattery_kW = Math.max(poolDeficitAfterPV_kW - battToPool_kW, 0);
    const evDeficitAfterBattery_kW = Math.max(evDeficitAfterPV_kW - battToEv_kW, 0);
    const ecsDeficitAfterBattery_kW = Math.max(ecsDeficitAfterPV_kW - battToEcs_kW, 0);

    const gridToLoad_kW = loadDeficitAfterBattery_kW;
    const gridToHeat_kW = heatingDeficitAfterBattery_kW;
    const gridToPool_kW = poolDeficitAfterBattery_kW;
    const gridToEv_kW = evDeficitAfterBattery_kW;
    const gridToEcs_kW = ecsDeficitAfterBattery_kW;

    const gridImport_kW =
      gridToLoad_kW + gridToHeat_kW + gridToPool_kW + gridToEv_kW + gridToEcs_kW;
    const gridExport_kW = pvToGrid_kW;

    // PV utilisé localement (non exporté) = PV total - Export
    // Inclut : PV direct vers charges + PV stocké en batterie + PV vers tous appareils pilotés
    // Cette valeur est utilisée pour calculer l'autoconsommation (AC = pvUsed / pvTotal)
    const pvUsed = pv_kW - gridExport_kW;

    for (const device of input.devices) {
      if (!devicePower.has(device.id)) {
        device.apply(0, dt_s, envCtx);
        devicePower.set(device.id, 0);
      }
    }

    let batteryDelta_kWh = 0;
    for (const battery of batteries) {
      const before = batterySoc.get(battery.id) ?? battery.soc_kWhValue;
      const after = battery.soc_kWhValue;
      batteryDelta_kWh += after - before;
      batterySoc.set(battery.id, after);
    }

    if (dhwTanks.length > 0) {
      const avgTemp = dhwTanks.reduce((acc, tank) => acc + tank.temperature, 0) / dhwTanks.length;
      ecsTempSeries.push(avgTemp);
    }

    deviceConsumptionSeries.push(deviceConsumption_kW);
    pvUsedSeries.push(pvUsed);
    gridImportSeries.push(gridImport_kW);
    gridExportSeries.push(gridExport_kW);
    batteryDeltaSeries.push(batteryDelta_kWh);
    flowsSeries.push({
      pv_to_load_kW: pvToLoad_kW,
      pv_to_ecs_kW: pvToEcs_kW,
      pv_to_heat_kW: pvToHeat_kW,
      pv_to_pool_kW: pvToPool_kW,
      pv_to_ev_kW: pvToEv_kW,
      pv_to_batt_kW: pvToBatt_kW,
      pv_to_grid_kW: pvToGrid_kW,
      batt_to_load_kW: battToLoad_kW,
      batt_to_ecs_kW: battToEcs_kW,
      batt_to_heat_kW: battToHeat_kW,
      batt_to_pool_kW: battToPool_kW,
      batt_to_ev_kW: battToEv_kW,
      grid_to_load_kW: gridToLoad_kW,
      grid_to_ecs_kW: gridToEcs_kW,
      grid_to_heat_kW: gridToHeat_kW,
      grid_to_pool_kW: gridToPool_kW,
      grid_to_ev_kW: gridToEv_kW
    });

    const recordedSurplusBeforeStrategy_kW = input.debugTrace
      ? rawSurplusBeforeStrategy_kW
      : baselineSurplus_kW;
    const recordedDeficitBeforeStrategy_kW = input.debugTrace
      ? rawDeficitBeforeStrategy_kW
      : baselineDeficit_kW;

    const batteryNetPower_kW = batteries.reduce((acc, battery) => {
      return acc + (devicePower.get(battery.id) ?? 0);
    }, 0);
    const batterySoc_kWh = batteries.reduce((acc, battery) => {
      const state = deviceStateMap.get(battery.id);
      const soc = getStateNumber(state, 'soc_kWh');
      if (typeof soc === 'number') {
        return acc + soc;
      }
      return acc + battery.soc_kWhValue;
    }, 0);
    const dhwPower_kW = dhwTanks.reduce((acc, tank) => {
      return acc + Math.max(devicePower.get(tank.id) ?? 0, 0);
    }, 0);
    const dhwTemp_C = dhwTanks.length
      ? dhwTanks.reduce((acc, tank) => {
          const state = deviceStateMap.get(tank.id);
          const temp = getStateNumber(state, 'temp_C');
          if (typeof temp === 'number') {
            return acc + temp;
          }
          return acc + tank.temperature;
        }, 0) / dhwTanks.length
      : 0;

    const decision_reason = inferDecisionReason({
      surplusBeforeStrategy_kW: recordedSurplusBeforeStrategy_kW,
      deficitBeforeStrategy_kW: recordedDeficitBeforeStrategy_kW,
      battery_power_kW: batteryNetPower_kW,
      dhw_power_kW: dhwPower_kW,
      gridImport_kW,
      gridExport_kW,
      preheatForced: forcedDeadlinePreheat,
      deadlineForcePower_kW
    });

    traceSteps.push({
      time_s,
      pv_kW,
      baseLoad_kW,
      surplusBeforeStrategy_kW: recordedSurplusBeforeStrategy_kW,
      deficitBeforeStrategy_kW: recordedDeficitBeforeStrategy_kW,
      battery_power_kW: batteryNetPower_kW,
      battery_soc_kWh: batterySoc_kWh,
      dhw_power_kW: dhwPower_kW,
      dhw_temp_C: dhwTemp_C,
      gridImport_kW,
      gridExport_kW,
      pvUsedOnSite_kW: pvUsed,
      decision_reason
    });

    steps.push({
      time_s,
      pv_kW,
      baseLoad_kW,
      pvUsedOnSite_kW: pvUsed,
      gridImport_kW,
      gridExport_kW,
      deviceStates
    });
  }

  if (dhwTanks.length === 0) {
    ecsTempSeries.length = 0;
  }

  let ecsRescue_kWh = 0;
  if (dhwTanks.length > 0 && ecsService.mode === 'force') {
    for (const tank of dhwTanks) {
      const deficit_K = tank.targetTemp - tank.temperature;
      if (deficit_K > 1e-6) {
        const rescue_Wh = deficit_K * tank.volume_L * WATER_HEAT_CAPACITY_WH_PER_L_PER_K;
        const rescue_kWh = rescue_Wh / 1000;
        if (rescue_kWh > 0) {
          rescueEnergyPerTank_kWh.set(tank.id, rescue_kWh);
          ecsRescue_kWh += rescue_kWh;
          tank.enforceTargetTemperature();
        }
      }
    }

    if (ecsRescue_kWh > 0 && steps.length > 0) {
      const rescuePower_kW = (ecsRescue_kWh * 3600) / dt_s;
      const lastIndex = steps.length - 1;

      deviceConsumptionSeries[lastIndex] += rescuePower_kW;
      gridImportSeries[lastIndex] += rescuePower_kW;
      steps[lastIndex] = {
        ...steps[lastIndex],
        gridImport_kW: steps[lastIndex].gridImport_kW + rescuePower_kW,
        deviceStates: steps[lastIndex].deviceStates.map((deviceState) => {
          const rescueForDevice_kWh = rescueEnergyPerTank_kWh.get(deviceState.id) ?? 0;
          const rescueForDevice_kW = (rescueForDevice_kWh * 3600) / dt_s;
          const device = devicesById.get(deviceState.id);
          return {
            ...deviceState,
            power_kW: deviceState.power_kW + rescueForDevice_kW,
            state: device ? device.state() : deviceState.state
          };
        })
      };

      flowsSeries[lastIndex] = {
        ...flowsSeries[lastIndex],
        grid_to_ecs_kW: flowsSeries[lastIndex].grid_to_ecs_kW + rescuePower_kW
      };

      const updatedAvgTemp =
        dhwTanks.reduce((acc, tank) => acc + tank.temperature, 0) / dhwTanks.length;
      if (ecsTempSeries.length > 0) {
        ecsTempSeries[ecsTempSeries.length - 1] = updatedAvgTemp;
      }
    }
  }


  let ecsDeficit_K = 0;
  let ecsPenalty_EUR = 0;
  if (ecsTempSeries.length > 0) {
    const deadlineStep = Math.floor((ecsService.deadlineHour * 3600) / dt_s);
    const index = Math.min(Math.max(deadlineStep, 0), ecsTempSeries.length - 1);
    const observedTemp = ecsTempSeries[index];
    ecsDeficit_K = Math.max(0, ecsService.targetCelsius - observedTemp);
    if (ecsService.mode === 'force') {
      ecsDeficit_K = 0;
    } else if (ecsService.mode === 'penalize') {
      const rate = ecsService.penaltyPerKelvin ?? 0;
      ecsPenalty_EUR = ecsDeficit_K * rate;
    }
  }

  let batteryDelta_kWh = 0;
  for (const delta of batteryDeltaSeries) {
    batteryDelta_kWh += delta;
  }

  const simulationDuration_s = stepsCount * dt_s;
  const simulationDays = simulationDuration_s > 0 ? simulationDuration_s / 86400 : 0;
  const poolTargetSeconds = poolPumps.reduce((acc, pump) => {
    if (simulationDays <= 0) {
      return acc;
    }
    return acc + pump.minHoursPerDay * simulationDays * 3600;
  }, 0);
  const heatingComfortRatio =
    heatingComfortSamples > 0 ? heatingComfortSatisfied / heatingComfortSamples : null;
  const evRequiredEnergy_kWh = Array.from(evSessionTracking.values()).reduce(
    (acc, entry) => acc + entry.required,
    0
  );

  const kpiInput: KPIInput = {
    dt_s,
    pvSeries_kW,
    baseLoadSeries_kW,
    deviceConsumptionSeries_kW: deviceConsumptionSeries,
    pvUsedOnSiteSeries_kW: pvUsedSeries,
    batteryDelta_kWh: batteryDeltaSeries,
    batteryCapacity_kWh: batteryCapacity,
    ecsTempSeries_C: ecsTempSeries,
    ecsTargetTemp_C: ecsService.targetCelsius ?? 0,
    flows: flowsSeries,
    importPrices_EUR_per_kWh: importPriceSeries,
    exportPrices_EUR_per_kWh: exportPriceSeries
  };

  const baseKpis: SimulationKPIsCore = computeKPIs(kpiInput);
  const consumption_kWh =
    baseKpis.audit.load_total_kWh + baseKpis.audit.battery_losses_kWh;
  const net_cost_with_penalties = baseKpis.euros.net_cost + ecsPenalty_EUR;

  const totals = {
    pvProduction_kWh: energyFromPowerSeries(pvSeries_kW, dt_s),
    consumption_kWh,
    gridImport_kWh: energyFromPowerSeries(gridImportSeries, dt_s),
    gridExport_kWh: energyFromPowerSeries(gridExportSeries, dt_s),
    batteryDelta_kWh,
    ecsRescue_kWh,
    ecsEnergy_kWh: flowsSeries.reduce((acc, flow) => {
      return (
        acc +
        ((flow.pv_to_ecs_kW + flow.batt_to_ecs_kW + flow.grid_to_ecs_kW) * dt_s) / 3600
      );
    }, 0),
    poolEnergy_kWh: flowsSeries.reduce((acc, flow) => {
      return (
        acc +
        ((flow.pv_to_pool_kW + flow.batt_to_pool_kW + flow.grid_to_pool_kW) * dt_s) / 3600
      );
    }, 0),
    evEnergy_kWh: flowsSeries.reduce((acc, flow) => {
      return (
        acc + ((flow.pv_to_ev_kW + flow.batt_to_ev_kW + flow.grid_to_ev_kW) * dt_s) / 3600
      );
    }, 0),
    ecsDeficit_K,
    ecsPenalty_EUR
  };

  let poolCompletion: number | null = null;
  if (poolPumps.length > 0) {
    if (poolTargetSeconds > 0) {
      poolCompletion = Math.max(0, Math.min(poolRuntimeSeconds / poolTargetSeconds, 1));
    } else {
      poolCompletion = 0;
    }
  }

  let evCompletion: number | null = null;
  if (evChargers.length > 0) {
    if (evRequiredEnergy_kWh > 0) {
      const ratio = totals.evEnergy_kWh / evRequiredEnergy_kWh;
      evCompletion = Math.max(0, Math.min(ratio, 1));
    } else {
      evCompletion = 0;
    }
  }

  const hasDeadlineEvaluation = ecsTempSeries.length > 0;
  const ecsHitRate = hasDeadlineEvaluation ? (ecsDeficit_K <= 1e-6 ? 1 : 0) : 0;
  const ecsAvgDeficit = hasDeadlineEvaluation ? ecsDeficit_K : 0;
  const ecsPenaltiesTotal = ecsPenalty_EUR;

  const kpis: SimulationKPIs = {
    ...baseKpis,
    euros: { ...baseKpis.euros, net_cost_with_penalties },
    ecs_rescue_used: ecsRescue_kWh > 0,
    ecs_rescue_kWh: ecsRescue_kWh,
    ecs_deficit_K: ecsDeficit_K,
    ecs_penalty_EUR: ecsPenalty_EUR,
    ecs_hit_rate: ecsHitRate,
    ecs_avg_deficit_K: ecsAvgDeficit,
    ecs_penalties_total_EUR: ecsPenaltiesTotal,
    net_cost_with_penalties,
    heating_comfort_ratio: heatingComfortRatio,
    pool_filtration_completion: poolCompletion,
    ev_charge_completion: evCompletion
  };

  return {
    dt_s,
    steps,
    flows: flowsSeries,
    totals,
    kpis,
    trace: {
      dt_s,
      steps: traceSteps
    }
  };
};

