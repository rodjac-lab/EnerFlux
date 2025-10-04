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
  });
});
