import { describe, expect, it } from 'vitest';

import { Heating, HeatingParams } from '../src/devices/Heating';
import type { EnvContext } from '../src/devices/Device';

const baseParams: HeatingParams = {
  maxPower_kW: 5,
  thermalCapacity_kWh_per_K: 2,
  lossCoeff_W_per_K: 200,
  ambientTemp_C: 15,
  comfortDay_C: 20,
  comfortNight_C: 18,
  dayStartHour: 6,
  nightStartHour: 22,
  hysteresis_K: 0.5,
  initialTemp_C: 18
};

const makeCtx = (time_s: number, ambient = baseParams.ambientTemp_C): EnvContext => ({
  pv_kW: 0,
  baseLoad_kW: 0,
  ambientTemp_C: ambient,
  time_s
});

describe('Heating device physics', () => {
  it('requests power when below threshold and reaches setpoint', () => {
    const heating = new Heating('heat', 'Chauffage', baseParams);
    const dt_s = 900; // 15 minutes
    const ctx = makeCtx(8 * 3600);

    const plan = heating.plan(dt_s, ctx);
    expect(plan.request?.need).toBe('toHeat');
    expect(plan.request?.maxAccept_kW ?? 0).toBeGreaterThan(0);

    heating.apply(plan.request!.maxAccept_kW, dt_s, ctx);
    const afterState = heating.state();
    expect(afterState.temp_C).toBeGreaterThan(baseParams.initialTemp_C);
    expect(afterState.target_C as number).toBeGreaterThanOrEqual(afterState.temp_C as number);
  });

  it('cools toward ambient when no power is delivered', () => {
    const heating = new Heating('heat', 'Chauffage', {
      ...baseParams,
      initialTemp_C: 21
    });
    const dt_s = 900;
    const ctx = makeCtx(3600);

    heating.plan(dt_s, ctx);
    const before = heating.state().temp_C as number;
    heating.apply(0, dt_s, ctx);
    const after = heating.state().temp_C as number;
    expect(after).toBeLessThan(before);
    expect(after).toBeGreaterThanOrEqual(baseParams.ambientTemp_C);
  });

  it('stops requesting once within hysteresis band', () => {
    const heating = new Heating('heat', 'Chauffage', {
      ...baseParams,
      initialTemp_C: 20.4
    });
    const dt_s = 900;
    const ctx = makeCtx(12 * 3600);
    const plan = heating.plan(dt_s, ctx);
    expect(plan.request).toBeUndefined();
  });
});
