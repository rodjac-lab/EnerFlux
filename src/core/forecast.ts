/**
 * Forecast data structures for Mode Coach Prédictif (MPC).
 *
 * These interfaces define the contract between data providers (mock or real APIs)
 * and the MPC strategy system. All forecasts use a lookahead horizon (typically 24-48h).
 *
 * @module core/forecast
 */

/**
 * Tempo color for French variable pricing (EDF Tempo tariff).
 * - BLUE: cheap days (~300/year) - 0.16€/kWh peak
 * - WHITE: medium days (~43/year) - 0.20€/kWh peak
 * - RED: expensive days (22/year max) - 0.76€/kWh peak
 */
export type TempoColor = 'BLUE' | 'WHITE' | 'RED';

/**
 * Daily weather profile for a single day in a weekly simulation.
 * Contains both aggregated metrics (total PV) and hourly time series.
 */
export interface DailyWeather {
  /** Day index (0-6 for weekly simulation) */
  readonly day: number;

  /** ISO date string (e.g., "2025-01-15") */
  readonly date: string;

  /** Human-readable weather description (e.g., "Ensoleillé", "Nuageux") */
  readonly description: string;

  /** Weather icon identifier (e.g., "sun", "cloud", "rain") */
  readonly icon: string;

  /** Total PV production for the day (kWh) */
  readonly pvTotal_kWh: number;

  /** Hourly PV power profile (kW), length = 24 */
  readonly pvProfile_kW: readonly number[];

  /** Average ambient temperature for the day (°C) */
  readonly avgAmbientTemp_C: number;

  /** Hourly ambient temperature profile (°C), length = 24 */
  readonly ambientTempProfile_C: readonly number[];
}

/**
 * Daily tariff profile for a single day in a weekly simulation.
 * Supports Tempo, Time-of-Use (ToU), and fixed pricing.
 */
export interface DailyTariff {
  /** Day index (0-6 for weekly simulation) */
  readonly day: number;

  /** ISO date string (e.g., "2025-01-15") */
  readonly date: string;

  /** Tariff type */
  readonly tariffType: 'tempo' | 'tou' | 'fixed';

  /** Tempo color (only if tariffType = 'tempo') */
  readonly tempoColor?: TempoColor;

  /** Off-peak import price (€/kWh) */
  readonly offpeakPrice_eur_kWh: number;

  /** Peak import price (€/kWh) */
  readonly peakPrice_eur_kWh: number;

  /** Hourly import price series (€/kWh), length = 24 */
  readonly importPriceSeries_eur_kWh: readonly number[];

  /** Hourly export price series (€/kWh), length = 24 */
  readonly exportPriceSeries_eur_kWh: readonly number[];
}

/**
 * Forecast horizon data for MPC decision-making.
 *
 * Contains lookahead time series (typically 24-48h) that MPC heuristics use
 * to anticipate future conditions and optimize current decisions.
 *
 * All arrays must have the same length = horizon_hours.
 */
export interface Forecast {
  /** Forecast horizon in hours (typically 24 or 48) */
  readonly horizon_hours: number;

  /** Forecasted PV production (kW) for next N hours */
  readonly pvNext_kW: readonly number[];

  /** Forecasted import prices (€/kWh) for next N hours */
  readonly importPricesNext_eur_kWh: readonly number[];

  /** Forecasted export prices (€/kWh) for next N hours */
  readonly exportPricesNext_eur_kWh: readonly number[];

  /** Forecasted ambient temperature (°C) for next N hours */
  readonly ambientTempNext_C: readonly number[];
}

/**
 * Weekly scenario combining weather and tariff forecasts for 7 days.
 * Used by weekly simulations in Mode Coach.
 */
export interface WeeklyForecast {
  /** Start date of the week (ISO string) */
  readonly startDate: string;

  /** Weather forecast for each day (length = 7) */
  readonly weather: readonly DailyWeather[];

  /** Tariff forecast for each day (length = 7) */
  readonly tariffs: readonly DailyTariff[];
}
