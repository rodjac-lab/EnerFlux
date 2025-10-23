import { computeKPIsForSteps } from '../src/data/kpis';
import type { ExportV1 } from '../src/types/export';

const baseMeta: ExportV1['meta'] = {
  version: '1.0',
  scenario: 'winter',
  dt_s: 3600,
  tariffs: {
    mode: 'fixed',
    import_EUR_per_kWh: 0.2,
    export_EUR_per_kWh: 0.05
  },
  batteryConfig: {
    socMin_kWh: 0,
    socMax_kWh: 10,
    maxCharge_kW: 5,
    maxDischarge_kW: 5,
    efficiency: 0.9
  },
  dhwConfig: {
    mode: 'hysteresis',
    targetCelsius: 50,
    deadlineHour: 21
  },
  strategyA: { id: 'A' },
  strategyB: { id: 'B' }
};

describe('derived KPIs', () => {
  it('returns 100% autoconsumption when no export occurs', () => {
    const steps: ExportV1['steps'] = [
      {
        t_s: 0,
        pv_kW: 3,
        baseLoad_kW: 2,
        surplus_A_kW: 1,
        deficit_A_kW: 0,
        battery_power_A_kW: 0,
        battery_soc_A_kWh: 4,
        dhw_power_A_kW: 0.5,
        dhw_temp_A_C: 52,
        gridImport_A_kW: 0,
        gridExport_A_kW: 0,
        pvUsedOnSite_A_kW: 3,
        decision_reason_A: 'batt_charge',
        surplus_B_kW: 0,
        deficit_B_kW: 0,
        battery_power_B_kW: 0,
        battery_soc_B_kWh: 4,
        dhw_power_B_kW: 0.5,
        dhw_temp_B_C: 52,
        gridImport_B_kW: 0,
        gridExport_B_kW: 0,
        pvUsedOnSite_B_kW: 3,
        decision_reason_B: 'idle'
      }
    ];
    const kpis = computeKPIsForSteps(baseMeta, steps, 'A');
    expect(kpis.autoconsumption_pct).toBe(100);
  });

  it('applies time-of-use import pricing per step', () => {
    const touMeta: ExportV1['meta'] = {
      ...baseMeta,
      tariffs: {
        mode: 'tou',
        import_EUR_per_kWh: 0.25,
        export_EUR_per_kWh: 0.05,
        tou: {
          onpeak_hours: [1],
          offpeak_hours: [0],
          onpeak_price: 0.4,
          offpeak_price: 0.1
        }
      }
    };
    const steps: ExportV1['steps'] = [
      {
        t_s: 0,
        pv_kW: 0,
        baseLoad_kW: 1,
        surplus_A_kW: 0,
        deficit_A_kW: 1,
        battery_power_A_kW: 0,
        battery_soc_A_kWh: 4,
        dhw_power_A_kW: 0,
        dhw_temp_A_C: 45,
        gridImport_A_kW: 1,
        gridExport_A_kW: 0,
        pvUsedOnSite_A_kW: 0,
        decision_reason_A: 'grid_import',
        surplus_B_kW: 0,
        deficit_B_kW: 0,
        battery_power_B_kW: 0,
        battery_soc_B_kWh: 4,
        dhw_power_B_kW: 0,
        dhw_temp_B_C: 45,
        gridImport_B_kW: 0,
        gridExport_B_kW: 0,
        pvUsedOnSite_B_kW: 0,
        decision_reason_B: 'idle'
      },
      {
        t_s: 3600,
        pv_kW: 0,
        baseLoad_kW: 1,
        surplus_A_kW: 0,
        deficit_A_kW: 1,
        battery_power_A_kW: 0,
        battery_soc_A_kWh: 4,
        dhw_power_A_kW: 0,
        dhw_temp_A_C: 45,
        gridImport_A_kW: 1,
        gridExport_A_kW: 0,
        pvUsedOnSite_A_kW: 0,
        decision_reason_A: 'grid_import',
        surplus_B_kW: 0,
        deficit_B_kW: 0,
        battery_power_B_kW: 0,
        battery_soc_B_kWh: 4,
        dhw_power_B_kW: 0,
        dhw_temp_B_C: 45,
        gridImport_B_kW: 0,
        gridExport_B_kW: 0,
        pvUsedOnSite_B_kW: 0,
        decision_reason_B: 'idle'
      }
    ];
    const kpis = computeKPIsForSteps(touMeta, steps, 'A');
    expect(kpis.cost_EUR).toBeCloseTo(0.5);
  });
});

