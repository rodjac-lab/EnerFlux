/**
 * Mock tariff provider with Tempo and Time-of-Use presets.
 *
 * Phase 1-3: Simulates French electricity pricing without RTE API dependency.
 * Supports:
 * - Tempo (BLUE/WHITE/RED days with HP/HC periods)
 * - Time-of-Use (standard HP/HC hours)
 * - Fixed pricing
 *
 * @module data/providers
 */

import type { DailyTariff, Forecast, TempoColor } from '../../core/forecast';
import type { TariffProvider } from './DataProvider';

/**
 * Tempo pricing structure (2025 EDF rates).
 * Source: https://particulier.edf.fr/fr/accueil/gestion-contrat/options/tempo.html
 */
const TEMPO_PRICES = {
  BLUE: {
    offpeak: 0.1296, // HC Bleu (€/kWh)
    peak: 0.1609 // HP Bleu
  },
  WHITE: {
    offpeak: 0.1486, // HC Blanc
    peak: 0.1894 // HP Blanc
  },
  RED: {
    offpeak: 0.1568, // HC Rouge
    peak: 0.7562 // HP Rouge (very expensive!)
  }
} as const;

/**
 * Standard Time-of-Use (HP/HC) pricing.
 * Typical French residential tariff without Tempo.
 */
const TOU_PRICES = {
  offpeak: 0.1558, // Heures Creuses
  peak: 0.2068 // Heures Pleines
} as const;

/**
 * Fixed pricing (no time variation).
 * Base tariff for comparison.
 */
const FIXED_PRICE = 0.2062; // €/kWh (all hours)

/**
 * Export pricing (solar buyback).
 * EDF OA Solaire rate for residential PV (<9kWc).
 */
const EXPORT_PRICE = 0.10; // €/kWh (constant)

/**
 * Off-peak hours (Heures Creuses): 22h-6h by default.
 * Some regions use 2h-7h or 23h-7h (not implemented in mock).
 */
function isOffpeakHour(hour: number): boolean {
  return hour >= 22 || hour < 6;
}

/**
 * Generate hourly price series for a day.
 *
 * @param tariffType - Type of tariff
 * @param tempoColor - Tempo color (if applicable)
 * @returns Object with import/export price arrays (24 values each)
 */
function generateHourlyPrices(
  tariffType: 'tempo' | 'tou' | 'fixed',
  tempoColor?: TempoColor
): {
  importPrices: number[];
  exportPrices: number[];
  offpeakPrice: number;
  peakPrice: number;
} {
  const importPrices = new Array<number>(24);
  const exportPrices = new Array<number>(24).fill(EXPORT_PRICE);

  let offpeakPrice = 0;
  let peakPrice = 0;

  if (tariffType === 'fixed') {
    importPrices.fill(FIXED_PRICE);
    offpeakPrice = FIXED_PRICE;
    peakPrice = FIXED_PRICE;
  } else if (tariffType === 'tou') {
    offpeakPrice = TOU_PRICES.offpeak;
    peakPrice = TOU_PRICES.peak;
    for (let h = 0; h < 24; h++) {
      importPrices[h] = isOffpeakHour(h) ? offpeakPrice : peakPrice;
    }
  } else if (tariffType === 'tempo') {
    const prices = TEMPO_PRICES[tempoColor ?? 'BLUE'];
    offpeakPrice = prices.offpeak;
    peakPrice = prices.peak;
    for (let h = 0; h < 24; h++) {
      importPrices[h] = isOffpeakHour(h) ? offpeakPrice : peakPrice;
    }
  }

  return {
    importPrices,
    exportPrices,
    offpeakPrice,
    peakPrice
  };
}

/**
 * Preset Tempo weeks for testing MPC response to tariff variations.
 *
 * Real Tempo rules (22 RED days/year, announced J-1 at 11h):
 * - REDs concentrated Nov-Mar (heating season)
 * - Typically 1-6 consecutive RED days during cold snaps
 * - BLUE dominates summer (low demand)
 */
const TEMPO_PRESETS: Record<string, readonly TempoColor[]> = {
  // Preset 1: Mostly BLUE with 1 RED (spring week, low risk)
  'tempo-spring': ['BLUE', 'BLUE', 'WHITE', 'BLUE', 'BLUE', 'RED', 'BLUE'],

  // Preset 2: Mixed with 2 consecutive REDs (winter cold snap)
  'tempo-winter-harsh': ['WHITE', 'BLUE', 'RED', 'RED', 'WHITE', 'BLUE', 'BLUE'],

  // Preset 3: All BLUE (summer, no stress)
  'tempo-summer': ['BLUE', 'BLUE', 'BLUE', 'BLUE', 'BLUE', 'BLUE', 'BLUE']
};

/**
 * Mock tariff provider implementation.
 * Returns deterministic Tempo/ToU schedules for testing MPC (Phase 1-3).
 */
export class MockTariffProvider implements TariffProvider {
  readonly id = 'mock-tariff';
  readonly name = 'Mock Tariff (Tempo/ToU)';

  /**
   * Fetch weekly tariff schedule from preset library.
   *
   * @param startDate - Week start date (ISO string, e.g., "2025-01-13")
   * @param tariffType - Tariff type ('tempo', 'tou', 'fixed')
   * @returns Promise resolving to 7-day tariff data
   */
  async fetchWeeklyTariff(
    startDate: string,
    tariffType: 'tempo' | 'tou' | 'fixed' = 'tempo'
  ): Promise<readonly DailyTariff[]> {
    // Simulate async API call
    await new Promise((resolve) => setTimeout(resolve, 10));

    const week: DailyTariff[] = [];
    const baseDate = new Date(startDate);

    if (tariffType === 'tempo') {
      // Default to spring preset if no specific preset requested
      const tempoColors = TEMPO_PRESETS['tempo-spring'];

      for (let day = 0; day < 7; day++) {
        const date = new Date(baseDate);
        date.setDate(baseDate.getDate() + day);
        const dateStr = date.toISOString().split('T')[0];
        const color = tempoColors[day];

        const { importPrices, exportPrices, offpeakPrice, peakPrice } = generateHourlyPrices(
          'tempo',
          color
        );

        week.push({
          day,
          date: dateStr,
          tariffType: 'tempo',
          tempoColor: color,
          offpeakPrice_eur_kWh: offpeakPrice,
          peakPrice_eur_kWh: peakPrice,
          importPriceSeries_eur_kWh: importPrices,
          exportPriceSeries_eur_kWh: exportPrices
        });
      }
    } else if (tariffType === 'tou') {
      const { importPrices, exportPrices, offpeakPrice, peakPrice } = generateHourlyPrices('tou');

      for (let day = 0; day < 7; day++) {
        const date = new Date(baseDate);
        date.setDate(baseDate.getDate() + day);
        const dateStr = date.toISOString().split('T')[0];

        week.push({
          day,
          date: dateStr,
          tariffType: 'tou',
          offpeakPrice_eur_kWh: offpeakPrice,
          peakPrice_eur_kWh: peakPrice,
          importPriceSeries_eur_kWh: importPrices,
          exportPriceSeries_eur_kWh: exportPrices
        });
      }
    } else {
      // Fixed pricing
      const { importPrices, exportPrices, offpeakPrice, peakPrice } = generateHourlyPrices('fixed');

      for (let day = 0; day < 7; day++) {
        const date = new Date(baseDate);
        date.setDate(baseDate.getDate() + day);
        const dateStr = date.toISOString().split('T')[0];

        week.push({
          day,
          date: dateStr,
          tariffType: 'fixed',
          offpeakPrice_eur_kWh: offpeakPrice,
          peakPrice_eur_kWh: peakPrice,
          importPriceSeries_eur_kWh: importPrices,
          exportPriceSeries_eur_kWh: exportPrices
        });
      }
    }

    return week;
  }

  /**
   * Get tariff forecast horizon for MPC price lookahead (24h default).
   *
   * @param currentDay - Current day index (0-6)
   * @param currentHour - Current hour (0-23)
   * @param weeklyData - Full weekly tariff data
   * @returns Price forecast arrays
   */
  getTariffHorizonForecast(
    currentDay: number,
    currentHour: number,
    weeklyData: readonly DailyTariff[]
  ): Pick<Forecast, 'importPricesNext_eur_kWh' | 'exportPricesNext_eur_kWh'> {
    const horizonHours = 24;
    const importPricesNext: number[] = [];
    const exportPricesNext: number[] = [];

    for (let h = 0; h < horizonHours; h++) {
      const totalHoursFromStart = currentDay * 24 + currentHour + h;
      const targetDay = Math.floor(totalHoursFromStart / 24);
      const targetHour = totalHoursFromStart % 24;

      if (targetDay >= weeklyData.length) {
        // Beyond week end - assume last day repeats
        const lastDay = weeklyData[weeklyData.length - 1];
        importPricesNext.push(lastDay.importPriceSeries_eur_kWh[targetHour]);
        exportPricesNext.push(lastDay.exportPriceSeries_eur_kWh[targetHour]);
      } else {
        const dayData = weeklyData[targetDay];
        importPricesNext.push(dayData.importPriceSeries_eur_kWh[targetHour]);
        exportPricesNext.push(dayData.exportPriceSeries_eur_kWh[targetHour]);
      }
    }

    return {
      importPricesNext_eur_kWh: importPricesNext,
      exportPricesNext_eur_kWh: exportPricesNext
    };
  }
}

/**
 * Helper to get Tempo preset by name (for tests and UI selector).
 */
export function getTempoPreset(presetName: string): readonly TempoColor[] | undefined {
  return TEMPO_PRESETS[presetName];
}

/**
 * Get all available Tempo preset names.
 */
export function getTempoPresetNames(): string[] {
  return Object.keys(TEMPO_PRESETS);
}
