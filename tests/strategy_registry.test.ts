import { describe, expect, it } from 'vitest';
import {
  resolveStrategy,
  ecsFirstStrategy,
  type Strategy,
  type StrategyContext,
  type StrategyRequest
} from '../src/core/strategy';
import type { Device } from '../src/devices/Device';
import { defaultEcsServiceContract } from '../src/data/ecs-service';
import { resolveEcsServiceForStrategy } from '../src/workers/strategy-contract';

const createDevice = (id: string, capabilities: Device['capabilities'][number][]): Device => ({
  id,
  label: id,
  capabilities,
  plan: () => ({}),
  apply: () => {},
  state: () => ({})
});

const createContext = (options?: { hour?: number; batterySocPercent?: number }): StrategyContext => {
  const hour = options?.hour ?? 12;
  const batterySocPercent = options?.batterySocPercent ?? 40;
  const ecsDevice = createDevice('ecs', ['thermal-storage']);
  const batteryDevice = createDevice('battery', ['electrical-storage']);
  const requests: StrategyRequest[] = [
    {
      device: ecsDevice,
      request: { maxAccept_kW: 3, need: 'toHeat' },
      state: {}
    },
    {
      device: batteryDevice,
      request: { maxAccept_kW: 4, need: 'toStore' },
      state: { soc_percent: batterySocPercent }
    }
  ];
  return {
    surplus_kW: 5,
    requests,
    time_s: hour * 3600,
    dt_s: 900
  };
};

const createContextWithEv = (
  options?: {
    hour?: number;
    batterySocPercent?: number;
    surplus_kW?: number;
    evState?: Partial<Record<string, number | boolean>>;
    evMaxAccept_kW?: number;
  }
): StrategyContext => {
  const hour = options?.hour ?? 12;
  const ecsDevice = createDevice('ecs', ['thermal-storage']);
  const batteryDevice = createDevice('battery', ['electrical-storage']);
  const evDevice = createDevice('ev', ['vehicle-charger']);
  const batterySocPercent = options?.batterySocPercent ?? 45;
  const baseEvState: Record<string, number | boolean> = {
    session_active: false,
    session_time_remaining_h: 0,
    session_time_to_start_h: Number.POSITIVE_INFINITY,
    energy_remaining_kWh: 0
  };
  const evState = { ...baseEvState, ...(options?.evState ?? {}) };
  const requests: StrategyRequest[] = [
    {
      device: ecsDevice,
      request: { maxAccept_kW: 3, need: 'toHeat' },
      state: {}
    },
    {
      device: batteryDevice,
      request: { maxAccept_kW: 5, need: 'toStore' },
      state: { soc_percent: batterySocPercent }
    },
    {
      device: evDevice,
      request: { maxAccept_kW: options?.evMaxAccept_kW ?? 7, need: 'toLoad' },
      state: evState
    }
  ];
  return {
    surplus_kW: options?.surplus_kW ?? 6,
    requests,
    time_s: hour * 3600,
    dt_s: 900
  };
};

const getFirstAllocationDevice = (strategy: Strategy, context: StrategyContext): string | undefined => {
  const allocations = strategy(context);
  return allocations[0]?.deviceId;
};

describe('strategy registry', () => {
  it('maps ecs_hysteresis to ecs_first ordering logic', () => {
    const context = createContext();
    const reference = getFirstAllocationDevice(ecsFirstStrategy, context);
    const resolved = getFirstAllocationDevice(resolveStrategy('ecs_hysteresis'), context);
    expect(resolved).toBe(reference);
  });

  it('maps deadline_helper to ecs_first ordering logic', () => {
    const context = createContext();
    const reference = getFirstAllocationDevice(ecsFirstStrategy, context);
    const resolved = getFirstAllocationDevice(resolveStrategy('deadline_helper'), context);
    expect(resolved).toBe(reference);
  });

  it('prioritises battery reserve before evening when SOC is low', () => {
    const context = createContext({ hour: 10, batterySocPercent: 35 });
    const resolved = getFirstAllocationDevice(resolveStrategy('reserve_evening'), context);
    expect(resolved).toBe('battery');
  });

  it('releases reserve to ECS after evening window or once SOC is healthy', () => {
    const eveningContext = createContext({ hour: 20, batterySocPercent: 45 });
    const middayWithReserve = createContext({ hour: 13, batterySocPercent: 75 });
    const strategy = resolveStrategy('reserve_evening');
    expect(getFirstAllocationDevice(strategy, eveningContext)).toBe('ecs');
    expect(getFirstAllocationDevice(strategy, middayWithReserve)).toBe('ecs');
  });

  it('derives ECS service helpers per strategy without mutating base contract', () => {
    const base = defaultEcsServiceContract();
    base.helpers.hysteresisEnabled = false;
    base.helpers.deadlineEnabled = false;

    const ecsFirstContract = resolveEcsServiceForStrategy(base, 'ecs_first');
    const hysteresisContract = resolveEcsServiceForStrategy(base, 'ecs_hysteresis');
    const deadlineContract = resolveEcsServiceForStrategy(base, 'deadline_helper');
    const reserveEveningContract = resolveEcsServiceForStrategy(base, 'reserve_evening');
    const evGuardContract = resolveEcsServiceForStrategy(base, 'ev_departure_guard');

    expect(base.helpers.hysteresisEnabled).toBe(false);
    expect(base.helpers.deadlineEnabled).toBe(false);

    expect(ecsFirstContract.helpers.hysteresisEnabled).toBe(false);
    expect(ecsFirstContract.helpers.deadlineEnabled).toBe(false);

    expect(hysteresisContract.helpers.hysteresisEnabled).toBe(true);
    expect(hysteresisContract.helpers.deadlineEnabled).toBe(false);

    expect(deadlineContract.helpers.hysteresisEnabled).toBe(true);
    expect(deadlineContract.helpers.deadlineEnabled).toBe(true);
    expect(reserveEveningContract.helpers.hysteresisEnabled).toBe(true);
    expect(reserveEveningContract.helpers.deadlineEnabled).toBe(false);
    expect(evGuardContract.helpers.hysteresisEnabled).toBe(true);
    expect(evGuardContract.helpers.deadlineEnabled).toBe(false);
  });

  it('builds a battery reserve when an EV session is approaching', () => {
    const context = createContextWithEv({
      hour: 14,
      batterySocPercent: 48,
      evState: { session_time_to_start_h: 3, energy_remaining_kWh: 18 }
    });
    const first = getFirstAllocationDevice(resolveStrategy('ev_departure_guard'), context);
    expect(first).toBe('battery');
  });

  it('prioritises EV charging when the departure window becomes tight', () => {
    const context = createContextWithEv({
      hour: 20,
      batterySocPercent: 80,
      evState: { session_active: true, session_time_remaining_h: 1, energy_remaining_kWh: 6 },
      evMaxAccept_kW: 7
    });
    const first = getFirstAllocationDevice(resolveStrategy('ev_departure_guard'), context);
    expect(first).toBe('ev');
  });
});
