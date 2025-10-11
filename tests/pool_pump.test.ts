import { describe, expect, it } from 'vitest';

import { PoolPump, PoolPumpParams } from '../src/devices/PoolPump';
import type { EnvContext } from '../src/devices/Device';

const buildCtx = (timeHour: number): EnvContext => ({
  pv_kW: 0,
  baseLoad_kW: 0,
  time_s: timeHour * 3600
});

describe('PoolPump', () => {
  it('honours preferred window and catch-up logic', () => {
    const params: PoolPumpParams = {
      power_kW: 1.5,
      minHoursPerDay: 4,
      preferredWindows: [{ startHour: 10, endHour: 14 }],
      catchUpStartHour: 18
    };
    const pump = new PoolPump('pool', 'Pompe', params);
    const dt_s = 3600;

    // Before preferred window: no request
    let ctx = buildCtx(8);
    expect(pump.plan(dt_s, ctx).request).toBeUndefined();
    pump.apply(0, dt_s, ctx);

    // Within window: requests full power until target hours reached
    for (let hour = 10; hour < 14; hour += 1) {
      ctx = buildCtx(hour);
      const plan = pump.plan(dt_s, ctx);
      expect(plan.request?.maxAccept_kW).toBeCloseTo(params.power_kW);
      pump.apply(plan.request!.maxAccept_kW, dt_s, ctx);
    }

    const stateAfterWindow = pump.state();
    expect(stateAfterWindow.hours_run).toBeCloseTo(4, 3);

    // Additional request outside window after target met -> none
    ctx = buildCtx(15);
    expect(pump.plan(dt_s, ctx).request).toBeUndefined();
    pump.apply(0, dt_s, ctx);

    // New day resets runtime
    ctx = buildCtx(26);
    pump.plan(dt_s, ctx);
    pump.apply(0, dt_s, ctx);
    expect(pump.state().hours_run).toBeCloseTo(0, 3);

    // If behind schedule after catch-up hour, it should request
    // Simulate only 1 hour run earlier in day
    ctx = buildCtx(10);
    const catchupPlan = pump.plan(dt_s, ctx);
    pump.apply(catchupPlan.request!.maxAccept_kW, dt_s, ctx);
    expect(pump.state().hours_run).toBeCloseTo(1, 3);

    // At 17h (before catch-up hour) still within preferred window -> no request if already outside window
    ctx = buildCtx(17);
    expect(pump.plan(dt_s, ctx).request).toBeUndefined();
    pump.apply(0, dt_s, ctx);

    // At 19h (after catch-up start) it should request to finish remaining hours
    ctx = buildCtx(19);
    const latePlan = pump.plan(dt_s, ctx);
    expect(latePlan.request?.maxAccept_kW).toBeCloseTo(params.power_kW);
  });
});
