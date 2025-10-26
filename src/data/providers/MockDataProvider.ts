/**
 * Combined mock data provider (weather + tariff orchestrator).
 *
 * Phase 1-3: Coordinates MockWeatherProvider and MockTariffProvider
 * to produce complete weekly forecasts for MPC testing.
 *
 * @module data/providers
 */

import type { WeeklyForecast } from '../../core/forecast';
import type { DataProvider, WeatherProvider, TariffProvider } from './DataProvider';
import { MockWeatherProvider } from './MockWeatherProvider';
import { MockTariffProvider } from './MockTariffProvider';

/**
 * Mock data provider combining weather and tariff sources.
 * Used in Phase 1-3 before real API integration.
 */
export class MockDataProvider implements DataProvider {
  readonly weatherProvider: WeatherProvider;
  readonly tariffProvider: TariffProvider;

  constructor() {
    this.weatherProvider = new MockWeatherProvider();
    this.tariffProvider = new MockTariffProvider();
  }

  /**
   * Fetch complete weekly forecast (weather + tariffs) from mock presets.
   *
   * @param startDate - Week start date (ISO string, e.g., "2025-03-17")
   * @param options - Preset selection options
   * @param options.location - Weather preset ID ('sunny-week' | 'variable-week' | 'winter-week')
   * @param options.tariffType - Tariff type ('tempo' | 'tou' | 'fixed')
   * @returns Promise resolving to complete 7-day forecast
   *
   * @example
   * const provider = new MockDataProvider();
   * const forecast = await provider.fetchWeeklyForecast('2025-03-17', {
   *   location: 'sunny-week',
   *   tariffType: 'tempo'
   * });
   * // Returns: { startDate, weather: [...7 days], tariffs: [...7 days] }
   */
  async fetchWeeklyForecast(
    startDate: string,
    options?: {
      location?: string;
      tariffType?: 'tempo' | 'tou' | 'fixed';
    }
  ): Promise<WeeklyForecast> {
    const weatherPreset = options?.location ?? 'sunny-week';
    const tariffType = options?.tariffType ?? 'tempo';

    // Fetch weather and tariff data in parallel
    const [weather, tariffs] = await Promise.all([
      this.weatherProvider.fetchWeeklyWeather(startDate, weatherPreset),
      this.tariffProvider.fetchWeeklyTariff(startDate, tariffType)
    ]);

    return {
      startDate,
      weather,
      tariffs
    };
  }
}
