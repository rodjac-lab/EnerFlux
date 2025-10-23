import { runSimulation } from '../src/core/engine';
import { Battery } from '../src/devices/Battery';
import { batteryFirstStrategy } from '../src/core/strategy';

describe('Moteur — surplus PV avec stratégie batterie d’abord', () => {
  it('priorise la charge batterie sans export simultané', () => {
    const dt_s = 900;
    const pvSeries_kW = [0, 5, 5, 0];
    const baseLoadSeries_kW = [1, 1, 1, 1];
    const battery = new Battery('bat', 'Batterie', {
      capacity_kWh: 6,
      pMax_kW: 4,
      etaCharge: 0.95,
      etaDischarge: 0.95,
      socInit_kWh: 2,
      socMin_kWh: 1,
      socMax_kWh: 6
    });

    const result = runSimulation({
      dt_s,
      pvSeries_kW,
      baseLoadSeries_kW,
      devices: [battery],
      strategy: batteryFirstStrategy
    });

    const chargingSteps = result.trace.steps.filter((step) => step.battery_power_kW > 0.01);
    expect(chargingSteps.length).toBeGreaterThan(0);
    for (const step of chargingSteps) {
      expect(step.battery_power_kW).toBeLessThanOrEqual(4.01);
      expect(step.gridExport_kW).toBeLessThan(1e-3);
      expect(step.decision_reason === 'batt_charge' || step.decision_reason === 'idle').toBe(true);
    }
  });
});

