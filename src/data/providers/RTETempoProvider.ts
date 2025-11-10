/**
 * RTE Tempo API provider for official daily tariff color announcements.
 *
 * Fetches TEMPO day colors from RTE's public API:
 * - J-1 official announcement at 10:30 AM
 * - Pre-notification available 8:00-10:30 AM (informational only)
 * - 22 RED days (Nov-Mar), 43 WHITE days, 300 BLUE days per year
 *
 * **API Endpoint**: https://www.data.rte-france.com/catalog/-/api/consumption/Tempo-Like-Supply-Contract/v1.1
 * **Documentation**: https://www.services-rte.com/en/view-data-published-by-rte/schedule-of-Tempo-type-supply-offerings.html
 *
 * Phase 4: Real API integration for Mode Coach Prédictif.
 *
 * @module data/providers
 */

import type { DailyTariff, TempoColor } from '../../core/forecast';
import type { TariffProvider } from './DataProvider';

/**
 * RTE API response format for Tempo color data.
 * Based on official RTE API schema v1.1.
 */
interface RTETempoAPIResponse {
  /** Tempo values array (one per day) */
  tempo_like_calendars?: {
    /** Start datetime (ISO 8601) */
    start_date: string;
    /** End datetime (ISO 8601) */
    end_date: string;
    /** Tempo color values */
    values: Array<{
      /** Start datetime for this color */
      start_date: string;
      /** End datetime for this color */
      end_date: string;
      /** Updated datetime */
      updated_date: string;
      /** Tempo color value (BLUE, WHITE, RED) */
      value: string;
    }>;
  };
}

/**
 * Tempo pricing constants (2025 EDF rates).
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
 * Export pricing (solar buyback) - constant across all Tempo colors.
 * EDF OA Solaire rate for residential PV (<9kWc).
 */
const EXPORT_PRICE = 0.10; // €/kWh

/**
 * Off-peak hours (Heures Creuses): 22h-6h by default.
 * Some regions use 2h-7h or 23h-7h (configurable via constructor).
 */
function isOffpeakHour(hour: number, offpeakStart = 22, offpeakEnd = 6): boolean {
  if (offpeakStart > offpeakEnd) {
    // Wraps around midnight (e.g., 22h-6h)
    return hour >= offpeakStart || hour < offpeakEnd;
  }
  return hour >= offpeakStart && hour < offpeakEnd;
}

/**
 * Generate hourly price series for a Tempo day.
 *
 * @param tempoColor - Tempo color (BLUE/WHITE/RED)
 * @param offpeakStart - Off-peak start hour (default 22)
 * @param offpeakEnd - Off-peak end hour (default 6)
 * @returns Import/export price arrays (24 values each)
 */
function generateTempoPrices(
  tempoColor: TempoColor,
  offpeakStart = 22,
  offpeakEnd = 6
): {
  importPrices: number[];
  exportPrices: number[];
  offpeakPrice: number;
  peakPrice: number;
} {
  const prices = TEMPO_PRICES[tempoColor];
  const importPrices = new Array<number>(24);
  const exportPrices = new Array<number>(24).fill(EXPORT_PRICE);

  for (let h = 0; h < 24; h++) {
    importPrices[h] = isOffpeakHour(h, offpeakStart, offpeakEnd)
      ? prices.offpeak
      : prices.peak;
  }

  return {
    importPrices,
    exportPrices,
    offpeakPrice: prices.offpeak,
    peakPrice: prices.peak
  };
}

/**
 * Parse RTE API color string to TempoColor type.
 * Handles variations like "TEMPO_BLUE", "BLUE", "Bleu", etc.
 */
function parseTempoColor(apiValue: string): TempoColor {
  const normalized = apiValue.toUpperCase().replace('TEMPO_', '');
  if (normalized.includes('BLUE') || normalized.includes('BLEU')) {
    return 'BLUE';
  }
  if (normalized.includes('WHITE') || normalized.includes('BLANC')) {
    return 'WHITE';
  }
  if (normalized.includes('RED') || normalized.includes('ROUGE')) {
    return 'RED';
  }
  // Default to BLUE if unknown (safest pricing assumption)
  console.warn(`[RTETempoProvider] Unknown Tempo color "${apiValue}", defaulting to BLUE`);
  return 'BLUE';
}

/**
 * RTE Tempo provider implementation.
 * Fetches official Tempo color announcements from RTE API.
 *
 * **Rate Limits**: RTE API does not publish specific rate limits for Tempo endpoint.
 * Recommended: Cache results and poll once daily around 11 AM.
 *
 * **Fallback**: If API fails, falls back to BLUE (safest/cheapest assumption).
 */
export class RTETempoProvider implements TariffProvider {
  readonly id = 'rte-tempo';
  readonly name = 'RTE Tempo (Official)';

  private readonly apiBaseUrl = import.meta.env.DEV
    ? '/api/rte'  // Proxy Vite en dev (contourne CORS)
    : 'https://digital.iservices.rte-france.com/open_api/tempo_like_supply_contract/v1';  // Direct en prod
  private readonly offpeakStart: number;
  private readonly offpeakEnd: number;

  /**
   * @param offpeakStart - Off-peak start hour (default 22h)
   * @param offpeakEnd - Off-peak end hour (default 6h)
   */
  constructor(offpeakStart = 22, offpeakEnd = 6) {
    this.offpeakStart = offpeakStart;
    this.offpeakEnd = offpeakEnd;
  }

  /**
   * Fetch weekly Tempo colors from RTE API.
   *
   * **Endpoint**: GET /tempo_like_calendars
   * **Query params**:
   * - start_date: ISO 8601 datetime (e.g., "2025-03-17T00:00:00+01:00")
   * - end_date: ISO 8601 datetime (7 days later)
   *
   * @param startDate - Week start date (ISO string, e.g., "2025-03-17")
   * @param _tariffType - Ignored (always returns Tempo)
   * @returns Promise resolving to 7-day Tempo tariff data
   *
   * @throws {Error} If API request fails (network, auth, etc.)
   */
  async fetchWeeklyTariff(
    startDate: string,
    _tariffType?: 'tempo' | 'tou' | 'fixed'
  ): Promise<readonly DailyTariff[]> {
    const start = new Date(startDate);
    const end = new Date(start);
    end.setDate(start.getDate() + 7);

    // NOTE: RTE API requires OAuth 2.0 authentication + specific date format with timezone
    // Expected: 2025-11-09T00:00:00+01:00 (Europe/Paris timezone)
    // Currently NOT implemented - using fallback to BLUE week (conservative pricing)
    // See: https://data.rte-france.com/catalog/-/api/consumption/Tempo-Like-Supply-Contract/v1.1
    // TODO Phase 7: Implement OAuth 2.0 flow for real Tempo colors
    
    const startISO = start.toISOString();
    const endISO = end.toISOString();

    const url = `${this.apiBaseUrl}/tempo_like_calendars?start_date=${encodeURIComponent(startISO)}&end_date=${encodeURIComponent(endISO)}`;

    try {
      const response = await fetch(url, {
        headers: {
          'Accept': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(
          `RTE API error: ${response.status} ${response.statusText}`
        );
      }

      const data: RTETempoAPIResponse = await response.json();

      if (!data.tempo_like_calendars?.values || data.tempo_like_calendars.values.length === 0) {
        console.warn('[RTETempoProvider] No Tempo data returned, falling back to BLUE');
        return this.fallbackToBlueWeek(startDate);
      }

      // Convert API response to DailyTariff array
      return this.parseTempoDays(data, startDate);
    } catch (error) {
      console.error('[RTETempoProvider] API fetch failed:', error);
      console.warn('[RTETempoProvider] Falling back to BLUE week');
      return this.fallbackToBlueWeek(startDate);
    }
  }

  /**
   * Parse RTE API response into DailyTariff array.
   * Groups hourly values into daily entries.
   */
  private parseTempoDays(
    data: RTETempoAPIResponse,
    startDate: string
  ): DailyTariff[] {
    const values = data.tempo_like_calendars!.values;
    const dailyTariffs: DailyTariff[] = [];

    // Group values by day (RTE returns hourly or daily granularity)
    const dayMap = new Map<string, TempoColor>();

    for (const entry of values) {
      const date = entry.start_date.split('T')[0]; // Extract YYYY-MM-DD
      const color = parseTempoColor(entry.value);
      dayMap.set(date, color);
    }

    // Generate 7 days starting from startDate
    const baseDate = new Date(startDate);
    for (let day = 0; day < 7; day++) {
      const currentDate = new Date(baseDate);
      currentDate.setDate(baseDate.getDate() + day);
      const dateStr = currentDate.toISOString().split('T')[0];

      // Use color from API, or default to BLUE if missing
      const color = dayMap.get(dateStr) ?? 'BLUE';

      const { importPrices, exportPrices, offpeakPrice, peakPrice } = generateTempoPrices(
        color,
        this.offpeakStart,
        this.offpeakEnd
      );

      dailyTariffs.push({
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

    return dailyTariffs;
  }

  /**
   * Fallback to BLUE week if API fails.
   * Conservative assumption (cheapest pricing).
   */
  private fallbackToBlueWeek(startDate: string): DailyTariff[] {
    const week: DailyTariff[] = [];
    const baseDate = new Date(startDate);

    const { importPrices, exportPrices, offpeakPrice, peakPrice } = generateTempoPrices(
      'BLUE',
      this.offpeakStart,
      this.offpeakEnd
    );

    for (let day = 0; day < 7; day++) {
      const date = new Date(baseDate);
      date.setDate(baseDate.getDate() + day);
      const dateStr = date.toISOString().split('T')[0];

      week.push({
        day,
        date: dateStr,
        tariffType: 'tempo',
        tempoColor: 'BLUE',
        offpeakPrice_eur_kWh: offpeakPrice,
        peakPrice_eur_kWh: peakPrice,
        importPriceSeries_eur_kWh: [...importPrices], // Clone arrays
        exportPriceSeries_eur_kWh: [...exportPrices]
      });
    }

    return week;
  }
}
