/**
 * Data provider interfaces for Mode Coach Prédictif.
 *
 * Defines the contract between the simulation engine and data sources.
 * Implementations can be:
 * - Mock providers (Phase 1-3): Deterministic presets for testing/development
 * - Real API providers (Phase 4+): Météo France, Open-Meteo, RTE Tempo
 *
 * @module data/providers
 */

import type { DailyWeather, DailyTariff, WeeklyForecast, Forecast } from '../../core/forecast';

/**
 * Weather data provider interface.
 * Abstracts the source of weather forecasts (mock presets or real API).
 */
export interface WeatherProvider {
  /** Provider identifier (e.g., "mock", "meteo-france", "open-meteo") */
  readonly id: string;

  /** Human-readable provider name */
  readonly name: string;

  /**
   * Fetch weekly weather forecast starting from a given date.
   *
   * @param startDate - ISO date string for week start (e.g., "2025-01-15")
   * @param location - Optional location (lat/lon for real APIs, preset ID for mock)
   * @returns Promise resolving to 7-day weather forecast
   */
  fetchWeeklyWeather(startDate: string, location?: string): Promise<readonly DailyWeather[]>;

  /**
   * Get forecast horizon for MPC lookahead.
   *
   * @param currentDay - Current day index (0-6)
   * @param currentHour - Current hour (0-23)
   * @param weeklyData - Full weekly weather data
   * @returns Forecast object with lookahead time series
   */
  getHorizonForecast(
    currentDay: number,
    currentHour: number,
    weeklyData: readonly DailyWeather[]
  ): Forecast;
}

/**
 * Tariff data provider interface.
 * Abstracts the source of electricity pricing (mock presets, RTE Tempo API, ToU schedules).
 */
export interface TariffProvider {
  /** Provider identifier (e.g., "mock-tempo", "rte-tempo", "tou-hphc") */
  readonly id: string;

  /** Human-readable provider name */
  readonly name: string;

  /**
   * Fetch weekly tariff forecast starting from a given date.
   *
   * @param startDate - ISO date string for week start (e.g., "2025-01-15")
   * @param tariffType - Tariff type ('tempo', 'tou', 'fixed')
   * @returns Promise resolving to 7-day tariff forecast
   */
  fetchWeeklyTariff(startDate: string, tariffType?: 'tempo' | 'tou' | 'fixed'): Promise<readonly DailyTariff[]>;

  /**
   * Get forecast horizon for MPC price lookahead.
   *
   * @param currentDay - Current day index (0-6)
   * @param currentHour - Current hour (0-23)
   * @param weeklyData - Full weekly tariff data
   * @returns Price forecast arrays (import/export)
   */
  getTariffHorizonForecast(
    currentDay: number,
    currentHour: number,
    weeklyData: readonly DailyTariff[]
  ): Pick<Forecast, 'importPricesNext_eur_kWh' | 'exportPricesNext_eur_kWh'>;
}

/**
 * Combined data provider orchestrating weather + tariff sources.
 * Used by weekly simulation engine.
 */
export interface DataProvider {
  readonly weatherProvider: WeatherProvider;
  readonly tariffProvider: TariffProvider;

  /**
   * Fetch complete weekly forecast (weather + tariffs).
   *
   * @param startDate - ISO date string for week start
   * @param options - Provider-specific options (location, tariff type, etc.)
   * @returns Promise resolving to complete weekly forecast
   */
  fetchWeeklyForecast(
    startDate: string,
    options?: {
      location?: string;
      tariffType?: 'tempo' | 'tou' | 'fixed';
    }
  ): Promise<WeeklyForecast>;
}
