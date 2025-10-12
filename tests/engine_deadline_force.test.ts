import { describe, expect, it } from 'vitest';
import { runSimulation } from '../src/core/engine';
import { DHWTank } from '../src/devices/DHWTank';
import { ecsFirstStrategy } from '../src/core/strategy';
import { defaultEcsServiceContract } from '../src/data/ecs-service';

describe('Moteur — appoint ECS à la deadline', () => {
  it("force un appoint réseau si la consigne n'est pas atteinte", () => {
    const dt_s = 3600;
    const steps = 24;
    const pvSeries_kW = new Array(steps).fill(0);
    const baseLoadSeries_kW = new Array(steps).fill(0);
    const tank = new DHWTank('dhw', 'Ballon', {
      volume_L: 200,
      resistivePower_kW: 3,
      efficiency: 0.95,
      lossCoeff_W_per_K: 8,
      ambientTemp_C: 20,
      targetTemp_C: 52,
      initialTemp_C: 40
    });

    const ecsContract = defaultEcsServiceContract();
    const result = runSimulation({
      dt_s,
      pvSeries_kW,
      baseLoadSeries_kW,
      devices: [tank],
      strategy: ecsFirstStrategy,
      ecsService: {
        ...ecsContract,
        mode: 'force',
        targetCelsius: 52,
        deadlineHour: 6,
        helpers: { ...ecsContract.helpers, deadlineEnabled: true }
      }
    });

    const deadlineTime_s = 6 * 3600;
    const stepAtDeadline = result.trace.steps.find((step) => step.time_s === deadlineTime_s);
    expect(stepAtDeadline).toBeDefined();
    expect(stepAtDeadline?.dhw_power_kW ?? 0).toBeGreaterThan(0);
    expect(stepAtDeadline?.gridImport_kW ?? 0).toBeGreaterThan(0);
    expect(stepAtDeadline?.decision_reason).toBe('ecs_deadline_force');

    const finalTankState = result.steps[result.steps.length - 1]?.deviceStates.find(
      (state) => state.id === 'dhw'
    );
    const finalTemp = Number(finalTankState?.state.temp_C);
    expect(finalTemp).toBeGreaterThanOrEqual(51.5);
    expect(result.totals.gridImport_kWh).toBeGreaterThan(0);
  });
});

