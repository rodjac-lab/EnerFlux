/**
 * ENTSO-E Scenario Examples
 *
 * Pre-configured scenarios using ENTSO-E historical spot prices.
 * Demonstrates realistic market-responsive simulations with dynamic pricing.
 *
 * @module data
 */

import type { ScenarioDefaults, Tariffs } from './types';
import { waterDrawProfiles } from '../devices/registry';
import { getEntsoeProvider } from './entsoe-helpers';

/**
 * Create scenario defaults with ENTSO-E spot pricing.
 *
 * Use this to quickly set up a scenario with real market prices.
 * The tariff profile will be loaded from historical data.
 *
 * @param startDate - ISO date string (e.g., "2023-06-15")
 * @param steps - Number of simulation steps (default: 96 = 1 day at 15min)
 * @param dt_s - Time step in seconds (default: 900 = 15min)
 * @returns Promise resolving to scenario defaults with ENTSO-E tariffs
 *
 * @example
 * ```typescript
 * // Summer day with negative prices
 * const defaults = await createEntsoeDefaults('2023-06-15', 96, 900);
 *
 * // Winter peak demand
 * const defaults = await createEntsoeDefaults('2023-01-15', 96, 900);
 * ```
 */
export async function createEntsoeDefaults(
  startDate: string,
  steps = 96,
  dt_s = 900
): Promise<ScenarioDefaults> {
  const provider = getEntsoeProvider();
  const weeklyData = await provider.fetchWeeklyTariff(startDate);

  const SECONDS_PER_DAY = 24 * 3600;
  const importPrices: number[] = [];
  const exportPrices: number[] = [];

  for (let step = 0; step < steps; step++) {
    const totalSeconds = step * dt_s;
    const day = Math.floor(totalSeconds / SECONDS_PER_DAY);
    const hourInDay = Math.floor((totalSeconds % SECONDS_PER_DAY) / 3600);
    const dayData = day < weeklyData.length ? weeklyData[day] : weeklyData[weeklyData.length - 1];

    importPrices.push(dayData.importPriceSeries_eur_kWh[hourInDay]);
    exportPrices.push(dayData.exportPriceSeries_eur_kWh[hourInDay]);
  }

  return {
    batteryConfig: {
      capacity_kWh: 10,
      pMax_kW: 3.68,
      etaCharge: 0.95,
      etaDischarge: 0.95,
      socInit_kWh: 5,
      socMin_kWh: 1,
      socMax_kWh: 10
    },
    ecsConfig: {
      volume_L: 300,
      resistivePower_kW: 3,
      efficiency: 0.95,
      lossCoeff_W_per_K: 4,
      ambientTemp_C: 20,
      targetTemp_C: 55,
      initialTemp_C: 48,
      drawProfile: waterDrawProfiles.medium
    },
    tariffs: {
      mode: 'profile',
      import_EUR_per_kWh: importPrices,
      export_EUR_per_kWh: exportPrices
    }
  };
}

/**
 * Get ENTSO-E dataset statistics for scenario planning.
 *
 * Use this to find interesting dates (high volatility, negative prices, etc.)
 * before creating scenarios.
 *
 * @returns Dataset metadata and available date range
 */
export function getEntsoeStats(): {
  biddingZone: string;
  version: string;
  dateRange: { start: string; end: string };
  recordCount: number;
} {
  const provider = getEntsoeProvider();
  return provider.getMetadata();
}

/**
 * Pre-configured ENTSO-E scenario: Summer 2023 with negative prices.
 *
 * Interesting case: High solar penetration causes midday negative prices.
 * Tests strategy response to market signals (export during negative prices?).
 */
export async function getSummerNegativePricesScenario(): Promise<ScenarioDefaults> {
  return createEntsoeDefaults('2023-06-15', 96, 900);
}

/**
 * Pre-configured ENTSO-E scenario: Winter 2023 peak demand.
 *
 * High prices during evening peak (18h-20h), tests reserve strategies.
 * Uses 2023-01-15 data (prices 98-225 €/MWh with clear evening peak).
 */
export async function getWinterPeakScenario(): Promise<ScenarioDefaults> {
  return createEntsoeDefaults('2023-01-15', 96, 900);
}

/**
 * Pre-configured ENTSO-E scenario: Spring 2024 moderate volatility.
 *
 * Balanced mix of solar production and demand, realistic daily pattern.
 */
export async function getSpringModerateScenario(): Promise<ScenarioDefaults> {
  return createEntsoeDefaults('2024-03-20', 96, 900);
}

/**
 * Pre-configured ENTSO-E scenario: Summer 2024 heat wave.
 *
 * High cooling demand, extreme midday solar, tests battery arbitrage.
 */
export async function getSummerHeatwaveScenario(): Promise<ScenarioDefaults> {
  return createEntsoeDefaults('2024-08-10', 96, 900);
}

/**
 * Pre-configured ENTSO-E scenario: Autumn 2024 transition.
 *
 * Moderate prices, good PV still available, heating starting.
 */
export async function getAutumnTransitionScenario(): Promise<ScenarioDefaults> {
  return createEntsoeDefaults('2024-11-05', 96, 900);
}
