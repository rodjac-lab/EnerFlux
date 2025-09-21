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
  flows: readonly StepFlows[];
  importPrices_EUR_per_kWh: readonly number[];
  exportPrices_EUR_per_kWh: readonly number[];
}

export interface SimulationKPIsCore {
  selfConsumption: number;
  selfProduction: number;
  batteryCycles: number;
  ecsTargetUptime: number;
  euros: EuroKPIs;
}

export interface SimulationKPIs extends SimulationKPIsCore {
  ecs_rescue_used: boolean;
  ecs_rescue_kWh: number;
  ecs_deficit_K: number;
  ecs_penalty_EUR: number;
  net_cost_with_penalties: number;
}

export interface EuroKPIs {
  cost_import: number;
  revenue_export: number;
  net_cost: number;
  saved_vs_nopv: number;
  net_cost_with_penalties: number;
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

export const computeKPIs = (input: KPIInput): SimulationKPIsCore => ({
  selfConsumption: selfConsumption(input),
  selfProduction: selfProduction(input),
  batteryCycles: batteryCyclesProxy(input),
  ecsTargetUptime: ecsTargetUptime(input),
  euros: eurosFromFlows(
    input.flows,
    input.dt_s,
    Array.from(input.importPrices_EUR_per_kWh),
    Array.from(input.exportPrices_EUR_per_kWh)
  )
});

const priceAt = (series: readonly number[], index: number): number => {
  if (series.length === 0) {
    return 0;
  }
  if (index < series.length && Number.isFinite(series[index])) {
    return Number(series[index]);
  }
  return Number(series[series.length - 1]);
};

export function eurosFromFlows(
  flows: readonly StepFlows[],
  dt_s: number,
  importPrices: readonly number[],
  exportPrices: readonly number[]
): EuroKPIs {
  if (flows.length === 0 || dt_s <= 0) {
    return { cost_import: 0, revenue_export: 0, net_cost: 0, saved_vs_nopv: 0, net_cost_with_penalties: 0 };
  }
  const dt_h = dt_s / 3600;
  let cost_import = 0;
  let revenue_export = 0;
  let baseline_cost = 0;
  for (let index = 0; index < flows.length; index += 1) {
    const flow = flows[index];
    const importPrice = priceAt(importPrices, index);
    const exportPrice = priceAt(exportPrices, index);
    const gridImport_kWh = (flow.grid_to_load_kW + flow.grid_to_ecs_kW) * dt_h;
    const export_kWh = flow.pv_to_grid_kW * dt_h;
    cost_import += gridImport_kWh * importPrice;
    revenue_export += export_kWh * exportPrice;
    const baseLoadSupply_kW = flow.pv_to_load_kW + flow.batt_to_load_kW + flow.grid_to_load_kW;
    const ecsSupply_kW = flow.pv_to_ecs_kW + flow.batt_to_ecs_kW + flow.grid_to_ecs_kW;
    const totalConsumption_kW = baseLoadSupply_kW + ecsSupply_kW;
    baseline_cost += totalConsumption_kW * dt_h * importPrice;
  }
  const net_cost = cost_import - revenue_export;
  const saved_vs_nopv = baseline_cost - net_cost;
  return {
    cost_import,
    revenue_export,
    net_cost,
    saved_vs_nopv,
    net_cost_with_penalties: net_cost
  };
}

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
