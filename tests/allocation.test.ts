/**
 * allocation.test.ts
 *
 * Comprehensive test suite for priority-based power allocation utilities.
 *
 * Tests cover:
 * - Basic allocation scenarios (exact match, surplus, deficit)
 * - Edge cases (zero power, zero demands, empty order)
 * - Priority ordering (battery first vs ECS first)
 * - Real-world scenarios from EnerFlux simulations
 * - Helper functions (allocationsToMap, getTotalAllocated)
 *
 * Created: 2025-10-20
 * Part of: Mode 1 - Laboratoire Pédagogique refactoring (LOT 1)
 */

import {
  allocateByPriority,
  allocationsToMap,
  getTotalAllocated,
  type PowerDemand,
  type PowerAllocation
} from '../src/core/allocation';

describe('allocateByPriority', () => {
  describe('Basic allocation scenarios', () => {
    it('should allocate all available power when demands match exactly', () => {
      const available = 5.0;
      const demands: PowerDemand[] = [
        { id: 'battery', demand_kW: 3.0 },
        { id: 'ecs', demand_kW: 2.0 }
      ];
      const order = ['battery', 'ecs'];

      const result = allocateByPriority(available, demands, order);

      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({ id: 'battery', allocated_kW: 3.0 });
      expect(result[1]).toEqual({ id: 'ecs', allocated_kW: 2.0 });
      expect(getTotalAllocated(result)).toBeCloseTo(5.0);
    });

    it('should leave surplus when demands are less than available', () => {
      const available = 10.0;
      const demands: PowerDemand[] = [
        { id: 'battery', demand_kW: 3.0 },
        { id: 'ecs', demand_kW: 2.0 }
      ];
      const order = ['battery', 'ecs'];

      const result = allocateByPriority(available, demands, order);

      expect(result).toHaveLength(2);
      expect(getTotalAllocated(result)).toBeCloseTo(5.0);
      const surplus = available - getTotalAllocated(result);
      expect(surplus).toBeCloseTo(5.0);
    });

    it('should partially satisfy last device when power runs out', () => {
      const available = 4.0;
      const demands: PowerDemand[] = [
        { id: 'battery', demand_kW: 3.0 },
        { id: 'ecs', demand_kW: 3.0 }
      ];
      const order = ['battery', 'ecs'];

      const result = allocateByPriority(available, demands, order);

      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({ id: 'battery', allocated_kW: 3.0 });
      expect(result[1]).toEqual({ id: 'ecs', allocated_kW: 1.0 });
      expect(getTotalAllocated(result)).toBeCloseTo(4.0);
    });

    it('should not allocate to devices after power is exhausted', () => {
      const available = 2.0;
      const demands: PowerDemand[] = [
        { id: 'battery', demand_kW: 3.0 },
        { id: 'ecs', demand_kW: 3.0 },
        { id: 'heating', demand_kW: 2.0 }
      ];
      const order = ['battery', 'ecs', 'heating'];

      const result = allocateByPriority(available, demands, order);

      // All devices in order are included, but only battery gets power
      expect(result).toHaveLength(3);
      expect(result[0]).toEqual({ id: 'battery', allocated_kW: 2.0 });
      expect(result[1]).toEqual({ id: 'ecs', allocated_kW: 0 });
      expect(result[2]).toEqual({ id: 'heating', allocated_kW: 0 });
      expect(getTotalAllocated(result)).toBeCloseTo(2.0);
    });
  });

  describe('Priority order behavior', () => {
    it('should respect priority order: battery first strategy', () => {
      const available = 5.0;
      const demands: PowerDemand[] = [
        { id: 'battery', demand_kW: 3.0 },
        { id: 'ecs', demand_kW: 3.0 }
      ];
      const order = ['battery', 'ecs'];

      const result = allocateByPriority(available, demands, order);

      expect(result[0].id).toBe('battery');
      expect(result[0].allocated_kW).toBeCloseTo(3.0);
      expect(result[1].id).toBe('ecs');
      expect(result[1].allocated_kW).toBeCloseTo(2.0);
    });

    it('should respect priority order: ecs first strategy', () => {
      const available = 5.0;
      const demands: PowerDemand[] = [
        { id: 'battery', demand_kW: 3.0 },
        { id: 'ecs', demand_kW: 3.0 }
      ];
      const order = ['ecs', 'battery'];

      const result = allocateByPriority(available, demands, order);

      expect(result[0].id).toBe('ecs');
      expect(result[0].allocated_kW).toBeCloseTo(3.0);
      expect(result[1].id).toBe('battery');
      expect(result[1].allocated_kW).toBeCloseTo(2.0);
    });

    it('should only allocate to devices in priority order', () => {
      const available = 10.0;
      const demands: PowerDemand[] = [
        { id: 'battery', demand_kW: 3.0 },
        { id: 'ecs', demand_kW: 2.0 },
        { id: 'heating', demand_kW: 2.0 }
      ];
      const order = ['battery', 'ecs']; // heating not in order

      const result = allocateByPriority(available, demands, order);

      expect(result).toHaveLength(2);
      expect(result.find(a => a.id === 'heating')).toBeUndefined();
      expect(getTotalAllocated(result)).toBeCloseTo(5.0);
    });

    it('should ignore devices in order that have no demand', () => {
      const available = 5.0;
      const demands: PowerDemand[] = [
        { id: 'battery', demand_kW: 3.0 }
      ];
      const order = ['battery', 'ecs', 'heating']; // ecs and heating not in demands

      const result = allocateByPriority(available, demands, order);

      expect(result).toHaveLength(3);
      expect(result[0]).toEqual({ id: 'battery', allocated_kW: 3.0 });
      expect(result[1]).toEqual({ id: 'ecs', allocated_kW: 0 });
      expect(result[2]).toEqual({ id: 'heating', allocated_kW: 0 });
    });
  });

  describe('Edge cases', () => {
    it('should handle zero available power', () => {
      const available = 0;
      const demands: PowerDemand[] = [
        { id: 'battery', demand_kW: 3.0 },
        { id: 'ecs', demand_kW: 2.0 }
      ];
      const order = ['battery', 'ecs'];

      const result = allocateByPriority(available, demands, order);

      expect(result).toHaveLength(2); // All devices in order
      expect(result[0]).toEqual({ id: 'battery', allocated_kW: 0 });
      expect(result[1]).toEqual({ id: 'ecs', allocated_kW: 0 });
      expect(getTotalAllocated(result)).toBe(0);
    });

    it('should handle empty demands array', () => {
      const available = 5.0;
      const demands: PowerDemand[] = [];
      const order = ['battery', 'ecs'];

      const result = allocateByPriority(available, demands, order);

      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({ id: 'battery', allocated_kW: 0 });
      expect(result[1]).toEqual({ id: 'ecs', allocated_kW: 0 });
      expect(getTotalAllocated(result)).toBe(0);
    });

    it('should handle empty priority order', () => {
      const available = 5.0;
      const demands: PowerDemand[] = [
        { id: 'battery', demand_kW: 3.0 },
        { id: 'ecs', demand_kW: 2.0 }
      ];
      const order: string[] = [];

      const result = allocateByPriority(available, demands, order);

      expect(result).toHaveLength(0);
      expect(getTotalAllocated(result)).toBe(0);
    });

    it('should skip demands with zero or negative demand_kW', () => {
      const available = 5.0;
      const demands: PowerDemand[] = [
        { id: 'battery', demand_kW: 3.0 },
        { id: 'ecs', demand_kW: 0 },
        { id: 'heating', demand_kW: -1.0 }
      ];
      const order = ['battery', 'ecs', 'heating'];

      const result = allocateByPriority(available, demands, order);

      expect(result).toHaveLength(3);
      expect(result[0]).toEqual({ id: 'battery', allocated_kW: 3.0 });
      expect(result[1]).toEqual({ id: 'ecs', allocated_kW: 0 });
      expect(result[2]).toEqual({ id: 'heating', allocated_kW: 0 });
    });

    it('should throw error for negative available power', () => {
      const available = -5.0;
      const demands: PowerDemand[] = [
        { id: 'battery', demand_kW: 3.0 }
      ];
      const order = ['battery'];

      expect(() => allocateByPriority(available, demands, order)).toThrow(
        'allocateByPriority: available_kW must be >= 0'
      );
    });

    it('should handle very small power values (floating point)', () => {
      const available = 0.001;
      const demands: PowerDemand[] = [
        { id: 'battery', demand_kW: 0.0005 },
        { id: 'ecs', demand_kW: 0.0006 }
      ];
      const order = ['battery', 'ecs'];

      const result = allocateByPriority(available, demands, order);

      expect(result).toHaveLength(2);
      expect(result[0].allocated_kW).toBeCloseTo(0.0005, 5);
      expect(result[1].allocated_kW).toBeCloseTo(0.0005, 5);
    });
  });

  describe('Real-world scenarios', () => {
    it('should handle typical morning scenario: 3kW surplus, battery and ecs', () => {
      const available = 3.2;
      const demands: PowerDemand[] = [
        { id: 'battery', demand_kW: 5.0 }, // Battery wants 5kW
        { id: 'ecs', demand_kW: 3.0 }       // ECS wants 3kW
      ];

      // Test battery_first strategy
      const batteryFirst = allocateByPriority(available, demands, ['battery', 'ecs']);
      expect(batteryFirst[0]).toEqual({ id: 'battery', allocated_kW: 3.2 });
      expect(batteryFirst[1]).toEqual({ id: 'ecs', allocated_kW: 0 });

      // Test ecs_first strategy
      const ecsFirst = allocateByPriority(available, demands, ['ecs', 'battery']);
      expect(ecsFirst[0]).toEqual({ id: 'ecs', allocated_kW: 3.0 });
      expect(ecsFirst[1].id).toBe('battery');
      expect(ecsFirst[1].allocated_kW).toBeCloseTo(0.2);
    });

    it('should handle multi-device scenario: battery, ecs, heating, pool, ev', () => {
      const available = 8.0;
      const demands: PowerDemand[] = [
        { id: 'battery', demand_kW: 3.0 },
        { id: 'ecs', demand_kW: 3.0 },
        { id: 'heating', demand_kW: 2.0 },
        { id: 'pool', demand_kW: 1.5 },
        { id: 'ev', demand_kW: 7.0 }
      ];
      const order = ['ecs', 'battery', 'heating', 'pool', 'ev'];

      const result = allocateByPriority(available, demands, order);

      expect(result).toHaveLength(5); // All devices in order
      expect(result[0]).toEqual({ id: 'ecs', allocated_kW: 3.0 });
      expect(result[1]).toEqual({ id: 'battery', allocated_kW: 3.0 });
      expect(result[2]).toEqual({ id: 'heating', allocated_kW: 2.0 });
      expect(result[3]).toEqual({ id: 'pool', allocated_kW: 0 }); // No power left
      expect(result[4]).toEqual({ id: 'ev', allocated_kW: 0 }); // No power left
      expect(getTotalAllocated(result)).toBeCloseTo(8.0);
    });

    it('should handle thermal_first strategy: heating and ecs before battery', () => {
      const available = 6.0;
      const demands: PowerDemand[] = [
        { id: 'heating', demand_kW: 2.0 },
        { id: 'ecs', demand_kW: 3.0 },
        { id: 'battery', demand_kW: 5.0 }
      ];
      const order = ['heating', 'ecs', 'battery'];

      const result = allocateByPriority(available, demands, order);

      expect(result).toHaveLength(3);
      expect(result[0]).toEqual({ id: 'heating', allocated_kW: 2.0 });
      expect(result[1]).toEqual({ id: 'ecs', allocated_kW: 3.0 });
      expect(result[2]).toEqual({ id: 'battery', allocated_kW: 1.0 });
    });

    it('should demonstrate strategy comparison: same demands, different order', () => {
      const available = 4.0;
      const demands: PowerDemand[] = [
        { id: 'battery', demand_kW: 3.0 },
        { id: 'ecs', demand_kW: 3.0 }
      ];

      const strategyA = allocateByPriority(available, demands, ['ecs', 'battery']);
      const strategyB = allocateByPriority(available, demands, ['battery', 'ecs']);

      // Strategy A (ecs_first): ECS gets 3kW, battery gets 1kW
      expect(strategyA[0]).toEqual({ id: 'ecs', allocated_kW: 3.0 });
      expect(strategyA[1]).toEqual({ id: 'battery', allocated_kW: 1.0 });

      // Strategy B (battery_first): Battery gets 3kW, ECS gets 1kW
      expect(strategyB[0]).toEqual({ id: 'battery', allocated_kW: 3.0 });
      expect(strategyB[1]).toEqual({ id: 'ecs', allocated_kW: 1.0 });

      // Different outcomes! Strategy A gives more to ECS, Strategy B gives more to battery
      const ecsInA = strategyA.find(a => a.id === 'ecs')!.allocated_kW;
      const ecsInB = strategyB.find(a => a.id === 'ecs')!.allocated_kW;
      expect(ecsInA).toBeGreaterThan(ecsInB);
    });
  });

  describe('Helper functions', () => {
    describe('allocationsToMap', () => {
      it('should convert allocations array to Map', () => {
        const allocations: PowerAllocation[] = [
          { id: 'battery', allocated_kW: 3.0 },
          { id: 'ecs', allocated_kW: 2.0 }
        ];

        const map = allocationsToMap(allocations);

        expect(map.size).toBe(2);
        expect(map.get('battery')).toBe(3.0);
        expect(map.get('ecs')).toBe(2.0);
        expect(map.get('heating')).toBeUndefined();
      });

      it('should handle empty allocations array', () => {
        const allocations: PowerAllocation[] = [];
        const map = allocationsToMap(allocations);

        expect(map.size).toBe(0);
      });

      it('should allow easy lookup for unallocated devices', () => {
        const allocations: PowerAllocation[] = [
          { id: 'battery', allocated_kW: 3.0 }
        ];

        const map = allocationsToMap(allocations);
        const ecsPower = map.get('ecs') ?? 0; // Use default value pattern

        expect(ecsPower).toBe(0);
      });
    });

    describe('getTotalAllocated', () => {
      it('should sum all allocated power', () => {
        const allocations: PowerAllocation[] = [
          { id: 'battery', allocated_kW: 3.0 },
          { id: 'ecs', allocated_kW: 2.5 },
          { id: 'heating', allocated_kW: 1.2 }
        ];

        const total = getTotalAllocated(allocations);

        expect(total).toBeCloseTo(6.7);
      });

      it('should return 0 for empty allocations', () => {
        const allocations: PowerAllocation[] = [];
        const total = getTotalAllocated(allocations);

        expect(total).toBe(0);
      });

      it('should handle zero allocations', () => {
        const allocations: PowerAllocation[] = [
          { id: 'battery', allocated_kW: 0 },
          { id: 'ecs', allocated_kW: 0 }
        ];

        const total = getTotalAllocated(allocations);

        expect(total).toBe(0);
      });
    });
  });

  describe('Deterministic behavior', () => {
    it('should produce identical results for same inputs', () => {
      const available = 5.0;
      const demands: PowerDemand[] = [
        { id: 'battery', demand_kW: 3.0 },
        { id: 'ecs', demand_kW: 3.0 }
      ];
      const order = ['battery', 'ecs'];

      const result1 = allocateByPriority(available, demands, order);
      const result2 = allocateByPriority(available, demands, order);

      expect(result1).toEqual(result2);
    });

    it('should not mutate input arrays', () => {
      const available = 5.0;
      const demands: PowerDemand[] = [
        { id: 'battery', demand_kW: 3.0 },
        { id: 'ecs', demand_kW: 2.0 }
      ];
      const order = ['battery', 'ecs'];

      const demandsCopy = JSON.parse(JSON.stringify(demands));
      const orderCopy = [...order];

      allocateByPriority(available, demands, order);

      expect(demands).toEqual(demandsCopy);
      expect(order).toEqual(orderCopy);
    });
  });
});
