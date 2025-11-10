/**
 * OpenWeather Solar Irradiance API provider for PV production forecasts.
 *
 * Fetches solar irradiance data (GHI, DNI, DHI) from OpenWeather API:
 * - Current conditions + 15-day forecast
 * - 1-hour or 15-minute resolution
 * - Clear sky and cloudy sky models
 *
 * **API Endpoint**: https://api.openweathermap.org/energy/1.0/solar/
 * **Documentation**: https://openweathermap.org/api/solar-irradiance
 * **Pricing**: Separate subscription, pay-per-call model
 *
 * Phase 4: Real API integration for Mode Coach Prédictif.
 *
 * @module data/providers
 */

import type { DailyWeather } from '../../core/forecast';
import type { WeatherProvider } from './DataProvider';

/**
 * OpenWeather Solar Irradiance API response format.
 * Simplified schema based on OpenWeather documentation.
 */
interface OpenWeatherSolarResponse {
  /** Latitude */
  lat: number;
  /** Longitude */
  lon: number;
  /** Timezone offset in seconds */
  timezone_offset: number;
  /** Hourly forecast data */
  hourly?: Array<{
    /** Unix timestamp */
    dt: number;
    /** Global Horizontal Irradiance (W/m²) */
    ghi: number;
    /** Direct Normal Irradiance (W/m²) */
    dni?: number;
    /** Diffuse Horizontal Irradiance (W/m²) */
    dhi?: number;
    /** Temperature (°C) */
    temp?: number;
    /** Cloud coverage (%) */
    clouds?: number;
  }>;
}

/**
 * Configuration for PV system parameters.
 * Used to convert GHI (W/m²) to expected PV power (kW).
 */
export interface PVSystemConfig {
  /** Peak power of PV system (kWp) */
  peakPower_kWp: number;

  /** System efficiency factor (0-1, default 0.75) */
  efficiency?: number;

  /** Panel tilt angle (degrees, default 30°) */
  tilt_deg?: number;

  /** Panel azimuth (degrees, 0=North, 90=East, 180=South, default 180) */
  azimuth_deg?: number;
}

/**
 * Convert GHI (Global Horizontal Irradiance) to PV power output.
 *
 * **Simplified model** (Phase 4):
 * - Assumes optimal orientation (South-facing, 30° tilt)
 * - Uses linear scaling with efficiency factor
 * - Does not account for temperature, soiling, shading
 *
 * **Formula**: P_kW = (GHI / 1000) * peakPower_kWp * efficiency
 * - GHI in W/m² (standard test condition = 1000 W/m²)
 * - Efficiency includes inverter losses, wiring, degradation (~0.75)
 *
 * @param ghi_W_m2 - Global Horizontal Irradiance (W/m²)
 * @param config - PV system configuration
 * @returns Estimated PV power output (kW)
 */
function ghiToPvPower(ghi_W_m2: number, config: PVSystemConfig): number {
  const efficiency = config.efficiency ?? 0.75;
  const stcIrradiance = 1000; // W/m² at Standard Test Conditions

  // Simple linear model (Phase 4)
  // Future: Use PVLIB-like model with tilt/azimuth corrections
  const power_kW = (ghi_W_m2 / stcIrradiance) * config.peakPower_kWp * efficiency;

  return Math.max(0, power_kW); // No negative power
}

/**
 * Aggregate hourly irradiance data into daily PV profile.
 *
 * @param hourlyData - 24 hours of irradiance data
 * @param config - PV system configuration
 * @returns Object with daily total (kWh) and hourly profile (kW)
 */
function aggregateDailyPV(
  hourlyData: Array<{ ghi: number; temp?: number }>,
  config: PVSystemConfig
): {
  pvTotal_kWh: number;
  pvProfile_kW: number[];
  avgTemp_C: number;
} {
  const pvProfile_kW = hourlyData.map((h) => ghiToPvPower(h.ghi, config));

  // Daily total: sum of hourly power (kW) gives kWh (assuming 1h intervals)
  const pvTotal_kWh = pvProfile_kW.reduce((sum, p) => sum + p, 0);

  // Average temperature
  const temps = hourlyData.filter((h) => h.temp !== undefined).map((h) => h.temp!);
  const avgTemp_C = temps.length > 0 ? temps.reduce((sum, t) => sum + t, 0) / temps.length : 15;

  return { pvTotal_kWh, pvProfile_kW, avgTemp_C };
}

/**
 * Generate weather description from cloud coverage.
 * Simple heuristic for Phase 4 (can be enhanced with weather codes).
 */
function generateWeatherDescription(avgClouds: number): {
  description: string;
  icon: string;
} {
  if (avgClouds < 20) {
    return { description: 'Ensoleillé', icon: '☀️' };
  }
  if (avgClouds < 50) {
    return { description: 'Partiellement nuageux', icon: '⛅' };
  }
  if (avgClouds < 80) {
    return { description: 'Nuageux', icon: '☁️' };
  }
  return { description: 'Très nuageux', icon: '🌥️' };
}

/**
 * OpenWeather provider implementation.
 * Fetches solar irradiance forecasts and converts to PV production estimates.
 *
 * **Rate Limits**: Depends on subscription tier (typically 60 calls/min on paid plans).
 * **Caching**: Recommended to cache results for 1-3 hours.
 *
 * **Fallback**: If API fails, falls back to clear-sky model or historical averages.
 */
export class OpenWeatherProvider implements WeatherProvider {
  readonly id = 'openweather-solar';
  readonly name = 'OpenWeather Solar Irradiance';

  private readonly apiKey: string;
  private readonly apiBaseUrl = import.meta.env.DEV
    ? '/api/openweather/solar'  // Proxy Vite en dev (contourne CORS)
    : 'https://api.openweathermap.org/energy/1.0/solar';  // Direct en prod
  private readonly pvConfig: PVSystemConfig;

  /**
   * @param apiKey - OpenWeather API key (required)
   * @param pvConfig - PV system configuration
   */
  constructor(apiKey: string, pvConfig: PVSystemConfig) {
    if (!apiKey) {
      throw new Error('[OpenWeatherProvider] API key is required');
    }
    this.apiKey = apiKey;
    this.pvConfig = pvConfig;
  }

  /**
   * Fetch weekly weather and PV forecast from OpenWeather Solar API.
   *
   * **Endpoint**: GET /solar/data
   * **Query params**:
   * - lat: Latitude
   * - lon: Longitude
   * - appid: API key
   * - start: Unix timestamp (optional)
   * - cnt: Number of hours (default 168 for 7 days)
   *
   * @param startDate - Week start date (ISO string, e.g., "2025-03-17")
   * @param location - Location identifier (format: "lat,lon" e.g., "48.8566,2.3522")
   * @returns Promise resolving to 7-day weather/PV data
   *
   * @throws {Error} If API request fails or location format invalid
   */
  async fetchWeeklyWeather(
    startDate: string,
    location?: string
  ): Promise<readonly DailyWeather[]> {
    // Parse location (default to Paris if not provided)
    const [lat, lon] = this.parseLocation(location ?? '48.8566,2.3522');

    const start = new Date(startDate);
    const startUnix = Math.floor(start.getTime() / 1000);

    // Request 7 days (168 hours) of hourly data
    const url = `${this.apiBaseUrl}/data?lat=${lat}&lon=${lon}&appid=${this.apiKey}&start=${startUnix}&cnt=168`;

    try {
      const response = await fetch(url);

      if (!response.ok) {
        if (response.status === 401) {
          throw new Error('[OpenWeatherProvider] Invalid API key');
        }
        if (response.status === 429) {
          throw new Error('[OpenWeatherProvider] Rate limit exceeded');
        }
        throw new Error(
          `[OpenWeatherProvider] API error: ${response.status} ${response.statusText}`
        );
      }

      const data: OpenWeatherSolarResponse = await response.json();

      if (!data.hourly || data.hourly.length === 0) {
        console.warn('[OpenWeatherProvider] No hourly data returned, using fallback');
        return this.fallbackToClearSky(startDate, lat, lon);
      }

      return this.parseWeatherDays(data, startDate);
    } catch (error) {
      console.error('[OpenWeatherProvider] API fetch failed:', error);
      console.warn('[OpenWeatherProvider] Falling back to clear-sky model');
      return this.fallbackToClearSky(startDate, lat, lon);
    }
  }

  /**
   * Parse location string to lat/lon coordinates.
   *
   * @param location - Format: "lat,lon" (e.g., "48.8566,2.3522")
   * @returns [latitude, longitude]
   */
  private parseLocation(location: string): [number, number] {
    const parts = location.split(',').map((s) => s.trim());
    if (parts.length !== 2) {
      throw new Error(
        `[OpenWeatherProvider] Invalid location format: "${location}". Expected "lat,lon"`
      );
    }

    const lat = parseFloat(parts[0]);
    const lon = parseFloat(parts[1]);

    if (isNaN(lat) || isNaN(lon)) {
      throw new Error(`[OpenWeatherProvider] Invalid coordinates: "${location}"`);
    }

    if (lat < -90 || lat > 90 || lon < -180 || lon > 180) {
      throw new Error(`[OpenWeatherProvider] Coordinates out of range: "${location}"`);
    }

    return [lat, lon];
  }

  /**
   * Parse OpenWeather API response into DailyWeather array.
   * Groups hourly data into 7 daily entries.
   */
  private parseWeatherDays(
    data: OpenWeatherSolarResponse,
    startDate: string
  ): DailyWeather[] {
    const hourly = data.hourly!;
    const dailyWeather: DailyWeather[] = [];

    // Group hourly data by day
    for (let day = 0; day < 7; day++) {
      const startIdx = day * 24;
      const endIdx = Math.min(startIdx + 24, hourly.length);
      const dayData = hourly.slice(startIdx, endIdx);

      // Pad with zeros if incomplete day
      while (dayData.length < 24) {
        dayData.push({ dt: 0, ghi: 0, temp: 15 });
      }

      // Compute daily PV profile
      const { pvTotal_kWh, pvProfile_kW, avgTemp_C } = aggregateDailyPV(
        dayData,
        this.pvConfig
      );

      // Extract temperature profile
      const tempProfile_C = dayData.map((h) => h.temp ?? avgTemp_C);

      // Compute average cloud coverage for description
      const avgClouds =
        dayData.reduce((sum, h) => sum + (h.clouds ?? 50), 0) / dayData.length;
      const { description, icon } = generateWeatherDescription(avgClouds);

      // Generate date string
      const date = new Date(startDate);
      date.setDate(date.getDate() + day);
      const dateStr = date.toISOString().split('T')[0];

      dailyWeather.push({
        day,
        date: dateStr,
        description,
        icon,
        pvTotal_kWh,
        pvProfile_kW,
        avgAmbientTemp_C: avgTemp_C,
        ambientTempProfile_C: tempProfile_C
      });
    }

    return dailyWeather;
  }

  /**
   * Fallback to clear-sky model if API fails.
   * Uses simplified solar geometry for expected irradiance.
   *
   * **Clear-sky GHI** (simplified, Phase 4):
   * - Peak irradiance ~800 W/m² (clear day at solar noon)
   * - Gaussian distribution over daylight hours
   * - No cloud attenuation
   *
   * Future: Use PVLIB clear-sky models (Ineichen, Haurwitz).
   */
  private fallbackToClearSky(
    startDate: string,
    lat: number,
    _lon: number
  ): DailyWeather[] {
    const week: DailyWeather[] = [];
    const baseDate = new Date(startDate);

    // Simplified clear-sky model
    const peakGHI = 800; // W/m² (clear day)
    const dayLengthHours = 12; // Simplified (actual depends on season/latitude)

    for (let day = 0; day < 7; day++) {
      const date = new Date(baseDate);
      date.setDate(baseDate.getDate() + day);
      const dateStr = date.toISOString().split('T')[0];

      // Generate Gaussian irradiance profile
      const hourlyGHI = Array.from({ length: 24 }, (_, hour) => {
        const solarNoon = 12;
        const sigma = dayLengthHours / 4; // Spread factor
        const gaussian = Math.exp(-((hour - solarNoon) ** 2) / (2 * sigma ** 2));
        return peakGHI * gaussian;
      });

      const { pvTotal_kWh, pvProfile_kW } = aggregateDailyPV(
        hourlyGHI.map((ghi) => ({ ghi })),
        this.pvConfig
      );

      // Assume 15°C average (spring/fall)
      const avgTemp_C = 15;
      const tempProfile_C = new Array(24).fill(avgTemp_C);

      week.push({
        day,
        date: dateStr,
        description: 'Ciel dégagé (estimation)',
        icon: '☀️',
        pvTotal_kWh,
        pvProfile_kW,
        avgAmbientTemp_C: avgTemp_C,
        ambientTempProfile_C: tempProfile_C
      });
    }

    return week;
  }
}
