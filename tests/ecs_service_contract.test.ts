import { describe, expect, it } from 'vitest';
import { getScenario, PresetId } from '../src/data/scenarios';
import { DHWTank } from '../src/devices/DHWTank';
import { runSimulation } from '../src/core/engine';
import { defaultEcsServiceConfig } from '../src/data/ecs-service';

type EnforcementMode = 'force' | 'penalize' | 'off';

const runWithMode = (mode: EnforcementMode) => {
  const scenario = getScenario(PresetId.HiverCouvert);
  const tank = new DHWTank('dhw', 'Ballon ECS', { ...scenario.defaults.ecsConfig });
  const ecsService = { ...defaultEcsServiceConfig(), enforcementMode: mode, target_C: tank.targetTemp };
  const result = runSimulation({
    dt_s: scenario.dt,
    pvSeries_kW: scenario.pv,
    baseLoadSeries_kW: scenario.load_base,
    devices: [tank],
    strategy: () => [],
    ecsService
  });
  return { result, tank, ecsService };
};

describe('Contrat ECS', () => {
  it('force le secours réseau si nécessaire', () => {
    const { result, tank, ecsService } = runWithMode('force');

    expect(result.kpis.ecs_rescue_used).toBe(true);
    expect(result.kpis.ecs_rescue_kWh).toBeGreaterThan(0);
    expect(result.totals.ecsRescue_kWh).toBeCloseTo(result.kpis.ecs_rescue_kWh, 6);
    expect(result.kpis.ecs_penalty_EUR).toBe(0);
    expect(result.totals.ecsPenalty_EUR).toBe(0);
    expect(result.kpis.net_cost_with_penalties).toBeCloseTo(result.kpis.euros.net_cost, 6);
    expect(result.kpis.euros.net_cost_with_penalties).toBeCloseTo(result.kpis.net_cost_with_penalties, 6);
    expect(result.kpis.ecs_deficit_K).toBe(0);
    expect(tank.temperature).toBeGreaterThanOrEqual(ecsService.target_C - 1e-6);
  });

  it('applique une pénalité lorsque le service est en mode pénalisation', () => {
    const { result, tank, ecsService } = runWithMode('penalize');

    expect(result.kpis.ecs_rescue_used).toBe(false);
    expect(result.kpis.ecs_rescue_kWh).toBe(0);
    expect(result.totals.ecsRescue_kWh).toBe(0);
    expect(result.kpis.ecs_deficit_K).toBeGreaterThan(0);
    expect(result.totals.ecsDeficit_K).toBeCloseTo(result.kpis.ecs_deficit_K, 6);
    expect(result.kpis.ecs_penalty_EUR).toBeGreaterThan(0);
    expect(result.totals.ecsPenalty_EUR).toBeCloseTo(result.kpis.ecs_penalty_EUR, 6);
    expect(result.kpis.net_cost_with_penalties).toBeCloseTo(
      result.kpis.euros.net_cost + result.kpis.ecs_penalty_EUR,
      6
    );
    expect(result.kpis.euros.net_cost_with_penalties).toBeCloseTo(result.kpis.net_cost_with_penalties, 6);
    expect(tank.temperature).toBeLessThan(ecsService.target_C);
  });

  it('désactive appoint et pénalités en mode off', () => {
    const { result, tank, ecsService } = runWithMode('off');

    expect(result.kpis.ecs_rescue_used).toBe(false);
    expect(result.kpis.ecs_rescue_kWh).toBe(0);
    expect(result.totals.ecsRescue_kWh).toBe(0);
    expect(result.kpis.ecs_penalty_EUR).toBe(0);
    expect(result.totals.ecsPenalty_EUR).toBe(0);
    expect(result.kpis.net_cost_with_penalties).toBeCloseTo(result.kpis.euros.net_cost, 6);
    expect(result.kpis.euros.net_cost_with_penalties).toBeCloseTo(result.kpis.net_cost_with_penalties, 6);
    expect(tank.temperature).toBeLessThan(ecsService.target_C);
  });
});
