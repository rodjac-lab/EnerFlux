/**
 * Mock weather provider with 3 deterministic weekly presets.
 *
 * Phase 1-3: Used for testing MPC heuristics and AI narrator without API dependency.
 * Each preset simulates a realistic week with different PV production patterns.
 *
 * @module data/providers
 */

import type { DailyWeather, Forecast } from '../../core/forecast';
import type { WeatherProvider } from './DataProvider';

/**
 * Generate hourly PV profile from daily total.
 * Uses a bell curve peaking at noon (simplified solar irradiance model).
 *
 * @param dailyTotal_kWh - Total PV production for the day
 * @returns 24-hour power profile (kW)
 */
function generatePvProfile(dailyTotal_kWh: number): number[] {
  const profile = new Array<number>(24).fill(0);
  const peakHour = 12; // Solar noon
  const spreadHours = 6; // Bell curve width

  let sum = 0;
  for (let h = 0; h < 24; h++) {
    // Gaussian-like distribution
    const offset = h - peakHour;
    const factor = Math.exp(-(offset * offset) / (2 * spreadHours * spreadHours));
    profile[h] = factor;
    sum += factor;
  }

  // Normalize to match daily total
  if (sum > 0) {
    const scale = dailyTotal_kWh / sum;
    for (let h = 0; h < 24; h++) {
      profile[h] = profile[h] * scale;
    }
  }

  return profile;
}

/**
 * Generate hourly temperature profile from daily average.
 * Min at 6h, max at 14h (simplified diurnal cycle).
 */
function generateTempProfile(avgTemp_C: number): number[] {
  const profile = new Array<number>(24);
  const minHour = 6;
  const maxHour = 14;
  const amplitude = 8; // Temperature swing (±4°C from average)

  for (let h = 0; h < 24; h++) {
    // Sinusoidal pattern: coldest at 6h, warmest at 14h
    const phase = ((h - minHour) / 24) * 2 * Math.PI;
    const variation = (amplitude / 2) * Math.sin(phase);
    profile[h] = avgTemp_C + variation;
  }

  return profile;
}

/**
 * Preset 1: "Semaine ensoleillée" (Sunny week)
 * High PV production, stable temperatures.
 * Scenario: Early spring, high pressure system.
 */
const PRESET_SUNNY_WEEK: readonly DailyWeather[] = [
  {
    day: 0,
    date: '2025-03-17', // Monday
    description: 'Ensoleillé',
    icon: 'sun',
    pvTotal_kWh: 28,
    pvProfile_kW: generatePvProfile(28),
    avgAmbientTemp_C: 15,
    ambientTempProfile_C: generateTempProfile(15)
  },
  {
    day: 1,
    date: '2025-03-18',
    description: 'Ensoleillé',
    icon: 'sun',
    pvTotal_kWh: 30,
    pvProfile_kW: generatePvProfile(30),
    avgAmbientTemp_C: 16,
    ambientTempProfile_C: generateTempProfile(16)
  },
  {
    day: 2,
    date: '2025-03-19',
    description: 'Très ensoleillé',
    icon: 'sun',
    pvTotal_kWh: 32,
    pvProfile_kW: generatePvProfile(32),
    avgAmbientTemp_C: 18,
    ambientTempProfile_C: generateTempProfile(18)
  },
  {
    day: 3,
    date: '2025-03-20',
    description: 'Ensoleillé',
    icon: 'sun',
    pvTotal_kWh: 31,
    pvProfile_kW: generatePvProfile(31),
    avgAmbientTemp_C: 17,
    ambientTempProfile_C: generateTempProfile(17)
  },
  {
    day: 4,
    date: '2025-03-21',
    description: 'Ensoleillé',
    icon: 'sun',
    pvTotal_kWh: 29,
    pvProfile_kW: generatePvProfile(29),
    avgAmbientTemp_C: 16,
    ambientTempProfile_C: generateTempProfile(16)
  },
  {
    day: 5,
    date: '2025-03-22',
    description: 'Partiellement ensoleillé',
    icon: 'sun-cloud',
    pvTotal_kWh: 24,
    pvProfile_kW: generatePvProfile(24),
    avgAmbientTemp_C: 15,
    ambientTempProfile_C: generateTempProfile(15)
  },
  {
    day: 6,
    date: '2025-03-23', // Sunday
    description: 'Ensoleillé',
    icon: 'sun',
    pvTotal_kWh: 28,
    pvProfile_kW: generatePvProfile(28),
    avgAmbientTemp_C: 16,
    ambientTempProfile_C: generateTempProfile(16)
  }
];

/**
 * Preset 2: "Semaine variable" (Variable week)
 * Mixed sun/cloud, realistic for testing MPC adaptability.
 * Scenario: Spring shoulder season, passing fronts.
 */
const PRESET_VARIABLE_WEEK: readonly DailyWeather[] = [
  {
    day: 0,
    date: '2025-04-07',
    description: 'Nuageux',
    icon: 'cloud',
    pvTotal_kWh: 12,
    pvProfile_kW: generatePvProfile(12),
    avgAmbientTemp_C: 11,
    ambientTempProfile_C: generateTempProfile(11)
  },
  {
    day: 1,
    date: '2025-04-08',
    description: 'Partiellement nuageux',
    icon: 'sun-cloud',
    pvTotal_kWh: 18,
    pvProfile_kW: generatePvProfile(18),
    avgAmbientTemp_C: 13,
    ambientTempProfile_C: generateTempProfile(13)
  },
  {
    day: 2,
    date: '2025-04-09',
    description: 'Ensoleillé',
    icon: 'sun',
    pvTotal_kWh: 26,
    pvProfile_kW: generatePvProfile(26),
    avgAmbientTemp_C: 15,
    ambientTempProfile_C: generateTempProfile(15)
  },
  {
    day: 3,
    date: '2025-04-10',
    description: 'Ensoleillé',
    icon: 'sun',
    pvTotal_kWh: 28,
    pvProfile_kW: generatePvProfile(28),
    avgAmbientTemp_C: 16,
    ambientTempProfile_C: generateTempProfile(16)
  },
  {
    day: 4,
    date: '2025-04-11',
    description: 'Nuageux',
    icon: 'cloud',
    pvTotal_kWh: 14,
    pvProfile_kW: generatePvProfile(14),
    avgAmbientTemp_C: 12,
    ambientTempProfile_C: generateTempProfile(12)
  },
  {
    day: 5,
    date: '2025-04-12',
    description: 'Pluie légère',
    icon: 'rain',
    pvTotal_kWh: 8,
    pvProfile_kW: generatePvProfile(8),
    avgAmbientTemp_C: 10,
    ambientTempProfile_C: generateTempProfile(10)
  },
  {
    day: 6,
    date: '2025-04-13',
    description: 'Partiellement nuageux',
    icon: 'sun-cloud',
    pvTotal_kWh: 16,
    pvProfile_kW: generatePvProfile(16),
    avgAmbientTemp_C: 12,
    ambientTempProfile_C: generateTempProfile(12)
  }
];

/**
 * Preset 3: "Semaine hivernale" (Winter week)
 * Low PV, cold temperatures, high heating demand.
 * Scenario: Mid-winter, short days, low sun angle.
 */
const PRESET_WINTER_WEEK: readonly DailyWeather[] = [
  {
    day: 0,
    date: '2025-01-13',
    description: 'Nuageux',
    icon: 'cloud',
    pvTotal_kWh: 6,
    pvProfile_kW: generatePvProfile(6),
    avgAmbientTemp_C: 3,
    ambientTempProfile_C: generateTempProfile(3)
  },
  {
    day: 1,
    date: '2025-01-14',
    description: 'Couvert',
    icon: 'cloud',
    pvTotal_kWh: 4,
    pvProfile_kW: generatePvProfile(4),
    avgAmbientTemp_C: 2,
    ambientTempProfile_C: generateTempProfile(2)
  },
  {
    day: 2,
    date: '2025-01-15',
    description: 'Partiellement ensoleillé',
    icon: 'sun-cloud',
    pvTotal_kWh: 10,
    pvProfile_kW: generatePvProfile(10),
    avgAmbientTemp_C: 4,
    ambientTempProfile_C: generateTempProfile(4)
  },
  {
    day: 3,
    date: '2025-01-16',
    description: 'Ensoleillé',
    icon: 'sun',
    pvTotal_kWh: 14,
    pvProfile_kW: generatePvProfile(14),
    avgAmbientTemp_C: 5,
    ambientTempProfile_C: generateTempProfile(5)
  },
  {
    day: 4,
    date: '2025-01-17',
    description: 'Nuageux',
    icon: 'cloud',
    pvTotal_kWh: 7,
    pvProfile_kW: generatePvProfile(7),
    avgAmbientTemp_C: 3,
    ambientTempProfile_C: generateTempProfile(3)
  },
  {
    day: 5,
    date: '2025-01-18',
    description: 'Couvert',
    icon: 'cloud',
    pvTotal_kWh: 5,
    pvProfile_kW: generatePvProfile(5),
    avgAmbientTemp_C: 1,
    ambientTempProfile_C: generateTempProfile(1)
  },
  {
    day: 6,
    date: '2025-01-19',
    description: 'Nuageux',
    icon: 'cloud',
    pvTotal_kWh: 6,
    pvProfile_kW: generatePvProfile(6),
    avgAmbientTemp_C: 2,
    ambientTempProfile_C: generateTempProfile(2)
  }
];

const PRESETS: Record<string, readonly DailyWeather[]> = {
  'sunny-week': PRESET_SUNNY_WEEK,
  'variable-week': PRESET_VARIABLE_WEEK,
  'winter-week': PRESET_WINTER_WEEK
};

/**
 * Mock weather provider implementation.
 * Returns deterministic presets for testing MPC heuristics (Phase 1-3).
 */
export class MockWeatherProvider implements WeatherProvider {
  readonly id = 'mock';
  readonly name = 'Mock Weather (Presets)';

  /**
   * Fetch weekly weather from preset library.
   *
   * @param startDate - Week start date (ISO string) - used to generate correct dates
   * @param location - Preset ID ('sunny-week' | 'variable-week' | 'winter-week')
   * @returns Promise resolving to 7-day weather data
   */
  async fetchWeeklyWeather(startDate: string, location?: string): Promise<readonly DailyWeather[]> {
    const presetId = location ?? 'sunny-week';
    const preset = PRESETS[presetId];

    if (!preset) {
      throw new Error(`Unknown weather preset: ${presetId}. Available: ${Object.keys(PRESETS).join(', ')}`);
    }

    // Simulate async API call (10ms delay)
    await new Promise((resolve) => setTimeout(resolve, 10));

    // Update dates dynamically based on startDate
    const baseDate = new Date(startDate);
    const updatedPreset = preset.map((day, index) => {
      const currentDate = new Date(baseDate);
      currentDate.setDate(baseDate.getDate() + index);
      return {
        ...day,
        day: index,
        date: currentDate.toISOString().split('T')[0]
      };
    });

    return updatedPreset;
  }

  /**
   * Get forecast horizon for MPC lookahead (24h default).
   *
   * @param currentDay - Current day index (0-6)
   * @param currentHour - Current hour (0-23)
   * @param weeklyData - Full weekly weather data
   * @returns Forecast object with 24h lookahead
   */
  getHorizonForecast(
    currentDay: number,
    currentHour: number,
    weeklyData: readonly DailyWeather[]
  ): Forecast {
    const horizonHours = 24;
    const pvNext_kW: number[] = [];
    const ambientTempNext_C: number[] = [];

    for (let h = 0; h < horizonHours; h++) {
      const totalHoursFromStart = currentDay * 24 + currentHour + h;
      const targetDay = Math.floor(totalHoursFromStart / 24);
      const targetHour = totalHoursFromStart % 24;

      if (targetDay >= weeklyData.length) {
        // Beyond week end - assume last day repeats
        const lastDay = weeklyData[weeklyData.length - 1];
        pvNext_kW.push(lastDay.pvProfile_kW[targetHour]);
        ambientTempNext_C.push(lastDay.ambientTempProfile_C[targetHour]);
      } else {
        const dayData = weeklyData[targetDay];
        pvNext_kW.push(dayData.pvProfile_kW[targetHour]);
        ambientTempNext_C.push(dayData.ambientTempProfile_C[targetHour]);
      }
    }

    return {
      horizon_hours: horizonHours,
      pvNext_kW,
      importPricesNext_eur_kWh: [], // Filled by TariffProvider
      exportPricesNext_eur_kWh: [],
      ambientTempNext_C
    };
  }
}
