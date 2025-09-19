import { describe, expect, it } from 'vitest';
import { getScenario, PresetId } from '../src/data/scenarios';
import { Battery } from '../src/devices/Battery';
import { DHWTank } from '../src/devices/DHWTank';
import { runSimulation } from '../src/core/engine';
import { summarizeFlows } from '../src/core/kpis';
import { ecsFirstStrategy } from '../src/core/strategy';

const createBattery = () =>
  new Battery('battery', 'Batterie', {
    capacity_kWh: 10,
    pMax_kW: 4,
    etaCharge: 0.95,
    etaDischarge: 0.95,
    socInit_kWh: 5,
    socMin_kWh: 1,
    socMax_kWh: 10
  });

const createTank = () =>
  new DHWTank('dhw', 'Ballon ECS', {
    volume_L: 250,
    resistivePower_kW: 2,
    efficiency: 0.95,
    lossCoeff_W_per_K: 8,
    ambientTemp_C: 20,
    targetTemp_C: 55,
    initialTemp_C: 42
  });

describe('Moteur de simulation — scénario été', () => {
  it('respecte les bilans et les limites physiques', () => {
    const scenario = getScenario(PresetId.EteEnsoleille);
    const result = runSimulation({
      dt_s: scenario.dt,
      pvSeries_kW: scenario.pv,
      baseLoadSeries_kW: scenario.load_base,
      devices: [createBattery(), createTank()],
      strategy: ecsFirstStrategy
    });

    const flowSummary = summarizeFlows(result.flows, result.dt_s).total_kWh;
    const baseLoadEnergy_kWh =
      (scenario.load_base.reduce((acc, value) => acc + value, 0) * scenario.dt) / 3600;
    const loadSupply_kWh =
      flowSummary.pv_to_load_kW + flowSummary.batt_to_load_kW + flowSummary.grid_to_load_kW;
    const ecsSupply_kWh =
      flowSummary.pv_to_ecs_kW + flowSummary.batt_to_ecs_kW + flowSummary.grid_to_ecs_kW;

    expect(loadSupply_kWh).toBeCloseTo(baseLoadEnergy_kWh, 6);
    expect(ecsSupply_kWh).toBeGreaterThanOrEqual(0);
    expect(
      flowSummary.pv_to_load_kW +
        flowSummary.pv_to_ecs_kW +
        flowSummary.pv_to_batt_kW +
        flowSummary.pv_to_grid_kW
    ).toBeCloseTo(result.totals.pvProduction_kWh, 6);
    expect(flowSummary.grid_to_load_kW + flowSummary.grid_to_ecs_kW).toBeCloseTo(
      result.totals.gridImport_kWh,
      6
    );
    expect(result.totals.consumption_kWh).toBeGreaterThanOrEqual(
      loadSupply_kWh + ecsSupply_kWh - 1e-6
    );
    expect(
      result.totals.pvProduction_kWh + result.totals.gridImport_kWh
    ).toBeCloseTo(
      result.totals.consumption_kWh +
        result.totals.gridExport_kWh +
        result.totals.batteryDelta_kWh,
      6
    );

    expect(result.kpis.euros.cost_import).toBeGreaterThanOrEqual(0);
    expect(result.kpis.euros.net_cost).toBeCloseTo(
      result.kpis.euros.cost_import - result.kpis.euros.revenue_export,
      6
    );

    for (const step of result.steps) {
      const batteryState = step.deviceStates.find((device) => device.id === 'battery');
      if (batteryState) {
        const soc = Number(batteryState.state.soc_kWh ?? batteryState.state.soc);
        expect(soc).toBeGreaterThanOrEqual(1 - 1e-6);
        expect(soc).toBeLessThanOrEqual(10 + 1e-6);
      }
      const tankState = step.deviceStates.find((device) => device.id === 'dhw');
      if (tankState) {
        const temp = Number(tankState.state.temp_C ?? tankState.state.temperature);
        expect(temp).toBeLessThanOrEqual(55.5);
      }
    }
  });
});
