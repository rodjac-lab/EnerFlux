import type { FlowSummaryKW, FlowSummaryKWh, StepFlows } from '../data/types';

const PV_COST_PER_KWP_EUR = 1150;
const PV_BALANCE_OF_SYSTEM_EUR = 1200;
const BATTERY_COST_PER_KWH_EUR = 480;
const BATTERY_BALANCE_EUR = 500;

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
  investmentOverride_EUR?: number;
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
  ecs_hit_rate: number;
  ecs_avg_deficit_K: number;
  ecs_penalties_total_EUR: number;
  net_cost_with_penalties: number;
}

export interface EuroKPIs {
  cost_import: number;
  revenue_export: number;
  net_cost: number;
  saved_vs_nopv: number;
  net_cost_with_penalties: number;
  grid_only_cost: number;
  delta_vs_grid_only: number;
  savings_rate: number;
  simple_payback_years: number | null;
  estimated_investment: number;
}

const estimateInvestmentFromSeries = (
  pvSeries_kW: readonly number[],
  batteryCapacity_kWh: number,
  override?: number
): number => {
  if (typeof override === 'number') {
    return Math.max(override, 0);
  }
  const peakPV_kW = pvSeries_kW.reduce((acc, value) => (value > acc ? value : acc), 0);
  const pvCost = peakPV_kW > 0 ? peakPV_kW * PV_COST_PER_KWP_EUR + PV_BALANCE_OF_SYSTEM_EUR : 0;
  const batteryCost =
    batteryCapacity_kWh > 0
      ? batteryCapacity_kWh * BATTERY_COST_PER_KWH_EUR + BATTERY_BALANCE_EUR
      : 0;
  return pvCost + batteryCost;
};

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
    Array.from(input.exportPrices_EUR_per_kWh),
    {
      investment_EUR: estimateInvestmentFromSeries(
        input.pvSeries_kW,
        input.batteryCapacity_kWh,
        input.investmentOverride_EUR
      ),
      horizon_s: input.pvSeries_kW.length * input.dt_s
    }
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

export interface EuroComputationOptions {
  investment_EUR?: number;
  horizon_s?: number;
}

export function eurosFromFlows(
  flows: readonly StepFlows[],
  dt_s: number,
  importPrices: readonly number[],
  exportPrices: readonly number[],
  options: EuroComputationOptions = {}
): EuroKPIs {
  const investment = Math.max(options.investment_EUR ?? 0, 0);
  if (flows.length === 0 || dt_s <= 0) {
    return {
      cost_import: 0,
      revenue_export: 0,
      net_cost: 0,
      saved_vs_nopv: 0,
      net_cost_with_penalties: 0,
      grid_only_cost: 0,
      delta_vs_grid_only: 0,
      savings_rate: 0,
      simple_payback_years: null,
      estimated_investment: investment
    };
  }
  const dt_h = dt_s / 3600;
  let cost_import = 0;
  let revenue_export = 0;
  let baseline_cost = 0;
  for (let index = 0; index < flows.length; index += 1) {
    const flow = flows[index];
    const importPrice = priceAt(importPrices, index);
    const exportPrice = priceAt(exportPrices, index);
    const gridImport_kWh =
      (flow.grid_to_load_kW +
        flow.grid_to_ecs_kW +
        flow.grid_to_heat_kW +
        flow.grid_to_pool_kW +
        flow.grid_to_ev_kW) *
      dt_h;
    const export_kWh = flow.pv_to_grid_kW * dt_h;
    cost_import += gridImport_kWh * importPrice;
    revenue_export += export_kWh * exportPrice;
    const baseLoadSupply_kW = flow.pv_to_load_kW + flow.batt_to_load_kW + flow.grid_to_load_kW;
    const ecsSupply_kW = flow.pv_to_ecs_kW + flow.batt_to_ecs_kW + flow.grid_to_ecs_kW;
    const heatingSupply_kW = flow.pv_to_heat_kW + flow.batt_to_heat_kW + flow.grid_to_heat_kW;
    const poolSupply_kW = flow.pv_to_pool_kW + flow.batt_to_pool_kW + flow.grid_to_pool_kW;
    const evSupply_kW = flow.pv_to_ev_kW + flow.batt_to_ev_kW + flow.grid_to_ev_kW;
    const totalConsumption_kW =
      baseLoadSupply_kW + ecsSupply_kW + heatingSupply_kW + poolSupply_kW + evSupply_kW;
    baseline_cost += totalConsumption_kW * dt_h * importPrice;
  }
  const net_cost = cost_import - revenue_export;
  const saved_vs_nopv = baseline_cost - net_cost;
  const grid_only_cost = baseline_cost;
  const delta_vs_grid_only = saved_vs_nopv;
  const savings_rate = grid_only_cost > 0 ? delta_vs_grid_only / grid_only_cost : 0;
  const horizon_s = options.horizon_s ?? flows.length * dt_s;
  const horizon_years = horizon_s > 0 ? horizon_s / (3600 * 24 * 365) : 0;
  const annualSavings = horizon_years > 0 ? delta_vs_grid_only / horizon_years : 0;
  const simple_payback_years =
    investment > 0 && annualSavings > 0 ? investment / annualSavings : null;
  return {
    cost_import,
    revenue_export,
    net_cost,
    saved_vs_nopv,
    net_cost_with_penalties: net_cost,
    grid_only_cost,
    delta_vs_grid_only,
    savings_rate,
    simple_payback_years,
    estimated_investment: investment
  };
}

export const summarizeFlows = (
  flows: StepFlows[],
  dt_s: number
): { avg_kW: FlowSummaryKW; total_kWh: FlowSummaryKWh } => {
  const keys: (keyof StepFlows)[] = [
    'pv_to_load_kW',
    'pv_to_ecs_kW',
    'pv_to_heat_kW',
    'pv_to_pool_kW',
    'pv_to_ev_kW',
    'pv_to_batt_kW',
    'pv_to_grid_kW',
    'batt_to_load_kW',
    'batt_to_ecs_kW',
    'batt_to_heat_kW',
    'batt_to_pool_kW',
    'batt_to_ev_kW',
    'grid_to_load_kW',
    'grid_to_ecs_kW',
    'grid_to_heat_kW',
    'grid_to_pool_kW',
    'grid_to_ev_kW'
  ];
  const avg: FlowSummaryKW = {
    pv_to_load_kW: 0,
    pv_to_ecs_kW: 0,
    pv_to_heat_kW: 0,
    pv_to_pool_kW: 0,
    pv_to_ev_kW: 0,
    pv_to_batt_kW: 0,
    pv_to_grid_kW: 0,
    batt_to_load_kW: 0,
    batt_to_ecs_kW: 0,
    batt_to_heat_kW: 0,
    batt_to_pool_kW: 0,
    batt_to_ev_kW: 0,
    grid_to_load_kW: 0,
    grid_to_ecs_kW: 0,
    grid_to_heat_kW: 0,
    grid_to_pool_kW: 0,
    grid_to_ev_kW: 0
  };
  const totals: FlowSummaryKWh = {
    pv_to_load_kW: 0,
    pv_to_ecs_kW: 0,
    pv_to_heat_kW: 0,
    pv_to_pool_kW: 0,
    pv_to_ev_kW: 0,
    pv_to_batt_kW: 0,
    pv_to_grid_kW: 0,
    batt_to_load_kW: 0,
    batt_to_ecs_kW: 0,
    batt_to_heat_kW: 0,
    batt_to_pool_kW: 0,
    batt_to_ev_kW: 0,
    grid_to_load_kW: 0,
    grid_to_ecs_kW: 0,
    grid_to_heat_kW: 0,
    grid_to_pool_kW: 0,
    grid_to_ev_kW: 0
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
