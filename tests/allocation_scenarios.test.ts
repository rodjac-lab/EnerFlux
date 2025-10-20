/**
 * allocation_scenarios.test.ts
 *
 * Validation tests using real-world EnerFlux simulation scenarios.
 * These tests verify that allocateByPriority produces expected results
 * for scenarios documented in the refactoring plan.
 *
 * Created: 2025-10-20
 * Part of: Mode 1 - Laboratoire Pédagogique refactoring (LOT 1)
 */

import { describe, it, expect } from 'vitest';
import { allocateByPriority, allocationsToMap, getTotalAllocated } from '../src/core/allocation';

describe('EnerFlux Real-World Scenarios', () => {
  describe('Scenario from refactoring_plan_mode_laboratoire.md', () => {
    it('should demonstrate ECS first vs Battery first (Example 1)', () => {
      // Scenario: 5 kW PV surplus available
      // Battery wants 3 kW (not full)
      // ECS wants 3 kW (water below target)
      const available = 5.0;
      const demands = [
        { id: 'battery', demand_kW: 3.0 },
        { id: 'ecs', demand_kW: 3.0 }
      ];

      // Strategy A: ECS First
      const ecsFirstOrder = ['ecs', 'battery'];
      const resultA = allocateByPriority(available, demands, ecsFirstOrder);
      const mapA = allocationsToMap(resultA);

      expect(mapA.get('ecs')).toBe(3.0); // ECS gets full 3 kW
      expect(mapA.get('battery')).toBe(2.0); // Battery gets remaining 2 kW
      expect(getTotalAllocated(resultA)).toBe(5.0);

      // Strategy B: Battery First
      const batteryFirstOrder = ['battery', 'ecs'];
      const resultB = allocateByPriority(available, demands, batteryFirstOrder);
      const mapB = allocationsToMap(resultB);

      expect(mapB.get('battery')).toBe(3.0); // Battery gets full 3 kW
      expect(mapB.get('ecs')).toBe(2.0); // ECS gets remaining 2 kW
      expect(getTotalAllocated(resultB)).toBe(5.0);

      // Verify strategies produce different outcomes
      expect(mapA.get('ecs')).toBeGreaterThan(mapB.get('ecs')!);
      expect(mapB.get('battery')).toBeGreaterThan(mapA.get('battery')!);
    });

    it('should demonstrate no_control strategy (no allocation)', () => {
      // Scenario: 5 kW surplus, but no_control strategy doesn't allocate
      const available = 5.0;
      const demands = [
        { id: 'battery', demand_kW: 3.0 },
        { id: 'ecs', demand_kW: 3.0 }
      ];

      // no_control strategy: empty priority order
      const noControlOrder: string[] = [];
      const result = allocateByPriority(available, demands, noControlOrder);

      expect(result).toHaveLength(0);
      expect(getTotalAllocated(result)).toBe(0);
      // All 5 kW goes to grid export
    });

    it('should handle thermal_first strategy (heating + ECS before battery)', () => {
      // Scenario: Winter day with multiple thermal loads
      const available = 8.0;
      const demands = [
        { id: 'heating', demand_kW: 2.5 },
        { id: 'ecs', demand_kW: 3.0 },
        { id: 'battery', demand_kW: 5.0 },
        { id: 'pool', demand_kW: 1.5 }
      ];

      // thermal_first: heating, ecs, pool, then battery
      const thermalFirstOrder = ['heating', 'ecs', 'pool', 'battery'];
      const result = allocateByPriority(available, demands, thermalFirstOrder);
      const map = allocationsToMap(result);

      expect(map.get('heating')).toBe(2.5);
      expect(map.get('ecs')).toBe(3.0);
      expect(map.get('pool')).toBe(1.5);
      expect(map.get('battery')).toBe(1.0); // Gets remaining
      expect(getTotalAllocated(result)).toBe(8.0);
    });

    it('should handle comfort_first strategy (complex priority)', () => {
      // Scenario: Prioritize comfort (heating, DHW) over storage
      const available = 6.0;
      const demands = [
        { id: 'heating', demand_kW: 2.0 },
        { id: 'ecs', demand_kW: 3.0 },
        { id: 'pool', demand_kW: 1.5 },
        { id: 'battery', demand_kW: 5.0 },
        { id: 'ev', demand_kW: 7.0 }
      ];

      // comfort_first: heating, ecs, ev (if home), pool, battery
      const comfortFirstOrder = ['heating', 'ecs', 'ev', 'pool', 'battery'];
      const result = allocateByPriority(available, demands, comfortFirstOrder);
      const map = allocationsToMap(result);

      expect(map.get('heating')).toBe(2.0);
      expect(map.get('ecs')).toBe(3.0);
      expect(map.get('ev')).toBe(1.0); // Gets remaining
      expect(map.get('pool')).toBe(0);
      expect(map.get('battery')).toBe(0);
      expect(getTotalAllocated(result)).toBe(6.0);
    });
  });

  describe('Morning solar production scenarios', () => {
    it('should handle morning ramp-up: small surplus, multiple demands', () => {
      // 8am: Solar starting, only 1.5 kW surplus
      const available = 1.5;
      const demands = [
        { id: 'battery', demand_kW: 5.0 }, // Battery mostly empty
        { id: 'ecs', demand_kW: 3.0 }, // Water cold from night
        { id: 'heating', demand_kW: 1.0 } // Light heating needed
      ];

      // Test different strategies
      const batteryFirst = allocateByPriority(available, demands, ['battery', 'ecs', 'heating']);
      const ecsFirst = allocateByPriority(available, demands, ['ecs', 'battery', 'heating']);

      // Battery first: all to battery
      expect(allocationsToMap(batteryFirst).get('battery')).toBe(1.5);
      expect(getTotalAllocated(batteryFirst)).toBe(1.5);

      // ECS first: all to ECS
      expect(allocationsToMap(ecsFirst).get('ecs')).toBe(1.5);
      expect(getTotalAllocated(ecsFirst)).toBe(1.5);
    });

    it('should handle midday peak: large surplus, all demands satisfied', () => {
      // 12pm: Solar peak, 10 kW surplus
      const available = 10.0;
      const demands = [
        { id: 'battery', demand_kW: 3.0 },
        { id: 'ecs', demand_kW: 2.0 }, // Almost at target
        { id: 'pool', demand_kW: 1.5 }
      ];

      const result = allocateByPriority(available, demands, ['ecs', 'battery', 'pool']);
      const map = allocationsToMap(result);

      // All demands satisfied
      expect(map.get('ecs')).toBe(2.0);
      expect(map.get('battery')).toBe(3.0);
      expect(map.get('pool')).toBe(1.5);
      expect(getTotalAllocated(result)).toBe(6.5);
      // 3.5 kW surplus goes to grid
    });
  });

  describe('Evening scenarios', () => {
    it('should handle evening: no PV, battery discharging', () => {
      // 8pm: No PV, battery could provide power
      // Note: allocateByPriority is for PV surplus allocation
      // Battery discharge is handled separately in engine
      const available = 0; // No PV
      const demands = [
        { id: 'ecs', demand_kW: 3.0 } // Deadline approaching
      ];

      const result = allocateByPriority(available, demands, ['ecs']);

      // No allocation (no PV)
      expect(getTotalAllocated(result)).toBe(0);
      // ECS would need grid or battery power (handled by engine offer/request)
    });
  });

  describe('Edge cases from real simulations', () => {
    it('should handle floating point precision in power allocation', () => {
      // Real scenario: 3.2 kW available, demands that don't divide evenly
      const available = 3.2;
      const demands = [
        { id: 'battery', demand_kW: 3.333 },
        { id: 'ecs', demand_kW: 2.857 }
      ];

      const result = allocateByPriority(available, demands, ['battery', 'ecs']);
      const map = allocationsToMap(result);

      expect(map.get('battery')).toBeCloseTo(3.2, 6);
      expect(map.get('ecs')).toBe(0);
      expect(getTotalAllocated(result)).toBeCloseTo(3.2, 6);
    });

    it('should handle demand exactly matching available power', () => {
      const available = 5.0;
      const demands = [
        { id: 'battery', demand_kW: 2.0 },
        { id: 'ecs', demand_kW: 3.0 }
      ];

      const result = allocateByPriority(available, demands, ['battery', 'ecs']);

      expect(allocationsToMap(result).get('battery')).toBe(2.0);
      expect(allocationsToMap(result).get('ecs')).toBe(3.0);
      expect(getTotalAllocated(result)).toBe(5.0);
    });

    it('should handle very small surplus (0.1 kW)', () => {
      const available = 0.1;
      const demands = [
        { id: 'battery', demand_kW: 5.0 },
        { id: 'ecs', demand_kW: 3.0 }
      ];

      const result = allocateByPriority(available, demands, ['battery', 'ecs']);

      expect(allocationsToMap(result).get('battery')).toBeCloseTo(0.1);
      expect(allocationsToMap(result).get('ecs')).toBe(0);
    });
  });

  describe('Strategy comparison for visualization', () => {
    it('should show clear difference between strategies for UI comparison', () => {
      // This is what the UI will visualize in A/B comparison
      const available = 5.0;
      const demands = [
        { id: 'battery', demand_kW: 4.0 },
        { id: 'ecs', demand_kW: 4.0 }
      ];

      const strategies = {
        ecs_first: ['ecs', 'battery'],
        battery_first: ['battery', 'ecs'],
        no_control: [] as string[]
      };

      const results = {
        ecs_first: allocateByPriority(available, demands, strategies.ecs_first),
        battery_first: allocateByPriority(available, demands, strategies.battery_first),
        no_control: allocateByPriority(available, demands, strategies.no_control)
      };

      // ECS First Strategy
      const ecsFirstMap = allocationsToMap(results.ecs_first);
      expect(ecsFirstMap.get('ecs')).toBe(4.0);
      expect(ecsFirstMap.get('battery')).toBe(1.0);

      // Battery First Strategy
      const batteryFirstMap = allocationsToMap(results.battery_first);
      expect(batteryFirstMap.get('battery')).toBe(4.0);
      expect(batteryFirstMap.get('ecs')).toBe(1.0);

      // No Control Strategy
      expect(getTotalAllocated(results.no_control)).toBe(0);

      // Verify strategies produce significantly different outcomes
      const ecsDifference = Math.abs(ecsFirstMap.get('ecs')! - batteryFirstMap.get('ecs')!);
      expect(ecsDifference).toBeGreaterThan(2.0); // 3 kW difference
    });
  });
});
