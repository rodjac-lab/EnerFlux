import type { FlowSummaryKW, FlowSummaryKWh, StepFlows } from '../data/types';

export interface KPIInput {
  dt_s: number;
  pvSeries_kW: readonly number[];
  baseLoadSeries_kW: readonly number[];
  deviceConsumptionSeries_kW: readonly number[];
  pvUsedOnSiteSeries_kW: readonly number[];
  batteryDelta_kWh: readonly number[];
  batteryCapacity_kWh: number;
  ecsTempSeries_C: readonly number[];
  ecsTargetTemp_C: number;
}

export interface SimulationKPIs {
  selfConsumption: number;
  selfProduction: number;
  batteryCycles: number;
  ecsTargetUptime: number;
}

const energyFromPowerSeries = (power_kW: readonly number[], dt_s: number): number => {
  let sum = 0;
  for (const value of power_kW) {
    sum += value;
  }
  return (sum * dt_s) / 3600;
};

export const selfConsumption = (input: KPIInput): number => {
  const loadOnSite_kWh = energyFromPowerSeries(
    input.baseLoadSeries_kW.map((value, idx) => value + input.deviceConsumptionSeries_kW[idx]),
    input.dt_s
  );
  if (loadOnSite_kWh <= 0) {
    return 0;
  }
  const pvUsed_kWh = energyFromPowerSeries(input.pvUsedOnSiteSeries_kW, input.dt_s);
  return pvUsed_kWh / loadOnSite_kWh;
};

export const selfProduction = (input: KPIInput): number => {
  const totalPV_kWh = energyFromPowerSeries(input.pvSeries_kW, input.dt_s);
  if (totalPV_kWh <= 0) {
    return 0;
  }
  const pvUsed_kWh = energyFromPowerSeries(input.pvUsedOnSiteSeries_kW, input.dt_s);
  return pvUsed_kWh / totalPV_kWh;
};

export const batteryCyclesProxy = (input: KPIInput): number => {
  if (input.batteryCapacity_kWh <= 0) {
    return 0;
  }
  let sumAbs = 0;
  for (const delta of input.batteryDelta_kWh) {
    sumAbs += Math.abs(delta);
  }
  return sumAbs / (2 * input.batteryCapacity_kWh);
};

export const ecsTargetUptime = (input: KPIInput): number => {
  if (input.ecsTempSeries_C.length === 0) {
    return 0;
  }
  let count = 0;
  for (const temp of input.ecsTempSeries_C) {
    if (temp >= input.ecsTargetTemp_C) {
      count += 1;
    }
  }
  return count / input.ecsTempSeries_C.length;
};

export const computeKPIs = (input: KPIInput): SimulationKPIs => ({
  selfConsumption: selfConsumption(input),
  selfProduction: selfProduction(input),
  batteryCycles: batteryCyclesProxy(input),
  ecsTargetUptime: ecsTargetUptime(input)
});

export const summarizeFlows = (
  flows: StepFlows[],
  dt_s: number
): { avg_kW: FlowSummaryKW; total_kWh: FlowSummaryKWh } => {
  const keys: (keyof StepFlows)[] = [
    'pv_to_load_kW',
    'pv_to_ecs_kW',
    'pv_to_batt_kW',
    'pv_to_grid_kW',
    'batt_to_load_kW',
    'batt_to_ecs_kW',
    'grid_to_load_kW',
    'grid_to_ecs_kW'
  ];
  const avg: FlowSummaryKW = {
    pv_to_load_kW: 0,
    pv_to_ecs_kW: 0,
    pv_to_batt_kW: 0,
    pv_to_grid_kW: 0,
    batt_to_load_kW: 0,
    batt_to_ecs_kW: 0,
    grid_to_load_kW: 0,
    grid_to_ecs_kW: 0
  };
  const totals: FlowSummaryKWh = {
    pv_to_load_kW: 0,
    pv_to_ecs_kW: 0,
    pv_to_batt_kW: 0,
    pv_to_grid_kW: 0,
    batt_to_load_kW: 0,
    batt_to_ecs_kW: 0,
    grid_to_load_kW: 0,
    grid_to_ecs_kW: 0
  };

  if (flows.length === 0 || dt_s <= 0) {
    return { avg_kW: avg, total_kWh: totals };
  }

  for (const flow of flows) {
    for (const key of keys) {
      avg[key] += flow[key];
      totals[key] += (flow[key] * dt_s) / 3600;
    }
  }

  for (const key of keys) {
    avg[key] /= flows.length;
  }

  return { avg_kW: avg, total_kWh: totals };
};
