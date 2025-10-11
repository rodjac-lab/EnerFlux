import { describe, expect, it } from 'vitest';

import { eurosFromFlows } from '../src/core/kpis';
import type { StepFlows } from '../src/data/types';

describe('eurosFromFlows — economic KPIs', () => {
  const sampleFlow: StepFlows = {
    pv_to_load_kW: 0.6,
    pv_to_ecs_kW: 0,
    pv_to_heat_kW: 0,
    pv_to_pool_kW: 0,
    pv_to_batt_kW: 0.2,
    pv_to_grid_kW: 0.4,
    batt_to_load_kW: 0.2,
    batt_to_ecs_kW: 0,
    batt_to_heat_kW: 0,
    batt_to_pool_kW: 0,
    grid_to_load_kW: 0.2,
    grid_to_ecs_kW: 0,
    grid_to_heat_kW: 0,
    grid_to_pool_kW: 0
  };

  it('computes delta vs grid and simple payback', () => {
    const dt_s = 3600; // 1 heure
    const importPrices = [0.3];
    const exportPrices = [0.1];
    const result = eurosFromFlows([sampleFlow], dt_s, importPrices, exportPrices, {
      investment_EUR: 1000,
      horizon_s: dt_s
    });

    const expectedGridCost = 0.3; // 1 kWh * 0.3 €/kWh
    const expectedImportCost = 0.2 * 0.3; // 0.06 €
    const expectedRevenue = 0.4 * 0.1; // 0.04 €
    const expectedNetCost = expectedImportCost - expectedRevenue; // 0.02 €
    const expectedDelta = expectedGridCost - expectedNetCost; // 0.28 €

    expect(result.grid_only_cost).toBeCloseTo(expectedGridCost, 6);
    expect(result.cost_import).toBeCloseTo(expectedImportCost, 6);
    expect(result.revenue_export).toBeCloseTo(expectedRevenue, 6);
    expect(result.net_cost).toBeCloseTo(expectedNetCost, 6);
    expect(result.delta_vs_grid_only).toBeCloseTo(expectedDelta, 6);
    expect(result.saved_vs_nopv).toBeCloseTo(expectedDelta, 6);
    expect(result.savings_rate).toBeCloseTo(expectedDelta / expectedGridCost, 6);
    expect(result.estimated_investment).toBe(1000);

    const durationYears = dt_s / (3600 * 24 * 365);
    const annualSavings = expectedDelta / durationYears;
    const expectedPayback = 1000 / annualSavings;
    expect(result.simple_payback_years).toBeCloseTo(expectedPayback, 6);
  });

  it('returns neutral values when flows are empty or savings non-positive', () => {
    const empty = eurosFromFlows([], 900, [], [], { investment_EUR: 500 });
    expect(empty.cost_import).toBe(0);
    expect(empty.grid_only_cost).toBe(0);
    expect(empty.delta_vs_grid_only).toBe(0);
    expect(empty.simple_payback_years).toBeNull();
    expect(empty.estimated_investment).toBe(500);

    const noSavingsFlow: StepFlows = {
      pv_to_load_kW: 0,
      pv_to_ecs_kW: 0,
      pv_to_heat_kW: 0,
      pv_to_pool_kW: 0,
      pv_to_batt_kW: 0,
      pv_to_grid_kW: 0,
      batt_to_load_kW: 0,
      batt_to_ecs_kW: 0,
      batt_to_heat_kW: 0,
      batt_to_pool_kW: 0,
      grid_to_load_kW: 1,
      grid_to_ecs_kW: 0,
      grid_to_heat_kW: 0,
      grid_to_pool_kW: 0
    };
    const noSavings = eurosFromFlows([noSavingsFlow], 3600, [0.2], [0.1], {
      investment_EUR: 500,
      horizon_s: 3600
    });
    expect(noSavings.delta_vs_grid_only).toBeCloseTo(0, 6);
    expect(noSavings.simple_payback_years).toBeNull();
  });
});

