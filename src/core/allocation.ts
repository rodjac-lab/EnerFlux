/**
 * allocation.ts
 *
 * Generic priority-based power allocation utilities for EnerFlux.
 *
 * This module provides the core allocation logic that allows strategies to define
 * the order in which available power (PV surplus) is distributed to different consumers.
 *
 * Created: 2025-10-20
 * Part of: Mode 1 - Laboratoire Pédagogique refactoring (LOT 1)
 */

/**
 * Represents a power demand from a device or consumer.
 */
export interface PowerDemand {
  /** Unique identifier for the device/consumer */
  id: string;
  /** Maximum power this device can accept (kW) */
  demand_kW: number;
}

/**
 * Result of power allocation for a single device.
 */
export interface PowerAllocation {
  /** Device identifier */
  id: string;
  /** Power allocated to this device (kW) */
  allocated_kW: number;
}

/**
 * Allocates available power to devices following a strict priority order.
 *
 * This is the core allocation function for Mode 1 (Laboratoire Pédagogique).
 * It implements a simple waterfall/cascade allocation:
 * - Devices are served in the order specified by `priorityOrder`
 * - Each device gets up to its maximum demand (demand_kW)
 * - Allocation stops when available power is exhausted
 *
 * **Key characteristics:**
 * - **Greedy algorithm**: First device in order gets full demand before second device gets anything
 * - **No partial reallocation**: Once allocated, power is not redistributed
 * - **Deterministic**: Same inputs always produce same output
 *
 * **Use cases:**
 * - Strategy-controlled PV surplus allocation (replacing fixed waterfall in engine.ts)
 * - Comparing different allocation orders (e.g., "battery_first" vs "ecs_first")
 * - Educational/pedagogical visualization of energy management strategies
 *
 * @param available_kW - Total power available for allocation (kW). Must be >= 0.
 * @param demands - Array of power demands from devices. Demands with demand_kW <= 0 are skipped.
 * @param priorityOrder - Ordered list of device IDs defining allocation priority.
 *                        Devices not in this list will not receive any allocation.
 *                        Devices in this list but not in `demands` are safely ignored.
 *
 * @returns Array of allocations showing how much power each device received.
 *          Devices that received 0 power are included with allocated_kW = 0.
 *          Devices not in priorityOrder are not included in results.
 *
 * @example
 * ```typescript
 * const available = 5.0; // 5 kW available
 * const demands = [
 *   { id: 'battery', demand_kW: 3.0 },
 *   { id: 'ecs', demand_kW: 3.0 },
 *   { id: 'heating', demand_kW: 2.0 }
 * ];
 *
 * // Scenario 1: Battery first
 * const order1 = ['battery', 'ecs', 'heating'];
 * const result1 = allocateByPriority(available, demands, order1);
 * // Result: battery=3.0, ecs=2.0, heating=0.0
 *
 * // Scenario 2: ECS first
 * const order2 = ['ecs', 'battery', 'heating'];
 * const result2 = allocateByPriority(available, demands, order2);
 * // Result: ecs=3.0, battery=2.0, heating=0.0
 * ```
 *
 * @see https://github.com/rodjac-lab/EnerFlux/blob/main/Docs/refactoring_plan_mode_laboratoire.md
 */
export function allocateByPriority(
  available_kW: number,
  demands: PowerDemand[],
  priorityOrder: string[]
): PowerAllocation[] {
  // Input validation
  if (available_kW < 0) {
    throw new Error(`allocateByPriority: available_kW must be >= 0, got ${available_kW}`);
  }

  // Create a map for O(1) demand lookup
  const demandMap = new Map<string, number>();
  for (const demand of demands) {
    if (demand.demand_kW > 0) {
      demandMap.set(demand.id, demand.demand_kW);
    }
  }

  // Allocate power following priority order
  const allocations: PowerAllocation[] = [];
  let remaining_kW = available_kW;

  for (const deviceId of priorityOrder) {
    // Get demand for this device (0 if not found)
    const demand_kW = demandMap.get(deviceId) ?? 0;

    // Calculate allocation (limited by both demand and remaining power)
    const allocated_kW = Math.min(demand_kW, remaining_kW);

    // Record allocation
    allocations.push({
      id: deviceId,
      allocated_kW
    });

    // Update remaining power
    remaining_kW -= allocated_kW;

    // Clamp to 0 to handle floating point errors
    if (remaining_kW < 1e-9) {
      remaining_kW = 0;
    }
  }

  return allocations;
}

/**
 * Helper function to convert allocations array to a Map for easier lookup.
 *
 * @param allocations - Array of allocations from allocateByPriority
 * @returns Map from device ID to allocated power (kW)
 *
 * @example
 * ```typescript
 * const allocations = allocateByPriority(available, demands, order);
 * const allocationMap = allocationsToMap(allocations);
 * const batteryPower = allocationMap.get('battery') ?? 0;
 * ```
 */
export function allocationsToMap(allocations: PowerAllocation[]): Map<string, number> {
  return new Map(allocations.map(a => [a.id, a.allocated_kW]));
}

/**
 * Helper function to get total allocated power from allocations.
 *
 * @param allocations - Array of allocations from allocateByPriority
 * @returns Total power allocated across all devices (kW)
 *
 * @example
 * ```typescript
 * const allocations = allocateByPriority(available, demands, order);
 * const totalAllocated = getTotalAllocated(allocations);
 * const remaining = available - totalAllocated;
 * ```
 */
export function getTotalAllocated(allocations: PowerAllocation[]): number {
  return allocations.reduce((sum, a) => sum + a.allocated_kW, 0);
}
