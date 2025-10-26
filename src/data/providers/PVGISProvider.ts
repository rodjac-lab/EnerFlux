/**
 * PVGIS (Photovoltaic Geographical Information System) provider.
 *
 * Fetches solar radiation data from European Commission's free API:
 * - Historical averages (typical meteorological year)
 * - Hourly radiation profiles
 * - PV system simulation (with tilt/azimuth optimization)
 *
 * **API Endpoint**: https://re.jrc.ec.europa.eu/api/v5_2/
 * **Documentation**: https://joint-research-centre.ec.europa.eu/pvgis-photovoltaic-geographical-information-system/getting-started-pvgis/api-non-interactive-service_en
 * **Coverage**: Europe, Africa, Asia (not worldwide)
 * **Pricing**: FREE (public service by EU Joint Research Centre)
 *
 * **Limitations**:
 * - Historical averages only (no real-time forecasts)
 * - Typical Meteorological Year (TMY) data
 * - Good for long-term planning, not day-ahead prediction
 *
 * Phase 4: Free alternative to OpenWeather for Mode Coach Prédictif.
 *
 * @module data/providers
 */

import type { DailyWeather } from '../../core/forecast';
import type { WeatherProvider } from './DataProvider';

/**
 * PVGIS API response format for hourly PV simulation.
 * Simplified schema based on PVGIS v5.2 documentation.
 */
interface PVGISHourlyResponse {
  inputs: {
    location: { latitude: number; longitude: number };
    pv_module: { peak_power: number };
  };
  outputs: {
    hourly?: Array<{
      /** Timestamp (YYYYMMDDHHMM format) */
      time: string;
      /** PV power output (W) */
      P: number;
      /** Global irradiance (W/m²) */
      G?: number;
      /** Beam irradiance (W/m²) */
      Gb?: number;
      /** Diffuse irradiance (W/m²) */
      Gd?: number;
      /** Temperature (°C) */
      T2m?: number;
    }>;
  };
}

/**
 * PVGIS provider implementation.
 * Uses historical TMY data to estimate typical PV production for a given week.
 *
 * **Note**: PVGIS does not provide forecasts, only historical averages.
 * For a given date (e.g., "2025-03-17"), it returns typical March week data
 * based on multi-year averages.
 *
 * **Rate Limits**: None officially published, but recommended <1000 requests/day.
 * **Caching**: Cache TMY data by location (doesn't change).
 */
export class PVGISProvider implements WeatherProvider {
  readonly id = 'pvgis';
  readonly name = 'PVGIS (European Commission)';

  private readonly apiBaseUrl = 'https://re.jrc.ec.europa.eu/api/v5_2';
  private readonly peakPower_kWp: number;
  private readonly tilt_deg: number;
  private readonly azimuth_deg: number;

  /**
   * @param peakPower_kWp - PV system peak power (kWp)
   * @param tilt_deg - Panel tilt angle (0-90°, default 30)
   * @param azimuth_deg - Panel azimuth (0=North, 180=South, default 180)
   */
  constructor(peakPower_kWp: number, tilt_deg = 30, azimuth_deg = 180) {
    this.peakPower_kWp = peakPower_kWp;
    this.tilt_deg = tilt_deg;
    this.azimuth_deg = azimuth_deg;
  }

  /**
   * Fetch weekly typical weather from PVGIS TMY database.
   *
   * **Endpoint**: GET /seriescalc
   * **Query params**:
   * - lat: Latitude
   * - lon: Longitude
   * - peakpower: System peak power (kWp)
   * - angle: Panel tilt angle (degrees)
   * - aspect: Panel azimuth (degrees, -180 to 180, 0=South)
   * - startyear/endyear: Historical period (uses TMY if omitted)
   * - outputformat: json
   *
   * @param startDate - Week start date (ISO string) - used only for month extraction
   * @param location - Location identifier (format: "lat,lon")
   * @returns Promise resolving to 7-day typical weather data
   *
   * @throws {Error} If API request fails or location invalid
   */
  async fetchWeeklyWeather(
    startDate: string,
    location?: string
  ): Promise<readonly DailyWeather[]> {
    const [lat, lon] = this.parseLocation(location ?? '48.8566,2.3522');

    // PVGIS uses South=0, we use South=180, so convert
    const pvgisAzimuth = this.azimuth_deg - 180;

    // Build API URL for hourly TMY data
    const url = `${this.apiBaseUrl}/seriescalc?lat=${lat}&lon=${lon}&peakpower=${this.peakPower_kWp}&angle=${this.tilt_deg}&aspect=${pvgisAzimuth}&outputformat=json`;

    try {
      const response = await fetch(url);

      if (!response.ok) {
        throw new Error(
          `[PVGISProvider] API error: ${response.status} ${response.statusText}`
        );
      }

      const data: PVGISHourlyResponse = await response.json();

      if (!data.outputs?.hourly || data.outputs.hourly.length === 0) {
        throw new Error('[PVGISProvider] No hourly data returned from PVGIS');
      }

      return this.parseTypicalWeek(data, startDate);
    } catch (error) {
      console.error('[PVGISProvider] API fetch failed:', error);
      throw error; // No fallback (caller should handle)
    }
  }

  /**
   * Parse location string to lat/lon coordinates.
   */
  private parseLocation(location: string): [number, number] {
    const parts = location.split(',').map((s) => s.trim());
    if (parts.length !== 2) {
      throw new Error(
        `[PVGISProvider] Invalid location format: "${location}". Expected "lat,lon"`
      );
    }

    const lat = parseFloat(parts[0]);
    const lon = parseFloat(parts[1]);

    if (isNaN(lat) || isNaN(lon)) {
      throw new Error(`[PVGISProvider] Invalid coordinates: "${location}"`);
    }

    return [lat, lon];
  }

  /**
   * Parse PVGIS TMY data into typical week matching startDate's month.
   *
   * **Strategy**:
   * - Extract month from startDate (e.g., March from "2025-03-17")
   * - Find first week of that month in TMY data
   * - Extract 7 consecutive days
   *
   * @param data - PVGIS API response
   * @param startDate - Requested week start date
   * @returns 7-day typical weather array
   */
  private parseTypicalWeek(
    data: PVGISHourlyResponse,
    startDate: string
  ): DailyWeather[] {
    const hourly = data.outputs.hourly!;

    // Extract target month (1-12) from startDate
    const targetMonth = new Date(startDate).getMonth() + 1; // JS months are 0-indexed

    // Find first hour in TMY data matching target month
    let startIdx = 0;
    for (let i = 0; i < hourly.length; i++) {
      const timeStr = hourly[i].time; // Format: "20050101:0000" or similar
      const month = parseInt(timeStr.substring(4, 6), 10);
      if (month === targetMonth) {
        startIdx = i;
        break;
      }
    }

    // Extract 7 days (168 hours) starting from startIdx
    const weekData = hourly.slice(startIdx, startIdx + 168);

    // Group into days
    const dailyWeather: DailyWeather[] = [];
    for (let day = 0; day < 7; day++) {
      const dayData = weekData.slice(day * 24, (day + 1) * 24);

      // Compute daily PV profile (PVGIS returns power in W, convert to kW)
      const pvProfile_kW = dayData.map((h) => h.P / 1000); // W -> kW
      const pvTotal_kWh = pvProfile_kW.reduce((sum, p) => sum + p, 0);

      // Extract temperature profile (default 15°C if missing)
      const tempProfile_C = dayData.map((h) => h.T2m ?? 15);
      const avgTemp_C =
        tempProfile_C.reduce((sum, t) => sum + t, 0) / tempProfile_C.length;

      // Generate description based on production
      const { description, icon } = this.generateDescription(pvTotal_kWh);

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
   * Generate weather description from daily PV production.
   * Heuristic: High production = sunny, low = cloudy.
   */
  private generateDescription(pvTotal_kWh: number): {
    description: string;
    icon: string;
  } {
    const peakDailyProduction = this.peakPower_kWp * 5; // Typical sunny day ~5h peak equivalent

    const ratio = pvTotal_kWh / peakDailyProduction;

    if (ratio > 0.7) {
      return { description: 'Ensoleillé (TMY)', icon: '☀️' };
    }
    if (ratio > 0.4) {
      return { description: 'Partiellement nuageux (TMY)', icon: '⛅' };
    }
    if (ratio > 0.2) {
      return { description: 'Nuageux (TMY)', icon: '☁️' };
    }
    return { description: 'Très nuageux (TMY)', icon: '🌥️' };
  }
}
