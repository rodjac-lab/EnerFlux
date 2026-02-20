/**
 * ENTSO-E Integration Helpers
 *
 * Utilities for converting ENTSO-E historical data to EnerFlux tariff format.
 * Enables spot price integration in simulation scenarios.
 *
 * @module data
 */

import type { Tariffs } from './types';
import { EntsoeHistoricalProvider } from './providers/EntsoeHistoricalProvider';

/**
 * Create tariff configuration from ENTSO-E historical data.
 *
 * Fetches spot prices for a given date range and converts to hourly profile.
 * Suitable for use in scenario definitions.
 *
 * @param startDate - ISO date string (e.g., "2023-06-15")
 * @param steps - Number of simulation steps
 * @param dt_s - Time step in seconds (default: 3600 for hourly)
 * @param exportPrice - Solar export price in €/kWh (default: 0.10)
 * @returns Tariffs object with 'profile' mode
 *
 * @example
 * ```typescript
 * const tariffs = await createEntsoeTariffs('2023-06-15', 168, 3600);
 * // Returns 7 days (168 hours) of spot prices
 * ```
 */
export async function createEntsoeTariffs(
  startDate: string,
  steps: number,
  dt_s = 3600,
  exportPrice = 0.10
): Promise<Tariffs> {
  const provider = new EntsoeHistoricalProvider();

  const SECONDS_PER_DAY = 24 * 3600;
  const totalSeconds = steps * dt_s;
  const daysNeeded = Math.ceil(totalSeconds / SECONDS_PER_DAY);
  const fullWeeks = Math.ceil(daysNeeded / 7);

  const hourlyPricesByDay: number[][] = [];

  for (let week = 0; week < fullWeeks; week++) {
    const weekStart = new Date(startDate);
    weekStart.setDate(weekStart.getDate() + week * 7);
    const weekStartStr = weekStart.toISOString().split('T')[0];

    const weeklyData = await provider.fetchWeeklyTariff(weekStartStr);

    for (const day of weeklyData) {
      hourlyPricesByDay.push([...day.importPriceSeries_eur_kWh]);
    }
  }

  // Map each simulation step to the correct hourly price
  const importPrices: number[] = [];
  const fallbackPrice = hourlyPricesByDay[0]?.[0] ?? 0.15;

  for (let step = 0; step < steps; step++) {
    const t = step * dt_s;
    const day = Math.floor(t / SECONDS_PER_DAY);
    const hourInDay = Math.floor((t % SECONDS_PER_DAY) / 3600);
    const dayPrices = day < hourlyPricesByDay.length
      ? hourlyPricesByDay[day]
      : hourlyPricesByDay[hourlyPricesByDay.length - 1];
    importPrices.push(dayPrices?.[hourInDay] ?? fallbackPrice);
  }

  return {
    mode: 'profile',
    import_EUR_per_kWh: importPrices,
    export_EUR_per_kWh: new Array(steps).fill(exportPrice)
  };
}

/**
 * Get ENTSO-E provider instance for direct data access.
 *
 * Use this when you need fine-grained control over data fetching
 * or want to access provider metadata.
 *
 * @returns Singleton ENTSO-E provider instance
 */
export function getEntsoeProvider(): EntsoeHistoricalProvider {
  return new EntsoeHistoricalProvider();
}

/**
 * Get quick statistics about ENTSO-E dataset.
 *
 * @returns Dataset metadata and date range
 */
export function getEntsoeMetadata(): {
  biddingZone: string;
  version: string;
  dateRange: { start: string; end: string };
  recordCount: number;
} {
  const provider = new EntsoeHistoricalProvider();
  return provider.getMetadata();
}

/**
 * Convert ENTSO-E date to scenario step index.
 *
 * @param scenarioStartDate - Scenario start date (ISO string)
 * @param targetDate - Target date to find (ISO string)
 * @param dt_s - Time step in seconds
 * @returns Step index or -1 if before scenario start
 */
export function dateToStepIndex(
  scenarioStartDate: string,
  targetDate: string,
  dt_s: number
): number {
  const startMs = new Date(scenarioStartDate).getTime();
  const targetMs = new Date(targetDate).getTime();
  const diffMs = targetMs - startMs;

  if (diffMs < 0) return -1;

  return Math.floor(diffMs / 1000 / dt_s);
}

/**
 * Extract price slice for a specific day from tariff profile.
 *
 * @param tariffs - Tariffs with 'profile' mode
 * @param dayIndex - Day index (0-based)
 * @param dt_s - Time step in seconds
 * @returns Array of 24 hourly prices (or empty if invalid)
 */
export function extractDayPrices(
  tariffs: Tariffs,
  dayIndex: number,
  dt_s = 3600
): number[] {
  if (tariffs.mode !== 'profile' || !Array.isArray(tariffs.import_EUR_per_kWh)) {
    return [];
  }

  const stepsPerDay = Math.floor((24 * 3600) / dt_s);
  const startStep = dayIndex * stepsPerDay;
  const endStep = startStep + stepsPerDay;

  return tariffs.import_EUR_per_kWh.slice(startStep, endStep);
}
