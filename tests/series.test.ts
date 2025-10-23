import { buildSeries, buildSeriesForVariant, sliceSeriesWithWindow, WindowFilter } from '../src/data/series';
import type { ExportV1 } from '../src/types/export';

const baseExport: ExportV1 = {
  meta: {
    version: '1.0',
    scenario: 'test',
    dt_s: 1800,
    tariffs: {
      mode: 'fixed',
      import_EUR_per_kWh: 0.2,
      export_EUR_per_kWh: 0.05
    },
    batteryConfig: {
      socMin_kWh: 0,
      socMax_kWh: 10,
      maxCharge_kW: 3,
      maxDischarge_kW: 3,
      efficiency: 0.95
    },
    dhwConfig: {
      mode: 'hysteresis',
      targetCelsius: 55,
      deadlineHour: 21
    },
    strategyA: { id: 'A' },
    strategyB: { id: 'B' }
  },
  steps: [
    {
      t_s: 0,
      pv_kW: 2,
      baseLoad_kW: 1,
      surplus_A_kW: 1,
      deficit_A_kW: 0,
      battery_power_A_kW: 1,
      battery_soc_A_kWh: 5,
      dhw_power_A_kW: 0.2,
      dhw_temp_A_C: 50,
      gridImport_A_kW: 0,
      gridExport_A_kW: 0,
      pvUsedOnSite_A_kW: 2,
      decision_reason_A: 'batt_charge',
      surplus_B_kW: 0,
      deficit_B_kW: 1,
      battery_power_B_kW: -1,
      battery_soc_B_kWh: 6,
      dhw_power_B_kW: 0.3,
      dhw_temp_B_C: 48,
      gridImport_B_kW: 0.5,
      gridExport_B_kW: 0,
      pvUsedOnSite_B_kW: 1.5,
      decision_reason_B: 'batt_discharge'
    },
    {
      t_s: 1800,
      pv_kW: 0,
      baseLoad_kW: 1.5,
      surplus_A_kW: 0,
      deficit_A_kW: 1,
      battery_power_A_kW: -2,
      battery_soc_A_kWh: 3,
      dhw_power_A_kW: 0.4,
      dhw_temp_A_C: 52,
      gridImport_A_kW: 1,
      gridExport_A_kW: 0,
      pvUsedOnSite_A_kW: 0,
      decision_reason_A: 'batt_discharge',
      surplus_B_kW: 0,
      deficit_B_kW: 1.5,
      battery_power_B_kW: 0,
      battery_soc_B_kWh: 6,
      dhw_power_B_kW: 0.6,
      dhw_temp_B_C: 49,
      gridImport_B_kW: 1.5,
      gridExport_B_kW: 0,
      pvUsedOnSite_B_kW: 0,
      decision_reason_B: 'grid_import'
    },
    {
      t_s: 3600,
      pv_kW: 1,
      baseLoad_kW: 1,
      surplus_A_kW: 0,
      deficit_A_kW: 0,
      battery_power_A_kW: 0,
      battery_soc_A_kWh: 3,
      dhw_power_A_kW: 0.1,
      dhw_temp_A_C: 53,
      gridImport_A_kW: 0,
      gridExport_A_kW: 0.5,
      pvUsedOnSite_A_kW: 0.5,
      decision_reason_A: 'export_surplus',
      surplus_B_kW: 0,
      deficit_B_kW: 0,
      battery_power_B_kW: 0,
      battery_soc_B_kWh: 6,
      dhw_power_B_kW: 0.2,
      dhw_temp_B_C: 50,
      gridImport_B_kW: 0,
      gridExport_B_kW: 0.2,
      pvUsedOnSite_B_kW: 0.8,
      decision_reason_B: 'idle'
    }
  ],
  kpis: {
    A: {
      autoconsumption_pct: 0,
      autoproduct_pct: 0,
      import_kWh: 0,
      export_kWh: 0,
      cost_EUR: 0,
      ecs_time_at_or_above_target_pct: 0
    },
    B: {
      autoconsumption_pct: 0,
      autoproduct_pct: 0,
      import_kWh: 0,
      export_kWh: 0,
      cost_EUR: 0,
      ecs_time_at_or_above_target_pct: 0
    }
  }
};

describe('series builders', () => {
  it('splits battery charge/discharge correctly', () => {
    const series = buildSeriesForVariant(baseExport, 'A');
    expect(series.energy[0].batt_charge_kW).toBe(1);
    expect(series.energy[0].batt_discharge_kW).toBe(0);
    expect(series.energy[1].batt_charge_kW).toBe(0);
    expect(series.energy[1].batt_discharge_kW).toBe(2);
  });

  it('filters series by window consistently', () => {
    const built = buildSeries(baseExport);
    const window: WindowFilter = { startH: 0, endH: 0.25 };
    const { seriesA } = sliceSeriesWithWindow(built, window);
    expect(seriesA.energy).toHaveLength(1);
    expect(seriesA.energy[0].t_s).toBe(0);
  });
});

