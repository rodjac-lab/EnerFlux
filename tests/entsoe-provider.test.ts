/**
 * ENTSO-E Historical Provider Tests
 *
 * Validates ENTSO-E data loading, parsing, and tariff generation.
 */

import { describe, it, expect } from 'vitest';
import { EntsoeHistoricalProvider } from '../src/data/providers/EntsoeHistoricalProvider';
import {
  createEntsoeDefaults,
  getSummerNegativePricesScenario,
  getWinterPeakScenario,
  getEntsoeStats
} from '../src/data/scenarios-entsoe';

describe('EntsoeHistoricalProvider', () => {
  it('should load dataset metadata', () => {
    const provider = new EntsoeHistoricalProvider();
    const metadata = provider.getMetadata();

    expect(metadata.biddingZone).toBe('10YFR-RTE------C');
    expect(metadata.dateRange.start).toBe('2023-01-15');
    expect(metadata.dateRange.end).toBe('2024-11-06');
    expect(metadata.recordCount).toBeGreaterThan(0);
  });

  it('should fetch daily data for known dates', () => {
    const provider = new EntsoeHistoricalProvider();

    // Summer day with negative prices
    const summerDay = provider.getDailyData('2023-06-15');
    expect(summerDay).toBeDefined();
    expect(summerDay!.hourlyPrices_eur_kwh).toHaveLength(24);
    expect(summerDay!.minPrice_eur_kwh).toBeLessThan(0); // Negative price expected

    // Winter peak day
    const winterDay = provider.getDailyData('2023-01-15');
    expect(winterDay).toBeDefined();
    expect(winterDay!.hourlyPrices_eur_kwh).toHaveLength(24);
    expect(winterDay!.maxPrice_eur_kwh).toBeGreaterThan(0.2); // High peak expected
  });

  it('should return undefined for missing dates', () => {
    const provider = new EntsoeHistoricalProvider();
    const missing = provider.getDailyData('2025-12-31'); // Future date
    expect(missing).toBeUndefined();
  });

  it('should fetch weekly tariff data', async () => {
    const provider = new EntsoeHistoricalProvider();
    const weekly = await provider.fetchWeeklyTariff('2023-06-15');

    expect(weekly).toHaveLength(7);
    for (const day of weekly) {
      expect(day.importPriceSeries_eur_kWh).toHaveLength(24);
      expect(day.exportPriceSeries_eur_kWh).toHaveLength(24);
      expect(day.tariffType).toBe('fixed'); // Mode used for variable pricing
    }
  });

  it('should handle date ranges spanning multiple weeks', async () => {
    const provider = new EntsoeHistoricalProvider();

    // Fetch two consecutive weeks
    const week1 = await provider.fetchWeeklyTariff('2023-06-15');
    const week2 = await provider.fetchWeeklyTariff('2023-06-22');

    expect(week1).toHaveLength(7);
    expect(week2).toHaveLength(7);

    // Verify dates are consecutive
    const lastDayWeek1 = new Date(week1[6].date);
    const firstDayWeek2 = new Date(week2[0].date);
    const dayDiff = (firstDayWeek2.getTime() - lastDayWeek1.getTime()) / (1000 * 60 * 60 * 24);
    expect(dayDiff).toBe(1);
  });

  it('should convert €/MWh to €/kWh correctly', () => {
    const provider = new EntsoeHistoricalProvider();
    const dailyData = provider.getDailyData('2023-06-15');

    expect(dailyData).toBeDefined();
    // Prices should be in reasonable €/kWh range (0.0 to 0.5 typically)
    for (const price of dailyData!.hourlyPrices_eur_kwh) {
      expect(price).toBeGreaterThan(-0.05); // Rarely below -50 €/MWh
      expect(price).toBeLessThan(0.5); // Rarely above 500 €/MWh
    }
  });

  it('should handle negative prices correctly', () => {
    const provider = new EntsoeHistoricalProvider();
    const summerDay = provider.getDailyData('2023-06-15');

    expect(summerDay).toBeDefined();
    const negativePrices = summerDay!.hourlyPrices_eur_kwh.filter((p) => p < 0);
    expect(negativePrices.length).toBeGreaterThan(0); // Summer dataset includes negative prices
  });

  it('should provide tariff horizon forecast', async () => {
    const provider = new EntsoeHistoricalProvider();
    const weekly = await provider.fetchWeeklyTariff('2023-06-15');

    // Day 0, hour 12 - should get next 24 hours
    const forecast = provider.getTariffHorizonForecast(0, 12, weekly);

    expect(forecast.importPricesNext_eur_kWh).toHaveLength(24);
    expect(forecast.exportPricesNext_eur_kWh).toHaveLength(24);

    // First hour should match day 0, hour 12
    expect(forecast.importPricesNext_eur_kWh[0]).toBe(weekly[0].importPriceSeries_eur_kWh[12]);
  });

  it('should handle forecast crossing midnight', async () => {
    const provider = new EntsoeHistoricalProvider();
    const weekly = await provider.fetchWeeklyTariff('2023-06-15');

    // Day 0, hour 23 - forecast should cross into day 1
    const forecast = provider.getTariffHorizonForecast(0, 23, weekly);

    expect(forecast.importPricesNext_eur_kWh).toHaveLength(24);

    // Hour 0 = day 0 hour 23
    expect(forecast.importPricesNext_eur_kWh[0]).toBe(weekly[0].importPriceSeries_eur_kWh[23]);

    // Hour 1 = day 1 hour 0
    expect(forecast.importPricesNext_eur_kWh[1]).toBe(weekly[1].importPriceSeries_eur_kWh[0]);
  });
});

describe('ENTSO-E Scenario Helpers', () => {
  it('should create scenario defaults with spot prices', async () => {
    const defaults = await createEntsoeDefaults('2023-06-15', 96, 900);

    expect(defaults.tariffs.mode).toBe('profile');
    expect(Array.isArray(defaults.tariffs.import_EUR_per_kWh)).toBe(true);
    expect((defaults.tariffs.import_EUR_per_kWh as number[]).length).toBe(96);

    // Battery config present
    expect(defaults.batteryConfig.capacity_kWh).toBeGreaterThan(0);

    // ECS config present
    expect(defaults.ecsConfig.volume_L).toBeGreaterThan(0);
  });

  it('should provide pre-configured summer scenario', async () => {
    const defaults = await getSummerNegativePricesScenario();

    expect(defaults.tariffs.mode).toBe('profile');
    expect(Array.isArray(defaults.tariffs.import_EUR_per_kWh)).toBe(true);

    // Check for negative prices (expected in summer dataset)
    const prices = defaults.tariffs.import_EUR_per_kWh as number[];
    const hasNegative = prices.some((p) => p < 0);
    expect(hasNegative).toBe(true);
  });

  it('should provide pre-configured winter scenario', async () => {
    const defaults = await getWinterPeakScenario();

    expect(defaults.tariffs.mode).toBe('profile');
    expect(Array.isArray(defaults.tariffs.import_EUR_per_kWh)).toBe(true);

    // Check for high peak prices (expected in winter dataset)
    const prices = defaults.tariffs.import_EUR_per_kWh as number[];
    const maxPrice = Math.max(...prices);
    expect(maxPrice).toBeGreaterThan(0.2); // Winter peaks > 200 €/MWh
  });

  it('should provide dataset statistics', () => {
    const stats = getEntsoeStats();

    expect(stats.biddingZone).toBe('10YFR-RTE------C');
    expect(stats.version).toBeTruthy();
    expect(stats.dateRange.start).toBeTruthy();
    expect(stats.dateRange.end).toBeTruthy();
    expect(stats.recordCount).toBeGreaterThan(0);
  });
});

describe('ENTSO-E Price Characteristics', () => {
  it('should show seasonal variation', () => {
    const provider = new EntsoeHistoricalProvider();

    // Summer day
    const summer = provider.getDailyData('2023-06-15');
    expect(summer).toBeDefined();

    // Winter day
    const winter = provider.getDailyData('2023-01-15');
    expect(winter).toBeDefined();

    // Winter should have higher average prices
    expect(winter!.avgPrice_eur_kwh).toBeGreaterThan(summer!.avgPrice_eur_kwh);
  });

  it('should show daily peak pattern', () => {
    const provider = new EntsoeHistoricalProvider();
    const day = provider.getDailyData('2023-01-15');

    expect(day).toBeDefined();

    // Evening peak (18h-20h) should be higher than night (2h-4h)
    const eveningPrices = [
      day!.hourlyPrices_eur_kwh[18],
      day!.hourlyPrices_eur_kwh[19],
      day!.hourlyPrices_eur_kwh[20]
    ];
    const nightPrices = [
      day!.hourlyPrices_eur_kwh[2],
      day!.hourlyPrices_eur_kwh[3],
      day!.hourlyPrices_eur_kwh[4]
    ];

    const avgEvening = eveningPrices.reduce((sum, p) => sum + p, 0) / 3;
    const avgNight = nightPrices.reduce((sum, p) => sum + p, 0) / 3;

    expect(avgEvening).toBeGreaterThan(avgNight);
  });

  it('should show solar duck curve in summer', () => {
    const provider = new EntsoeHistoricalProvider();
    const summerDay = provider.getDailyData('2023-06-15');

    expect(summerDay).toBeDefined();

    // Midday (12h-14h) should have lowest prices (or negative)
    const middayPrices = [
      summerDay!.hourlyPrices_eur_kwh[12],
      summerDay!.hourlyPrices_eur_kwh[13],
      summerDay!.hourlyPrices_eur_kwh[14]
    ];

    const morningPrices = [
      summerDay!.hourlyPrices_eur_kwh[8],
      summerDay!.hourlyPrices_eur_kwh[9],
      summerDay!.hourlyPrices_eur_kwh[10]
    ];

    const avgMidday = middayPrices.reduce((sum, p) => sum + p, 0) / 3;
    const avgMorning = morningPrices.reduce((sum, p) => sum + p, 0) / 3;

    // Solar surplus causes midday price drop
    expect(avgMidday).toBeLessThan(avgMorning);
  });
});
