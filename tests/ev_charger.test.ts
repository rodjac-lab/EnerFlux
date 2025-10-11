import { describe, expect, it } from 'vitest';

import { EVCharger, EVChargerParams } from '../src/devices/EVCharger';
import type { EnvContext } from '../src/devices/Device';

const buildCtx = (hour: number): EnvContext => ({
  pv_kW: 0,
  baseLoad_kW: 0,
  time_s: hour * 3600
});

describe('EVCharger', () => {
  it('requests energy within the session window and catches up before departure', () => {
    const params: EVChargerParams = {
      maxPower_kW: 7,
      session: {
        arrivalHour: 18,
        departureHour: 7,
        energyNeed_kWh: 14
      }
    };
    const charger = new EVCharger('ev', 'Borne VE', params);
    const dt_s = 3600;

    // Before arrival: no request
    expect(charger.plan(dt_s, buildCtx(12)).request).toBeUndefined();
    const preArrivalState = charger.state();
    expect(preArrivalState.session_active).toBe(false);
    expect(preArrivalState.session_time_to_start_h).toBeCloseTo(6, 5);

    // At arrival: request full power
    const planAtArrival = charger.plan(dt_s, buildCtx(18));
    expect(planAtArrival.request?.maxAccept_kW).toBeCloseTo(params.maxPower_kW, 5);
    charger.apply(0, dt_s, buildCtx(18));
    const arrivalState = charger.state();
    expect(arrivalState.session_active).toBe(true);
    expect(arrivalState.session_time_remaining_h).toBeGreaterThan(0);

    // Keep requesting during the evening even if nothing is delivered
    for (let hour = 19; hour <= 22; hour += 1) {
      const plan = charger.plan(dt_s, buildCtx(hour));
      expect(plan.request?.maxAccept_kW).toBeCloseTo(params.maxPower_kW, 5);
      charger.apply(0, dt_s, buildCtx(hour));
    }

    // Early morning catch-up: still requests max power
    const planAtFive = charger.plan(dt_s, buildCtx(29));
    expect(planAtFive.request?.maxAccept_kW).toBeCloseTo(params.maxPower_kW, 5);
    charger.apply(params.maxPower_kW, dt_s, buildCtx(29));

    // Final hour before departure: priority becomes high and remaining energy is finalised
    const planAtSix = charger.plan(dt_s, buildCtx(30));
    expect(planAtSix.request?.priorityHint ?? 0).toBeGreaterThanOrEqual(90);
    charger.apply(params.maxPower_kW, dt_s, buildCtx(30));

    const state = charger.state();
    expect(state.energy_remaining_kWh).toBeLessThan(0.1);
    expect(state.charging).toBe(true);
    expect(state.session_time_remaining_h).toBeLessThanOrEqual(1);

    // After departure the session ends and no further request is issued
    const planAfterDeparture = charger.plan(dt_s, buildCtx(31));
    expect(planAfterDeparture.request).toBeUndefined();
    charger.apply(0, dt_s, buildCtx(31));
    expect(charger.state().session_active).toBe(false);
    expect(charger.state().session_time_to_start_h).toBeGreaterThan(10);

    // Next day, session restarts at the same arrival hour
    const nextDayPlan = charger.plan(dt_s, buildCtx(42));
    expect(nextDayPlan.request?.maxAccept_kW).toBeCloseTo(params.maxPower_kW, 5);
  });
});
