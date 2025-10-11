import { describe, expect, it } from 'vitest';
import { getScenario, PresetId } from '../src/data/scenarios';
import { DHWTank } from '../src/devices/DHWTank';
import { runSimulation } from '../src/core/engine';
import { ecsFirstStrategy, Strategy } from '../src/core/strategy';

const createTank = (preset: PresetId): DHWTank => {
  const scenario = getScenario(preset);
  return new DHWTank('dhw', 'Ballon ECS', { ...scenario.defaults.ecsConfig });
};

describe('Appoint réseau ECS automatique', () => {
  it('applique un secours lorsque la stratégie ignore totalement le ballon', () => {
    const scenario = getScenario(PresetId.HiverCouvert);
    const tank = createTank(PresetId.HiverCouvert);
    const ignoreStrategy: Strategy = () => [];

    const result = runSimulation({
      dt_s: scenario.dt,
      pvSeries_kW: scenario.pv,
      baseLoadSeries_kW: scenario.load_base,
      devices: [tank],
      strategy: ignoreStrategy
    });

    expect(result.kpis.ecs_rescue_used).toBe(true);
    expect(result.kpis.ecs_rescue_kWh).toBeGreaterThan(0);
    expect(result.totals.ecsRescue_kWh).toBeCloseTo(result.kpis.ecs_rescue_kWh, 6);
    expect(tank.temperature).toBeCloseTo(tank.targetTemp, 6);

    const lastStep = result.steps[result.steps.length - 1];
    const dhwState = lastStep.deviceStates.find((device) => device.id === 'dhw');
    expect(dhwState).toBeDefined();
    expect(Number(dhwState?.state.temp_C)).toBeCloseTo(tank.targetTemp, 6);
  });

  it("n'emploie pas de secours quand l'ECS est déjà conforme", () => {
    const scenario = getScenario(PresetId.EteEnsoleille);
    const tank = new DHWTank('dhw', 'Ballon ECS', {
      ...scenario.defaults.ecsConfig,
      initialTemp_C: scenario.defaults.ecsConfig.targetTemp_C,
      lossCoeff_W_per_K: 0
    });

    const result = runSimulation({
      dt_s: scenario.dt,
      pvSeries_kW: scenario.pv,
      baseLoadSeries_kW: scenario.load_base,
      devices: [tank],
      strategy: ecsFirstStrategy
    });

    expect(result.kpis.ecs_rescue_used).toBe(false);
    expect(result.kpis.ecs_rescue_kWh).toBe(0);
    expect(result.totals.ecsRescue_kWh).toBe(0);
    expect(tank.temperature).toBeCloseTo(tank.targetTemp, 6);
  });
});
