import { describe, expect, it } from 'vitest';
import { DHWTank } from '../src/devices/DHWTank';
import { Battery } from '../src/devices/Battery';
import { createEcsHelperState, processEcsRequests } from '../src/core/ecs/helpers';
import { defaultEcsServiceContract } from '../src/data/ecs-service';
import { runSimulation } from '../src/core/engine';
import { batteryFirstStrategy, ecsFirstStrategy } from '../src/core/strategy';
import { getScenarioPreset, PresetId } from '../src/data/scenarios';

const makeTank = () =>
  new DHWTank('dhw', 'Ballon', {
    volume_L: 200,
    resistivePower_kW: 3,
    efficiency: 0.95,
    lossCoeff_W_per_K: 30,
    ambientTemp_C: 20,
    targetTemp_C: 55,
    initialTemp_C: 55
  });

describe('ecs helpers', () => {
  it("hysteresis coupe la demande tant que la température reste dans la bande", () => {
    const tank = makeTank();
    const baseContract = defaultEcsServiceContract();
    const contract = { ...baseContract, helpers: { ...baseContract.helpers } };
    const helperState = createEcsHelperState();
    const request = {
      device: tank,
      request: { maxAccept_kW: 3, need: 'toHeat' as const },
      state: { temp_C: contract.targetCelsius - 0.1 }
    };

    const firstPass = processEcsRequests(
      {
        requests: [request],
        contract,
        dt_s: 900,
        time_s: contract.deadlineHour * 3600 - 1800,
        surplus_kW: 2
      },
      helperState
    );

    expect(firstPass.requests).toHaveLength(0);
    expect(firstPass.forcedAllocations).toHaveLength(0);
    expect(firstPass.remainingSurplus_kW).toBeCloseTo(2, 6);

    const secondPass = processEcsRequests(
      {
        requests: [
          {
            ...request,
            state: { temp_C: contract.targetCelsius - contract.helpers.hysteresisBand_K - 0.2 }
          }
        ],
        contract,
        dt_s: 900,
        time_s: contract.deadlineHour * 3600 - 3 * 3600,
        surplus_kW: 2
      },
      helperState
    );

    expect(secondPass.requests).toHaveLength(1);
    expect(secondPass.requests[0].request.maxAccept_kW).toBeCloseTo(3, 6);
    expect(secondPass.forcedAllocations).toHaveLength(0);
  });

  it('deadline helper réserve une partie du surplus pour la préchauffe', () => {
    const tank = makeTank();
    const baseContract = defaultEcsServiceContract();
    const contract = {
      ...baseContract,
      helpers: { ...baseContract.helpers, hysteresisEnabled: false },
      mode: 'penalize' as const
    };
    const helperState = createEcsHelperState();
    const requests = [
      {
        device: tank,
        request: { maxAccept_kW: 3, need: 'toHeat' as const },
        state: { temp_C: contract.targetCelsius - 5 }
      }
    ];

    const result = processEcsRequests(
      {
        requests,
        contract,
        dt_s: 900,
        time_s: contract.deadlineHour * 3600 - 900,
        surplus_kW: 2
      },
      helperState
    );

    expect(result.forcedAllocations).toHaveLength(1);
    expect(result.forcedAllocations[0].device).toBe(tank);
    expect(result.forcedAllocations[0].power_kW).toBeCloseTo(2, 6);
    expect(result.remainingSurplus_kW).toBeCloseTo(0, 6);
    expect(result.requests).toHaveLength(1);
    expect(result.requests[0].request.maxAccept_kW).toBeCloseTo(1, 6);
    expect(result.requests[0].state.ecs_deadline_urgent).toBe(true);
  });

  it('réduit les commutations ECS lorsque l’hystérésis est actif', () => {
    const baseContract = defaultEcsServiceContract();
    const temps = [54.9, 54.7, 54.6, 54.4, 54.9, 54.3, 53.3, 54.8, 54.6];

    const countAccepted = (hysteresisEnabled: boolean) => {
      const contract = {
        ...baseContract,
        helpers: { ...baseContract.helpers, hysteresisEnabled, deadlineEnabled: false }
      };
      const state = createEcsHelperState();
      const tank = makeTank();
      let accepted = 0;
      temps.forEach((temp, index) => {
        const outcome = processEcsRequests(
          {
            requests: [
              {
                device: tank,
                request: { maxAccept_kW: 3, need: 'toHeat' as const },
                state: { temp_C: temp }
              }
            ],
            contract,
            dt_s: 900,
            time_s: index * 900,
            surplus_kW: 2
          },
          state
        );
        if (outcome.requests.length > 0) {
          accepted += 1;
        }
      });
      return accepted;
    };

    expect(countAccepted(true)).toBeLessThan(countAccepted(false));
  });

  it('améliore le hit rate en mode battery_first lorsque la préchauffe est active', () => {
    const dt_s = 900;
    const stepsPerDay = (24 * 3600) / dt_s;
    const pv = Array.from({ length: stepsPerDay }, () => 0);
    const base = Array.from({ length: stepsPerDay }, () => 0.5);
    const deadlineHour = 18;
    const windowSteps = 4;
    const start = deadlineHour * (3600 / dt_s) - windowSteps;
    for (let index = 0; index < windowSteps; index += 1) {
      pv[start + index] = 2;
    }

    const makeBattery = () =>
      new Battery('battery', 'Batterie', {
        capacity_kWh: 4,
        pMax_kW: 2,
        etaCharge: 0.95,
        etaDischarge: 0.95,
        socInit_kWh: 0,
        socMin_kWh: 0,
        socMax_kWh: 4
      });

    const run = (deadlineEnabled: boolean) =>
      runSimulation({
        dt_s,
        pvSeries_kW: pv,
        baseLoadSeries_kW: base,
        devices: [
          makeBattery(),
          new DHWTank('dhw', 'Ballon', {
            volume_L: 200,
            resistivePower_kW: 3,
            efficiency: 0.95,
            lossCoeff_W_per_K: 4,
            ambientTemp_C: 20,
            targetTemp_C: 55,
            initialTemp_C: 50
          })
        ],
        strategy: batteryFirstStrategy,
        ecsService: {
          mode: 'penalize',
          targetCelsius: 55,
          deadlineHour,
          penaltyPerKelvin: 0.08,
          helpers: {
            ...defaultEcsServiceContract().helpers,
            hysteresisEnabled: false,
            deadlineEnabled,
            deadlinePreheatWindowHours: 1
          }
        }
      });

    const withoutHelper = run(false);
    const withHelper = run(true);

    expect(withoutHelper.kpis.ecs_hit_rate).toBeLessThan(0.2);
    expect(withoutHelper.kpis.ecs_penalties_total_EUR).toBeGreaterThan(0);
    expect(withHelper.kpis.ecs_hit_rate).toBeGreaterThan(0.9);
    expect(withHelper.kpis.ecs_penalties_total_EUR).toBeCloseTo(0, 6);
  });
});

describe('pas de temps', () => {
  it('conserve un comportement cohérent entre dt 60s et 900s', () => {
    const preset = getScenarioPreset(PresetId.EteEnsoleille);
    if (!preset) {
      throw new Error('preset manquant');
    }
    const series900 = preset.generate(900);
    const series60 = preset.generate(60);
    const defaults = preset.defaults;

    const run = (dt_s: number, pv: readonly number[], base: readonly number[]) =>
      runSimulation({
        dt_s,
        pvSeries_kW: pv,
        baseLoadSeries_kW: base,
        devices: [
          new DHWTank('dhw', 'Ballon', { ...defaults.ecsConfig }),
          new Battery('battery', 'Batterie', { ...defaults.batteryConfig })
        ],
        strategy: ecsFirstStrategy,
        ecsService: {
          mode: 'force',
          targetCelsius: defaults.ecsConfig.targetTemp_C,
          deadlineHour: 21,
          penaltyPerKelvin: 0.08,
          helpers: { ...defaultEcsServiceContract().helpers }
        }
      });

    const result900 = run(series900.dt_s, series900.pvSeries_kW, series900.baseLoadSeries_kW);
    const result60 = run(series60.dt_s, series60.pvSeries_kW, series60.baseLoadSeries_kW);

    expect(result900.kpis.ecs_hit_rate).toBeCloseTo(1, 6);
    expect(result60.kpis.ecs_hit_rate).toBeCloseTo(1, 6);
    expect(Math.abs(result900.totals.ecsRescue_kWh - result60.totals.ecsRescue_kWh)).toBeLessThan(0.2);
  });
});
