import { describe, expect, it } from 'vitest';
import { runSimulation } from '../src/core/engine';
import { ecsFirstStrategy } from '../src/core/strategy';

describe('Moteur — profil hiver sans export', () => {
  it("ne renvoie aucune injection réseau quand le PV est inférieur à la charge", () => {
    const dt_s = 3600;
    const steps = 24;
    const pvSeries_kW = new Array(steps).fill(0.4);
    const baseLoadSeries_kW = new Array(steps).fill(1.2);

    const result = runSimulation({
      dt_s,
      pvSeries_kW,
      baseLoadSeries_kW,
      devices: [],
      strategy: ecsFirstStrategy
    });

    expect(result.totals.gridExport_kWh).toBeCloseTo(0, 6);
    expect(result.kpis.selfConsumption).toBeCloseTo(1, 6);
    expect(result.kpis.selfProduction).toBeGreaterThan(0);
    for (const step of result.trace.steps) {
      expect(step.gridExport_kW).toBeLessThanOrEqual(1e-6);
    }
  });
});

