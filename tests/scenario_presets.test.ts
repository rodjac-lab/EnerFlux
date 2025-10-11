import { describe, expect, it } from 'vitest';
import { getScenario, PresetId, scenarioPresets } from '../src/data/scenarios';

const SECONDS_PER_DAY = 24 * 3600;

const expectFullDaySeries = (dt: number, pv: readonly number[], load: readonly number[]) => {
  const expectedSteps = Math.round(SECONDS_PER_DAY / dt);
  expect(pv.length).toBe(expectedSteps);
  expect(load.length).toBe(expectedSteps);
};

describe('scenario presets — ECS focus', () => {
  it('generates a complete cold-morning scenario with constrained battery power', () => {
    const scenario = getScenario(PresetId.MatinFroid);
    expectFullDaySeries(scenario.dt, scenario.pv, scenario.load_base);

    expect(scenario.defaults.batteryConfig.pMax_kW).toBeLessThan(1.5);
    expect(scenario.defaults.ecsConfig.initialTemp_C).toBeLessThan(
      scenario.defaults.ecsConfig.targetTemp_C - 5
    );
    expect(scenario.defaults.tariffs.mode).toBe('tou');
    expect(scenario.defaults.tariffs.tou?.onpeak_hours).toContain(7);
    expect(scenario.defaults.tariffs.tou?.onpeak_hours).toContain(20);
  });

  it('exposes an evening comfort scenario with reinforced ECS target and ToU tariffs', () => {
    const scenario = getScenario(PresetId.BallonConfort);
    expectFullDaySeries(scenario.dt, scenario.pv, scenario.load_base);

    expect(scenario.defaults.ecsConfig.targetTemp_C).toBeGreaterThan(55);
    expect(scenario.defaults.ecsConfig.initialTemp_C).toBeGreaterThan(45);
    expect(scenario.defaults.batteryConfig.capacity_kWh).toBeGreaterThanOrEqual(12);

    expect(scenario.defaults.tariffs.mode).toBe('tou');
    expect(scenario.defaults.tariffs.tou?.onpeak_hours).toContain(19);
    expect(scenario.defaults.tariffs.tou?.offpeak_hours).toContain(3);
  });

  it('configures the EV evening preset with an active charging session', () => {
    const scenario = getScenario(PresetId.SoireeVE);
    expectFullDaySeries(scenario.dt, scenario.pv, scenario.load_base);

    expect(scenario.defaults.evConfig?.enabled).toBe(true);
    expect(scenario.defaults.evConfig?.params.session.energyNeed_kWh).toBeGreaterThan(15);
    expect(scenario.defaults.evConfig?.params.session.arrivalHour).toBe(18);
    expect(scenario.defaults.evConfig?.params.session.departureHour).toBe(7);
  });

  it('registers the ECS-focused presets in the public catalog', () => {
    const presetIds = scenarioPresets.map((preset) => preset.id);
    expect(presetIds).toContain(PresetId.MatinFroid);
    expect(presetIds).toContain(PresetId.BallonConfort);
    expect(presetIds).toContain(PresetId.SoireeVE);
  });
});
