/**
 * Data provider factory for mock/real API switching.
 *
 * Centralizes provider instantiation and selection logic:
 * - Mock providers (Phase 1-3): Deterministic presets for testing
 * - Real providers (Phase 4+): Live API integration
 * - Fallback chain: Real → Fallback → Mock
 *
 * **Architecture**:
 * ```
 * DataProviderFactory
 *   ├─ Weather: OpenWeather (paid) → PVGIS (free) → Mock
 *   └─ Tariff: RTE Tempo (official) → Mock
 * ```
 *
 * Phase 4: Factory pattern for seamless mock/real switching.
 *
 * @module data/providers
 */

import type { DataProvider, WeatherProvider, TariffProvider } from './DataProvider';
import type { WeeklyForecast } from '../../core/forecast';
import { MockDataProvider, MockWeatherProvider, MockTariffProvider } from './index';
import { OpenWeatherProvider, type PVSystemConfig } from './OpenWeatherProvider';
import { PVGISProvider } from './PVGISProvider';
import { RTETempoProvider } from './RTETempoProvider';

/**
 * Provider mode selection.
 */
export type ProviderMode = 'mock' | 'real' | 'auto';

/**
 * Configuration for real API providers.
 */
export interface RealProviderConfig {
  /** OpenWeather API key (optional, required for OpenWeather) */
  openWeatherApiKey?: string;

  /** PV system configuration (required for real providers) */
  pvSystem: PVSystemConfig;

  /** Default location (format: "lat,lon", e.g., "48.8566,2.3522") */
  defaultLocation?: string;

  /** Weather provider preference: 'openweather' | 'pvgis' | 'auto' */
  weatherProvider?: 'openweather' | 'pvgis' | 'auto';

  /** Tariff provider preference: 'rte-tempo' | 'mock' */
  tariffProvider?: 'rte-tempo' | 'mock';
}

/**
 * Combined data provider with fallback chain.
 * Implements DataProvider interface with real/mock switching.
 */
export class CombinedDataProvider implements DataProvider {
  readonly weatherProvider: WeatherProvider;
  readonly tariffProvider: TariffProvider;

  constructor(weatherProvider: WeatherProvider, tariffProvider: TariffProvider) {
    this.weatherProvider = weatherProvider;
    this.tariffProvider = tariffProvider;
  }

  async fetchWeeklyForecast(
    startDate: string,
    options?: {
      location?: string;
      tariffType?: 'tempo' | 'tou' | 'fixed';
    }
  ): Promise<WeeklyForecast> {
    const [weather, tariffs] = await Promise.all([
      this.weatherProvider.fetchWeeklyWeather(startDate, options?.location),
      this.tariffProvider.fetchWeeklyTariff(startDate, options?.tariffType ?? 'tempo')
    ]);

    return {
      startDate,
      weather,
      tariffs
    };
  }
}

/**
 * Weather provider with fallback chain.
 * Tries primary provider first, falls back to secondary, then mock.
 */
class FallbackWeatherProvider implements WeatherProvider {
  readonly id = 'fallback-weather';
  readonly name: string;

  private readonly providers: WeatherProvider[];

  constructor(providers: WeatherProvider[]) {
    this.providers = providers;
    this.name = `Fallback (${providers.map((p) => p.name).join(' → ')})`;
  }

  async fetchWeeklyWeather(
    startDate: string,
    location?: string
  ): Promise<readonly import('../../core/forecast').DailyWeather[]> {
    let lastError: Error | undefined;

    for (const provider of this.providers) {
      try {
        console.log(`[FallbackWeatherProvider] Trying ${provider.name}...`);
        const result = await provider.fetchWeeklyWeather(startDate, location);
        console.log(`[FallbackWeatherProvider] ✓ Success with ${provider.name}`);
        return result;
      } catch (error) {
        console.warn(`[FallbackWeatherProvider] ✗ ${provider.name} failed:`, error);
        lastError = error as Error;
      }
    }

    throw new Error(
      `[FallbackWeatherProvider] All providers failed. Last error: ${lastError?.message}`
    );
  }
}

/**
 * Data provider factory.
 * Creates appropriate provider based on mode and configuration.
 */
export class DataProviderFactory {
  /**
   * Create data provider based on mode.
   *
   * **Modes**:
   * - `mock`: Use deterministic mock providers (Phase 1-3)
   * - `real`: Use real APIs with fallback chain (Phase 4+)
   * - `auto`: Try real first, fall back to mock if config missing
   *
   * **Real mode fallback chain**:
   * - Weather: OpenWeather (if API key) → PVGIS (free) → Mock
   * - Tariff: RTE Tempo (official) → Mock
   *
   * @param mode - Provider mode
   * @param config - Real provider configuration (required for 'real' mode)
   * @returns DataProvider instance
   *
   * @example
   * // Mock mode (testing)
   * const provider = DataProviderFactory.create('mock');
   *
   * @example
   * // Real mode (production)
   * const provider = DataProviderFactory.create('real', {
   *   openWeatherApiKey: 'your-api-key',
   *   pvSystem: { peakPower_kWp: 6, efficiency: 0.75 },
   *   defaultLocation: '48.8566,2.3522'
   * });
   *
   * @example
   * // Auto mode (dev/staging)
   * const provider = DataProviderFactory.create('auto', {
   *   pvSystem: { peakPower_kWp: 6 }
   * });
   */
  static create(mode: ProviderMode, config?: RealProviderConfig): DataProvider {
    if (mode === 'mock') {
      return new MockDataProvider();
    }

    if (mode === 'real' || mode === 'auto') {
      if (!config?.pvSystem) {
        if (mode === 'auto') {
          console.warn(
            '[DataProviderFactory] PV system config missing, falling back to mock'
          );
          return new MockDataProvider();
        }
        throw new Error('[DataProviderFactory] PV system config required for real mode');
      }

      return this.createRealProvider(config);
    }

    throw new Error(`[DataProviderFactory] Unknown mode: ${mode}`);
  }

  /**
   * Create real provider with fallback chain.
   */
  private static createRealProvider(config: RealProviderConfig): DataProvider {
    const weatherProviders: WeatherProvider[] = [];
    const weatherPref = config.weatherProvider ?? 'auto';

    // Build weather provider chain
    if (weatherPref === 'openweather' || weatherPref === 'auto') {
      if (config.openWeatherApiKey) {
        weatherProviders.push(
          new OpenWeatherProvider(config.openWeatherApiKey, config.pvSystem)
        );
      } else if (weatherPref === 'openweather') {
        throw new Error(
          '[DataProviderFactory] OpenWeather API key required for openweather preference'
        );
      }
    }

    if (weatherPref === 'pvgis' || weatherPref === 'auto') {
      weatherProviders.push(
        new PVGISProvider(
          config.pvSystem.peakPower_kWp,
          config.pvSystem.tilt_deg,
          config.pvSystem.azimuth_deg
        )
      );
    }

    // Always add mock as final fallback
    weatherProviders.push(new MockWeatherProvider());

    const weatherProvider =
      weatherProviders.length === 1
        ? weatherProviders[0]
        : new FallbackWeatherProvider(weatherProviders);

    // Tariff provider (RTE Tempo or mock)
    const tariffPref = config.tariffProvider ?? 'rte-tempo';
    const tariffProvider =
      tariffPref === 'rte-tempo' ? new RTETempoProvider() : new MockTariffProvider();

    return new CombinedDataProvider(weatherProvider, tariffProvider);
  }

  /**
   * Create mock provider (shorthand for create('mock')).
   */
  static createMock(): DataProvider {
    return new MockDataProvider();
  }

  /**
   * Create real provider with OpenWeather + RTE Tempo (shorthand).
   */
  static createReal(
    openWeatherApiKey: string,
    pvSystem: PVSystemConfig,
    defaultLocation?: string
  ): DataProvider {
    return this.create('real', {
      openWeatherApiKey,
      pvSystem,
      defaultLocation,
      weatherProvider: 'openweather',
      tariffProvider: 'rte-tempo'
    });
  }

  /**
   * Create real provider with PVGIS (free) + RTE Tempo (shorthand).
   */
  static createFree(pvSystem: PVSystemConfig, defaultLocation?: string): DataProvider {
    return this.create('real', {
      pvSystem,
      defaultLocation,
      weatherProvider: 'pvgis',
      tariffProvider: 'rte-tempo'
    });
  }
}
