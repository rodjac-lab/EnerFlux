import { describe, expect, it } from 'vitest';
import { getScenario, PresetId } from '../src/data/scenarios';
import { Battery } from '../src/devices/Battery';
import { DHWTank } from '../src/devices/DHWTank';
import { runSimulation } from '../src/core/engine';
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

    const deltaSoc_kWh = result.totals.batterySocEnd_kWh - result.totals.batterySocStart_kWh;
    const batteryLosses_kWh =
      result.totals.batteryCharge_kWh - result.totals.batteryDischarge_kWh - deltaSoc_kWh;
    const balance =
      result.totals.pvProduction_kWh +
      result.totals.gridImport_kWh -
      (result.totals.consumption_kWh + result.totals.gridExport_kWh + deltaSoc_kWh + batteryLosses_kWh);
    expect(Math.abs(balance)).toBeLessThan(1e-3);

    const flowBalance =
      result.totals.pvProduction_kWh +
      result.totals.gridImport_kWh +
      result.totals.batteryDischarge_kWh -
      (result.totals.consumption_kWh +
        result.totals.batteryCharge_kWh +
        result.totals.gridExport_kWh);
    expect(Math.abs(flowBalance)).toBeLessThan(1e-3);

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
