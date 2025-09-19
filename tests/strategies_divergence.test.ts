import { describe, expect, it } from 'vitest';
import { getScenario, PresetId } from '../src/data/scenarios';
import { Battery } from '../src/devices/Battery';
import { DHWTank } from '../src/devices/DHWTank';
import { runSimulation } from '../src/core/engine';
import { batteryFirstStrategy, ecsFirstStrategy } from '../src/core/strategy';

const MIN_SELF_CONSUMPTION_DIVERGENCE = 0.005;

const createDevices = (defaults: ReturnType<typeof getScenario>['defaults']) => ({
  battery: new Battery('battery', 'Batterie', { ...defaults.batteryConfig }),
  ecs: new DHWTank('dhw', 'Ballon ECS', { ...defaults.ecsConfig })
});

const runWithStrategy = (
  presetId: PresetId,
  strategy: typeof ecsFirstStrategy
) => {
  const scenario = getScenario(presetId);
  const { battery, ecs } = createDevices(scenario.defaults);
  return runSimulation({
    dt_s: scenario.dt,
    pvSeries_kW: scenario.pv,
    baseLoadSeries_kW: scenario.load_base,
    devices: [battery, ecs],
    strategy
  });
};

describe('Stratégies — divergence sur scénarios stress', () => {
  it('ecs_first vs battery_first divergent sur "Matin froid"', () => {
    const resultA = runWithStrategy(PresetId.MatinFroid, ecsFirstStrategy);
    const resultB = runWithStrategy(PresetId.MatinFroid, batteryFirstStrategy);
    const delta = Math.abs(resultA.kpis.selfConsumption - resultB.kpis.selfConsumption);
    expect(delta).toBeGreaterThanOrEqual(MIN_SELF_CONSUMPTION_DIVERGENCE);
  });

  it('battery_first vs ecs_first divergent sur "Batterie vide"', () => {
    const resultA = runWithStrategy(PresetId.BatterieVide, batteryFirstStrategy);
    const resultB = runWithStrategy(PresetId.BatterieVide, ecsFirstStrategy);
    const delta = Math.abs(resultA.kpis.selfConsumption - resultB.kpis.selfConsumption);
    // Avec une batterie complètement déchargée, battery_first doit retarder l'ECS
    // et provoquer au moins 0,5 % d'écart d'autoconsommation ; un delta plus faible
    // signifie que la stratégie n'arbitre plus correctement la priorité chauffage vs stockage.
    expect(delta).toBeGreaterThanOrEqual(MIN_SELF_CONSUMPTION_DIVERGENCE);
  });
});
