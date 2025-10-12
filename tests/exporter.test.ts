import { describe, expect, it } from 'vitest';
import { buildExportV1, buildCSVContent, type Trace } from '../src/core/exporter';
import type { ExportMetaV1 } from '../src/types/export';
import type { SimulationKPIs } from '../src/core/kpis';

const buildKpis = (overrides: Partial<SimulationKPIs> = {}): SimulationKPIs => ({
  selfConsumption: 0.65,
  selfProduction: 0.7,
  batteryCycles: 120,
  ecsTargetUptime: 0.95,
  euros: {
    cost_import: 120,
    revenue_export: 45,
    net_cost: 75,
    saved_vs_nopv: 30,
    net_cost_with_penalties: 75,
    grid_only_cost: 180,
    delta_vs_grid_only: -105,
    savings_rate: 0.58,
    simple_payback_years: 7.2,
    estimated_investment: 6800
  },
  audit: {
    pv_total_kWh: 1.0,
    pv_used_on_site_kWh: 0.8,
    load_total_kWh: 1.2,
    load_direct_from_pv_kWh: 0.5,
    ecs_from_pv_kWh: 0.1,
    battery_charge_from_pv_kWh: 0.2,
    battery_discharge_to_load_kWh: 0.15,
    battery_losses_kWh: 0.05,
    load_covered_by_pv_direct_kWh: 0.6,
    grid_export_kWh: 0.2
  },
  ecs_rescue_used: false,
  ecs_rescue_kWh: 0,
  ecs_deficit_K: 0,
  ecs_penalty_EUR: 0,
  ecs_hit_rate: 1,
  ecs_avg_deficit_K: 0,
  ecs_penalties_total_EUR: 0,
  net_cost_with_penalties: 75,
  heating_comfort_ratio: 0.9,
  pool_filtration_completion: 1,
  ev_charge_completion: 1,
  ...overrides
});

const buildTrace = (idSuffix: 'A' | 'B'): Trace => ({
  dt_s: 900,
  steps: [
    {
      time_s: 0,
      pv_kW: 4,
      baseLoad_kW: 2,
      surplusBeforeStrategy_kW: idSuffix === 'A' ? 1.5 : 1.2,
      deficitBeforeStrategy_kW: 0,
      battery_power_kW: 1.2,
      battery_soc_kWh: idSuffix === 'A' ? 4.5 : 4.2,
      dhw_power_kW: 0.3,
      dhw_temp_C: 48,
      gridImport_kW: 0,
      gridExport_kW: 0.3,
      pvUsedOnSite_kW: 1.7,
      decision_reason: idSuffix === 'A' ? 'batt_charge' : 'ecs_preheat'
    },
    {
      time_s: 900,
      pv_kW: 1.5,
      baseLoad_kW: 3,
      surplusBeforeStrategy_kW: 0,
      deficitBeforeStrategy_kW: 1.6,
      battery_power_kW: -0.8,
      battery_soc_kWh: idSuffix === 'A' ? 4.1 : 4.0,
      dhw_power_kW: 0,
      dhw_temp_C: 49.5,
      gridImport_kW: 0.9,
      gridExport_kW: 0,
      pvUsedOnSite_kW: 1.5,
      decision_reason: 'batt_discharge'
    },
    {
      time_s: 1800,
      pv_kW: 0,
      baseLoad_kW: 2.5,
      surplusBeforeStrategy_kW: 0,
      deficitBeforeStrategy_kW: 2.5,
      battery_power_kW: -0.5,
      battery_soc_kWh: idSuffix === 'A' ? 3.8 : 3.7,
      dhw_power_kW: 0,
      dhw_temp_C: 50,
      gridImport_kW: 2,
      gridExport_kW: 0,
      pvUsedOnSite_kW: 0,
      decision_reason: 'grid_import'
    },
    {
      time_s: 2700,
      pv_kW: 3.2,
      baseLoad_kW: 1.5,
      surplusBeforeStrategy_kW: 1.2,
      deficitBeforeStrategy_kW: 0,
      battery_power_kW: 0.6,
      battery_soc_kWh: idSuffix === 'A' ? 4.0 : 3.9,
      dhw_power_kW: 0.4,
      dhw_temp_C: 52,
      gridImport_kW: 0,
      gridExport_kW: 0.2,
      pvUsedOnSite_kW: 1.4,
      decision_reason: 'ecs_preheat'
    }
  ],
  totals: {
    pvProduction_kWh: 6.2,
    consumption_kWh: 5.8,
    gridImport_kWh: 1.5,
    gridExport_kWh: 0.7,
    batteryDelta_kWh: 0.1,
    ecsRescue_kWh: 0,
    ecsEnergy_kWh: 1.1,
    poolEnergy_kWh: 0,
    evEnergy_kWh: 0,
    ecsDeficit_K: 0,
    ecsPenalty_EUR: 0
  },
  kpis: buildKpis(idSuffix === 'B' ? { selfConsumption: 0.6, selfProduction: 0.68, net_cost_with_penalties: 80 } : {})
});

describe('exporter', () => {
  it('builds a JSON snapshot for two traces', () => {
    const traceA = buildTrace('A');
    const traceB = buildTrace('B');
    const meta: ExportMetaV1 = {
      version: '1.0',
      scenario: 'demo',
      dt_s: 900,
      tariffs: {
        mode: 'fixed',
        import_EUR_per_kWh: 0.2,
        export_EUR_per_kWh: 0.08
      },
      batteryConfig: {
        socMin_kWh: 1,
        socMax_kWh: 10,
        maxCharge_kW: 4,
        maxDischarge_kW: 4,
        efficiency: 0.9
      },
      dhwConfig: {
        mode: 'force',
        targetCelsius: 55,
        deadlineHour: 21,
        hysteresis_K: 1.5
      },
      strategyA: { id: 'battery_first' },
      strategyB: { id: 'mix_soc_threshold' }
    };
    const payload = buildExportV1(traceA, traceB, meta);
    expect(payload.meta).toEqual(meta);
    expect(payload.steps).toHaveLength(4);
    expect(payload.steps[0]).toMatchInlineSnapshot(`
      {
        "baseLoad_kW": 2,
        "battery_power_A_kW": 1.2,
        "battery_power_B_kW": 1.2,
        "battery_soc_A_kWh": 4.5,
        "battery_soc_B_kWh": 4.2,
        "decision_reason_A": "batt_charge",
        "decision_reason_B": "ecs_preheat",
        "deficit_A_kW": 0,
        "deficit_B_kW": 0,
        "dhw_power_A_kW": 0.3,
        "dhw_power_B_kW": 0.3,
        "dhw_temp_A_C": 48,
        "dhw_temp_B_C": 48,
        "gridExport_A_kW": 0.3,
        "gridExport_B_kW": 0.3,
        "gridImport_A_kW": 0,
        "gridImport_B_kW": 0,
        "pvUsedOnSite_A_kW": 1.7,
        "pvUsedOnSite_B_kW": 1.7,
        "pv_kW": 4,
        "surplus_A_kW": 1.5,
        "surplus_B_kW": 1.2,
        "t_s": 0,
      }
    `);
    expect(payload.kpis).toMatchInlineSnapshot(`
      {
        "A": {
          "autoconsumption_pct": 65,
          "autoproduct_pct": 70,
          "cost_EUR": 75,
          "ecs_time_at_or_above_target_pct": 95,
          "export_kWh": 0.7,
          "import_kWh": 1.5,
        },
        "B": {
          "autoconsumption_pct": 60,
          "autoproduct_pct": 68,
          "cost_EUR": 80,
          "ecs_time_at_or_above_target_pct": 95,
          "export_kWh": 0.7,
          "import_kWh": 1.5,
        },
      }
    `);
  });

  it('builds a CSV snapshot for two traces', () => {
    const traceA = buildTrace('A');
    const traceB = buildTrace('B');
    const meta: ExportMetaV1 = {
      version: '1.0',
      scenario: 'demo',
      dt_s: 900,
      tariffs: {
        mode: 'fixed',
        import_EUR_per_kWh: 0.2,
        export_EUR_per_kWh: 0.08
      },
      batteryConfig: {
        socMin_kWh: 1,
        socMax_kWh: 10,
        maxCharge_kW: 4,
        maxDischarge_kW: 4,
        efficiency: 0.9
      },
      dhwConfig: {
        mode: 'force',
        targetCelsius: 55,
        deadlineHour: 21
      },
      strategyA: { id: 'battery_first' },
      strategyB: { id: 'mix_soc_threshold' }
    };
    const payload = buildExportV1(traceA, traceB, meta);
    expect(buildCSVContent(payload)).toMatchInlineSnapshot(`
      "# version: 1.0
      # scenario: demo
      # dt_s: 900
      # strategyA: battery_first
      # strategyB: mix_soc_threshold
      # tariffs: {\\"mode\\":\\"fixed\\",\\"import_EUR_per_kWh\\":0.2,\\"export_EUR_per_kWh\\":0.08}
      # batteryConfig: {\\"socMin_kWh\\":1,\\"socMax_kWh\\":10,\\"maxCharge_kW\\":4,\\"maxDischarge_kW\\":4,\\"efficiency\\":0.9}
      # dhwConfig: {\\"mode\\":\\"force\\",\\"targetCelsius\\":55,\\"deadlineHour\\":21}
      t_s;pv_A;base_A;surplus_A;battP_A;soc_A;dhwP_A;dhwT_A;import_A;export_A;pvUsed_A;reason_A;pv_B;base_B;surplus_B;battP_B;soc_B;dhwP_B;dhwT_B;import_B;export_B;pvUsed_B;reason_B
      0;4;2;1.5;1.2;4.5;0.3;48;0;0.3;1.7;batt_charge;4;2;1.2;1.2;4.2;0.3;48;0;0.3;1.7;ecs_preheat
      900;1.5;3;0;-0.8;4.1;0;49.5;0.9;0;1.5;batt_discharge;1.5;3;0;-0.8;4;0;49.5;0.9;0;1.5;batt_discharge
      1800;0;2.5;0;-0.5;3.8;0;50;2;0;0;grid_import;0;2.5;0;-0.5;3.7;0;50;2;0;0;grid_import
      2700;3.2;1.5;1.2;0.6;4;0.4;52;0;0.2;1.4;ecs_preheat;3.2;1.5;1.2;0.6;3.9;0.4;52;0;0.2;1.4;ecs_preheat"
    `);
  });
});
