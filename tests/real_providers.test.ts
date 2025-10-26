/**
 * Integration tests for real API providers (Phase 4).
 *
 * Tests DataProviderFactory with mocked API responses.
 * Validates:
 * - Provider instantiation and configuration
 * - API response parsing
 * - Fallback chain behavior
 * - Error handling and graceful degradation
 *
 * @group integration
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  DataProviderFactory,
  OpenWeatherProvider,
  PVGISProvider,
  RTETempoProvider
} from '../src/data/providers';

// Mock global fetch
const mockFetch = vi.fn();
global.fetch = mockFetch as any;

describe('DataProviderFactory', () => {
  beforeEach(() => {
    mockFetch.mockClear();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Mode Selection', () => {
    it('creates mock provider in mock mode', () => {
      const provider = DataProviderFactory.create('mock');

      // Mock provider should have mock weather and tariff providers
      expect(provider.weatherProvider).toBeDefined();
      expect(provider.tariffProvider).toBeDefined();
      expect(provider.weatherProvider.name).toContain('Mock');
      expect(provider.tariffProvider.name).toContain('Mock');
    });

    it('creates real provider in real mode with config', () => {
      const provider = DataProviderFactory.create('real', {
        openWeatherApiKey: 'test-key',
        pvSystem: { peakPower_kWp: 6, efficiency: 0.75 },
        weatherProvider: 'openweather',
        tariffProvider: 'rte-tempo'
      });

      // Should have real providers (exact implementation is wrapped in fallback)
      expect(provider).toBeDefined();
      expect(provider.weatherProvider).toBeDefined();
      expect(provider.tariffProvider).toBeDefined();
    });

    it('falls back to mock in auto mode when config missing', () => {
      const provider = DataProviderFactory.create('auto');

      expect(provider.weatherProvider).toBeDefined();
      expect(provider.tariffProvider).toBeDefined();
      expect(provider.weatherProvider.name).toContain('Mock');
      expect(provider.tariffProvider.name).toContain('Mock');
    });

    it('throws error in real mode without PV config', () => {
      expect(() => {
        DataProviderFactory.create('real');
      }).toThrow('PV system config required');
    });
  });

  describe('Factory Shortcuts', () => {
    it('createMock() creates mock provider', () => {
      const provider = DataProviderFactory.createMock();

      expect(provider.weatherProvider).toBeDefined();
      expect(provider.weatherProvider.name).toContain('Mock');
    });

    it('createReal() creates OpenWeather + RTE Tempo', () => {
      const provider = DataProviderFactory.createReal(
        'test-key',
        { peakPower_kWp: 6 },
        '48.8566,2.3522'
      );

      expect(provider).toBeDefined();
    });

    it('createFree() creates PVGIS + RTE Tempo', () => {
      const provider = DataProviderFactory.createFree(
        { peakPower_kWp: 6 },
        '48.8566,2.3522'
      );

      expect(provider).toBeDefined();
    });
  });
});

describe('RTETempoProvider', () => {
  beforeEach(() => {
    mockFetch.mockClear();
  });

  it('fetches weekly Tempo colors from RTE API', async () => {
    const mockResponse = {
      tempo_like_calendars: {
        start_date: '2025-03-17T00:00:00+01:00',
        end_date: '2025-03-24T00:00:00+01:00',
        values: [
          {
            start_date: '2025-03-17T00:00:00+01:00',
            end_date: '2025-03-18T00:00:00+01:00',
            updated_date: '2025-03-16T10:30:00+01:00',
            value: 'BLUE'
          },
          {
            start_date: '2025-03-18T00:00:00+01:00',
            end_date: '2025-03-19T00:00:00+01:00',
            updated_date: '2025-03-17T10:30:00+01:00',
            value: 'WHITE'
          },
          {
            start_date: '2025-03-19T00:00:00+01:00',
            end_date: '2025-03-20T00:00:00+01:00',
            updated_date: '2025-03-18T10:30:00+01:00',
            value: 'RED'
          },
          {
            start_date: '2025-03-20T00:00:00+01:00',
            end_date: '2025-03-21T00:00:00+01:00',
            updated_date: '2025-03-19T10:30:00+01:00',
            value: 'BLUE'
          },
          {
            start_date: '2025-03-21T00:00:00+01:00',
            end_date: '2025-03-22T00:00:00+01:00',
            updated_date: '2025-03-20T10:30:00+01:00',
            value: 'BLUE'
          },
          {
            start_date: '2025-03-22T00:00:00+01:00',
            end_date: '2025-03-23T00:00:00+01:00',
            updated_date: '2025-03-21T10:30:00+01:00',
            value: 'WHITE'
          },
          {
            start_date: '2025-03-23T00:00:00+01:00',
            end_date: '2025-03-24T00:00:00+01:00',
            updated_date: '2025-03-22T10:30:00+01:00',
            value: 'BLUE'
          }
        ]
      }
    };

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockResponse
    });

    const provider = new RTETempoProvider();
    const tariffs = await provider.fetchWeeklyTariff('2025-03-17');

    expect(mockFetch).toHaveBeenCalledOnce();
    expect(tariffs).toHaveLength(7);

    // Validate first day (BLUE)
    expect(tariffs[0].date).toBe('2025-03-17');
    expect(tariffs[0].tempoColor).toBe('BLUE');
    expect(tariffs[0].tariffType).toBe('tempo');
    expect(tariffs[0].peakPrice_eur_kWh).toBe(0.1609); // BLUE HP

    // Validate RED day
    expect(tariffs[2].tempoColor).toBe('RED');
    expect(tariffs[2].peakPrice_eur_kWh).toBe(0.7562); // RED HP (expensive!)

    // Validate hourly prices (24 values)
    expect(tariffs[0].importPriceSeries_eur_kWh).toHaveLength(24);
    expect(tariffs[0].exportPriceSeries_eur_kWh).toHaveLength(24);

    // Off-peak hours (22h-6h) should have lower price
    const offpeakPrice = tariffs[0].importPriceSeries_eur_kWh[23]; // 23h
    const peakPrice = tariffs[0].importPriceSeries_eur_kWh[12]; // 12h
    expect(offpeakPrice).toBeLessThan(peakPrice);
  });

  it('falls back to BLUE week on API failure', async () => {
    mockFetch.mockRejectedValueOnce(new Error('Network error'));

    const provider = new RTETempoProvider();
    const tariffs = await provider.fetchWeeklyTariff('2025-03-17');

    expect(tariffs).toHaveLength(7);
    // All days should be BLUE (safe fallback)
    expect(tariffs.every((t) => t.tempoColor === 'BLUE')).toBe(true);
  });

  it('handles API 401 unauthorized gracefully', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 401,
      statusText: 'Unauthorized'
    });

    const provider = new RTETempoProvider();
    const tariffs = await provider.fetchWeeklyTariff('2025-03-17');

    // Falls back to BLUE
    expect(tariffs).toHaveLength(7);
    expect(tariffs[0].tempoColor).toBe('BLUE');
  });
});

describe('OpenWeatherProvider', () => {
  beforeEach(() => {
    mockFetch.mockClear();
  });

  it('fetches solar irradiance forecast from OpenWeather API', async () => {
    const mockResponse = {
      lat: 48.8566,
      lon: 2.3522,
      timezone_offset: 3600,
      hourly: Array.from({ length: 168 }, (_, i) => {
        const hour = i % 24;
        const solarNoon = 12;
        const sigma = 4;
        const gaussian = Math.exp(-((hour - solarNoon) ** 2) / (2 * sigma ** 2));
        const ghi = 800 * gaussian; // Peak 800 W/m² at noon

        return {
          dt: 1710691200 + i * 3600, // Mock timestamp
          ghi,
          dni: ghi * 0.8,
          dhi: ghi * 0.2,
          temp: 15 + Math.sin(hour / 24) * 5, // Temp variation
          clouds: 30
        };
      })
    };

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockResponse
    });

    const provider = new OpenWeatherProvider('test-key', {
      peakPower_kWp: 6,
      efficiency: 0.75
    });

    const weather = await provider.fetchWeeklyWeather('2025-03-17', '48.8566,2.3522');

    expect(mockFetch).toHaveBeenCalledOnce();
    expect(weather).toHaveLength(7);

    // Validate first day
    expect(weather[0].date).toBe('2025-03-17');
    expect(weather[0].pvProfile_kW).toHaveLength(24);
    expect(weather[0].ambientTempProfile_C).toHaveLength(24);

    // Peak production should be around noon
    const noonPower = weather[0].pvProfile_kW[12];
    const midnightPower = weather[0].pvProfile_kW[0];
    expect(noonPower).toBeGreaterThan(midnightPower);
    expect(noonPower).toBeGreaterThan(0);

    // Daily total should be reasonable
    expect(weather[0].pvTotal_kWh).toBeGreaterThan(10);
    expect(weather[0].pvTotal_kWh).toBeLessThan(40);

    // Description should reflect cloud coverage
    expect(weather[0].description).toBeDefined();
    expect(weather[0].icon).toBeDefined();
  });

  it('validates location format', async () => {
    const provider = new OpenWeatherProvider('test-key', { peakPower_kWp: 6 });

    await expect(
      provider.fetchWeeklyWeather('2025-03-17', 'invalid')
    ).rejects.toThrow('Invalid location format');

    await expect(
      provider.fetchWeeklyWeather('2025-03-17', 'abc,def')
    ).rejects.toThrow('Invalid coordinates');

    await expect(
      provider.fetchWeeklyWeather('2025-03-17', '100,200')
    ).rejects.toThrow('out of range');
  });

  it('falls back to clear-sky model on API failure', async () => {
    mockFetch.mockRejectedValueOnce(new Error('API error'));

    const provider = new OpenWeatherProvider('test-key', {
      peakPower_kWp: 6,
      efficiency: 0.75
    });

    const weather = await provider.fetchWeeklyWeather('2025-03-17', '48.8566,2.3522');

    expect(weather).toHaveLength(7);
    expect(weather[0].description).toContain('estimation');

    // Clear-sky model should produce reasonable values
    expect(weather[0].pvTotal_kWh).toBeGreaterThan(10);
  });

  it('handles API 401 error with fallback', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 401,
      statusText: 'Unauthorized'
    });

    const provider = new OpenWeatherProvider('test-key', { peakPower_kWp: 6 });

    // OpenWeather falls back to clear-sky on error
    const weather = await provider.fetchWeeklyWeather('2025-03-17', '48.8566,2.3522');
    
    expect(weather).toHaveLength(7);
    expect(weather[0].description).toContain('estimation');
  });
});

describe('PVGISProvider', () => {
  beforeEach(() => {
    mockFetch.mockClear();
  });

  it('fetches typical meteorological year data from PVGIS', async () => {
    // Mock PVGIS response (hourly TMY data for March)
    const mockResponse = {
      inputs: {
        location: { latitude: 48.8566, longitude: 2.3522 },
        pv_module: { peak_power: 6 }
      },
      outputs: {
        hourly: Array.from({ length: 8760 }, (_, i) => {
          const month = Math.floor(i / 730) + 1; // Approximate month
          const hour = i % 24;
          const dayOfYear = Math.floor(i / 24);

          // Generate March data (month 3)
          const isMarch = month === 3;
          const solarNoon = 12;
          const sigma = 4;
          const gaussian = Math.exp(-((hour - solarNoon) ** 2) / (2 * sigma ** 2));
          const power_W = isMarch ? 4000 * gaussian : 0; // 4kW peak for March

          return {
            time: `2005${String(month).padStart(2, '0')}${String(
              (dayOfYear % 30) + 1
            ).padStart(2, '0')}:${String(hour).padStart(2, '0')}00`,
            P: power_W,
            G: power_W / 0.15, // Rough irradiance
            T2m: 10 + Math.sin(hour / 24) * 5
          };
        })
      }
    };

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockResponse
    });

    const provider = new PVGISProvider(6, 30, 180);
    const weather = await provider.fetchWeeklyWeather('2025-03-17', '48.8566,2.3522');

    expect(mockFetch).toHaveBeenCalledOnce();
    expect(weather).toHaveLength(7);

    // Validate first day
    expect(weather[0].date).toBe('2025-03-17');
    expect(weather[0].pvProfile_kW).toHaveLength(24);
    expect(weather[0].description).toContain('TMY');

    // March should have reasonable production
    expect(weather[0].pvTotal_kWh).toBeGreaterThan(5);
    expect(weather[0].pvTotal_kWh).toBeLessThan(50);
  });

  it('validates location format', async () => {
    const provider = new PVGISProvider(6);

    await expect(provider.fetchWeeklyWeather('2025-03-17', 'invalid')).rejects.toThrow(
      'Invalid location format'
    );
  });

  it('throws error on API failure (no fallback)', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 500,
      statusText: 'Internal Server Error'
    });

    const provider = new PVGISProvider(6);

    await expect(
      provider.fetchWeeklyWeather('2025-03-17', '48.8566,2.3522')
    ).rejects.toThrow('API error');
  });
});

describe('Fallback Chain Integration', () => {
  beforeEach(() => {
    mockFetch.mockClear();
  });

  it('falls back from OpenWeather to PVGIS to Mock', async () => {
    // First call (OpenWeather) fails
    mockFetch.mockRejectedValueOnce(new Error('OpenWeather API error'));

    // Second call (PVGIS) fails
    mockFetch.mockRejectedValueOnce(new Error('PVGIS API error'));

    // Provider should eventually use mock (no API calls)
    const provider = DataProviderFactory.create('real', {
      openWeatherApiKey: 'test-key',
      pvSystem: { peakPower_kWp: 6 },
      weatherProvider: 'auto'
    });

    const forecast = await provider.fetchWeeklyForecast('2025-03-17', {
      location: '48.8566,2.3522'
    });

    // Should get mock data as final fallback
    expect(forecast.weather).toHaveLength(7);
    expect(forecast.tariffs).toHaveLength(7);
  });

  it('succeeds on first provider (no fallback needed)', async () => {
    // Mock successful OpenWeather response
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        lat: 48.8566,
        lon: 2.3522,
        hourly: Array(168).fill({ dt: 0, ghi: 500, temp: 15, clouds: 30 })
      })
    });

    // Mock successful RTE response
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        tempo_like_calendars: {
          values: Array(7).fill({
            start_date: '2025-03-17T00:00:00+01:00',
            end_date: '2025-03-18T00:00:00+01:00',
            value: 'BLUE'
          })
        }
      })
    });

    const provider = DataProviderFactory.createReal(
      'test-key',
      { peakPower_kWp: 6 },
      '48.8566,2.3522'
    );

    const forecast = await provider.fetchWeeklyForecast('2025-03-17');

    expect(forecast.weather).toHaveLength(7);
    expect(forecast.tariffs).toHaveLength(7);
    expect(mockFetch).toHaveBeenCalledTimes(2); // Weather + Tariff
  });
});
