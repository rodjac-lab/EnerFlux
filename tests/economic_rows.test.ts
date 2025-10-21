import { describe, expect, it } from 'vitest';
import type { SimulationResult } from '../src/core/engine';
import { buildEconomicRows } from '../src/ui/compare/economicRows';

const baseTotals: SimulationResult['totals'] = {
  pvProduction_kWh: 0,
  consumption_kWh: 0,
  gridImport_kWh: 0,
  gridExport_kWh: 0,
  batteryDelta_kWh: 0,
  ecsRescue_kWh: 0,
  ecsEnergy_kWh: 0,
  poolEnergy_kWh: 0,
  evEnergy_kWh: 0,
  ecsDeficit_K: 0,
  ecsPenalty_EUR: 0
};

const baseEuros: SimulationResult['kpis']['euros'] = {
  cost_import: 0,
  revenue_export: 0,
  net_cost: 0,
  saved_vs_nopv: 0,
  net_cost_with_penalties: 0,
  grid_only_cost: 0,
  delta_vs_grid_only: 0,
  savings_rate: 0,
  simple_payback_years: null,
  estimated_investment: 0
};

const baseKpis = {
  selfConsumption: 0,
  selfProduction: 0,
  batteryCycles: 0,
  ecsTargetUptime: 0,
  euros: baseEuros,
  ecs_rescue_used: false,
  ecs_rescue_kWh: 0,
  ecs_deficit_K: 0,
  ecs_penalty_EUR: 0,
  ecs_hit_rate: 0,
  ecs_avg_deficit_K: 0,
  ecs_penalties_total_EUR: 0,
  net_cost_with_penalties: 0,
  heating_comfort_ratio: null,
  pool_filtration_completion: null,
  ev_charge_completion: null,
  audit: {
    pv_total_kWh: 0,
    pv_used_on_site_kWh: 0,
    load_total_kWh: 0,
    load_direct_from_pv_kWh: 0,
    ecs_from_pv_kWh: 0,
    battery_charge_from_pv_kWh: 0,
    battery_discharge_to_load_kWh: 0,
    battery_losses_kWh: 0,
    load_covered_by_pv_direct_kWh: 0,
    grid_export_kWh: 0
  }
} satisfies SimulationResult['kpis'];

const makeResult = (
  overrides: Partial<SimulationResult['kpis']> = {}
): SimulationResult => {
  const euros = { ...baseKpis.euros, ...overrides.euros };
  const netCostWithPenalties =
    overrides.net_cost_with_penalties ?? overrides.euros?.net_cost_with_penalties ?? euros.net_cost_with_penalties;
  return {
    dt_s: 900,
    steps: [],
    flows: [],
    totals: baseTotals,
    kpis: {
      ...baseKpis,
      ...overrides,
      euros,
      net_cost_with_penalties: netCostWithPenalties
    },
    trace: { dt_s: 900, steps: [] }
  };
};

describe('buildEconomicRows', () => {
  it('returns unique rows mapping each KPI once', () => {
    const resultA = makeResult({
      euros: {
        estimated_investment: 5400,
        cost_import: 3.2,
        revenue_export: 1.1,
        net_cost: 2.1,
        saved_vs_nopv: 0.5,
        net_cost_with_penalties: 2.4,
        grid_only_cost: 6.8,
        delta_vs_grid_only: 4.7,
        savings_rate: 0.69,
        simple_payback_years: 6.2
      },
      net_cost_with_penalties: 2.4
    });
    const resultB = makeResult({
      euros: {
        estimated_investment: 5200,
        cost_import: 4.7,
        revenue_export: 0.6,
        net_cost: 4.1,
        saved_vs_nopv: 0.2,
        net_cost_with_penalties: 4.9,
        grid_only_cost: 6.8,
        delta_vs_grid_only: 1.9,
        savings_rate: 0.28,
        simple_payback_years: 8.5
      },
      net_cost_with_penalties: 4.9
    });

    const rows = buildEconomicRows(resultA, resultB);
    const labels = rows.map((row) => row.label);

    expect(new Set(labels).size).toBe(rows.length);

    const investment = rows.find((row) => row.label === 'Investissement estimé');
    expect(investment?.valueA).toBe(5400);
    expect(investment?.valueB).toBe(5200);

    const penalties = rows.find((row) => row.label === 'Coût net (avec pénalités)');
    expect(penalties?.valueA).toBe(2.4);
    expect(penalties?.valueB).toBe(4.9);
  });

  it('omits values when results are not available yet', () => {
    const rows = buildEconomicRows(null, undefined);
    expect(rows.every((row) => row.valueA === undefined && row.valueB === undefined)).toBe(true);
  });
});
