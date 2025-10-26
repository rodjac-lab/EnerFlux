/**
 * Tests for AI Narrative Generator
 * Validates insight generation quality and relevance
 */

import { describe, it, expect } from 'vitest';
import { generateWeeklyNarrative } from '../src/core/aiNarrative';
import { MockDataProvider, runWeeklySimulation, compareWeeklySimulations, mpcBalancedStrategy, mpcToReactiveStrategy } from '../src/core/mpc';
import { Battery } from '../src/devices/Battery';
import { DHWTank } from '../src/devices/DHWTank';
import { ecsFirstStrategy } from '../src/core/strategy';

const createDevices = () => [
  new Battery('batt', 'Batterie', {
    capacity_kWh: 10, pMax_kW: 5, etaCharge: 0.95, etaDischarge: 0.95,
    socInit_kWh: 5, socMin_kWh: 1, socMax_kWh: 10
  }),
  new DHWTank('dhw', 'Ballon', {
    volume_L: 200, resistivePower_kW: 3, efficiency: 0.95,
    lossCoeff_W_per_K: 8, ambientTemp_C: 20, targetTemp_C: 55, initialTemp_C: 45
  })
];

describe('AI Narrative Generator', () => {
  it('generates insights for sunny week with Tempo', async () => {
    const provider = new MockDataProvider();
    const forecast = await provider.fetchWeeklyForecast('2025-03-17', {
      location: 'sunny-week',
      tariffType: 'tempo'
    });

    const result = runWeeklySimulation({
      dt_s: 900,
      forecast,
      devices: createDevices(),
      mpcStrategy: mpcBalancedStrategy
    });

    const narrative = generateWeeklyNarrative(result, forecast);

    // Gate validation: ≥3 relevant insights
    expect(narrative.insights.length).toBeGreaterThanOrEqual(3);
    expect(narrative.summary.totalInsights).toBe(narrative.insights.length);

    // Should have diverse categories
    expect(narrative.summary.byCategory).toBeDefined();
    const categoriesUsed = Object.values(narrative.summary.byCategory).filter(count => count > 0).length;
    expect(categoriesUsed).toBeGreaterThanOrEqual(2);

    // Insights should have required fields
    narrative.insights.forEach(insight => {
      expect(insight.id).toBeTruthy();
      expect(insight.category).toMatch(/opportunity|warning|achievement|tip/);
      expect(insight.priority).toMatch(/high|medium|low/);
      expect(insight.title).toBeTruthy();
      expect(insight.description).toBeTruthy();
      expect(insight.title.length).toBeLessThan(100);
    });
  });

  it('detects Tempo RED warnings', async () => {
    const provider = new MockDataProvider();
    const forecast = await provider.fetchWeeklyForecast('2025-03-17', {
      location: 'sunny-week',
      tariffType: 'tempo'
    });

    const result = runWeeklySimulation({
      dt_s: 900,
      forecast,
      devices: createDevices(),
      mpcStrategy: mpcBalancedStrategy
    });

    const narrative = generateWeeklyNarrative(result, forecast);

    // Should warn about RED day (22 mars = RED in preset)
    const redWarnings = narrative.insights.filter(
      i => i.category === 'warning' && i.title.includes('ROUGE')
    );
    expect(redWarnings.length).toBeGreaterThan(0);
    expect(redWarnings[0].priority).toBe('high');
  });

  it('recognizes cost achievements', async () => {
    const provider = new MockDataProvider();
    const forecast = await provider.fetchWeeklyForecast('2025-03-17', {
      location: 'sunny-week',
      tariffType: 'tempo'
    });

    const result = runWeeklySimulation({
      dt_s: 900,
      forecast,
      devices: createDevices(),
      mpcStrategy: mpcBalancedStrategy,
      ecsService: { mode: 'penalize', deadlineHour: 7 }
    });

    const narrative = generateWeeklyNarrative(result, forecast);

    // Sunny week + good strategy should have cost achievement
    const costAchievements = narrative.insights.filter(
      i => i.category === 'achievement' && (i.title.includes('Coût') || i.title.includes('économis'))
    );
    
    // Might have cost achievement if total cost < 10€
    if (result.weeklyKPIs.netCostWithPenalties_eur < 10) {
      expect(costAchievements.length).toBeGreaterThan(0);
    }
  });

  it('generates MPC gain insights when comparison provided', async () => {
    const provider = new MockDataProvider();
    const forecast = await provider.fetchWeeklyForecast('2025-03-17', {
      location: 'sunny-week',
      tariffType: 'tempo'
    });

    const mpcResult = runWeeklySimulation({
      dt_s: 900,
      forecast,
      devices: createDevices(),
      mpcStrategy: mpcBalancedStrategy,
      ecsService: { mode: 'penalize', deadlineHour: 7 }
    });

    const baselineResult = runWeeklySimulation({
      dt_s: 900,
      forecast,
      devices: createDevices(),
      mpcStrategy: mpcToReactiveStrategy(ecsFirstStrategy as any),
      ecsService: { mode: 'penalize', deadlineHour: 7 }
    });

    const comparison = compareWeeklySimulations(mpcResult, baselineResult);
    const narrative = generateWeeklyNarrative(mpcResult, forecast, comparison);

    // If MPC achieved savings, should have opportunity insight
    if (comparison.gains.costReduction_eur > 0.5) {
      const mpcGainInsights = narrative.insights.filter(
        i => i.description.includes('Mode Coach') || i.description.includes('économiser')
      );
      expect(mpcGainInsights.length).toBeGreaterThan(0);
    }
  });

  it('provides actionable tips', async () => {
    const provider = new MockDataProvider();
    const forecast = await provider.fetchWeeklyForecast('2025-03-17', {
      location: 'sunny-week',
      tariffType: 'tempo'
    });

    const result = runWeeklySimulation({
      dt_s: 900,
      forecast,
      devices: createDevices(),
      mpcStrategy: mpcBalancedStrategy
    });

    const narrative = generateWeeklyNarrative(result, forecast);

    const tips = narrative.insights.filter(i => i.category === 'tip');
    
    // Should have at least 1 tip
    expect(tips.length).toBeGreaterThan(0);

    // Tips should be actionable (contain verbs: "chargez", "vérifiez", etc.)
    tips.forEach(tip => {
      expect(tip.description.length).toBeGreaterThan(20); // Not too short
      expect(tip.description).toMatch(/\b(chargez|vérifiez|augmentez|activez|anticipez|profitez)/i);
    });
  });

  it('prioritizes high-priority insights first', async () => {
    const provider = new MockDataProvider();
    const forecast = await provider.fetchWeeklyForecast('2025-03-17', {
      location: 'sunny-week',
      tariffType: 'tempo'
    });

    const result = runWeeklySimulation({
      dt_s: 900,
      forecast,
      devices: createDevices(),
      mpcStrategy: mpcBalancedStrategy
    });

    const narrative = generateWeeklyNarrative(result, forecast);

    // First insights should be high priority
    const priorities = narrative.insights.map(i => i.priority);
    const firstThree = priorities.slice(0, 3);
    
    // At least one high priority in first 3
    expect(firstThree).toContain('high');
  });

  it('filters by category when focusCategories specified', async () => {
    const provider = new MockDataProvider();
    const forecast = await provider.fetchWeeklyForecast('2025-03-17', {
      location: 'sunny-week',
      tariffType: 'tempo'
    });

    const result = runWeeklySimulation({
      dt_s: 900,
      forecast,
      devices: createDevices(),
      mpcStrategy: mpcBalancedStrategy
    });

    const narrative = generateWeeklyNarrative(result, forecast, undefined, {
      focusCategories: ['warning', 'opportunity']
    });

    // Should only have warnings and opportunities
    narrative.insights.forEach(insight => {
      expect(['warning', 'opportunity']).toContain(insight.category);
    });
  });

  it('respects maxInsights limit', async () => {
    const provider = new MockDataProvider();
    const forecast = await provider.fetchWeeklyForecast('2025-03-17', {
      location: 'sunny-week',
      tariffType: 'tempo'
    });

    const result = runWeeklySimulation({
      dt_s: 900,
      forecast,
      devices: createDevices(),
      mpcStrategy: mpcBalancedStrategy
    });

    const narrative = generateWeeklyNarrative(result, forecast, undefined, {
      maxInsights: 5
    });

    expect(narrative.insights.length).toBeLessThanOrEqual(5);
  });
});

describe('Narrative Quality Validation (Presets)', () => {
  it('generates relevant insights for variable week', async () => {
    const provider = new MockDataProvider();
    const forecast = await provider.fetchWeeklyForecast('2025-04-07', {
      location: 'variable-week',
      tariffType: 'tempo'
    });

    const result = runWeeklySimulation({
      dt_s: 900,
      forecast,
      devices: createDevices(),
      mpcStrategy: mpcBalancedStrategy
    });

    const narrative = generateWeeklyNarrative(result, forecast);

    // Variable week should have diverse insights (weather, cost, tips)
    // At least 3 insights total validates weather adaptation
    expect(narrative.insights.length).toBeGreaterThanOrEqual(3);
    
    // Should have mix of categories
    const categories = new Set(narrative.insights.map(i => i.category));
    expect(categories.size).toBeGreaterThan(1);
    expect(narrative.insights.length).toBeGreaterThanOrEqual(3);
  });

  it('generates relevant insights for winter week', async () => {
    const provider = new MockDataProvider();
    const forecast = await provider.fetchWeeklyForecast('2025-01-13', {
      location: 'winter-week',
      tariffType: 'tempo'
    });

    const result = runWeeklySimulation({
      dt_s: 900,
      forecast,
      devices: createDevices(),
      mpcStrategy: mpcBalancedStrategy
    });

    const narrative = generateWeeklyNarrative(result, forecast);

    // Winter week (low PV) should trigger warnings about limited production
    const lowPVWarnings = narrative.insights.filter(
      i => (i.category === 'warning' || i.category === 'tip') && 
           (i.description.includes('limitée') || i.description.includes('peu'))
    );

    expect(lowPVWarnings.length).toBeGreaterThan(0);
    expect(narrative.insights.length).toBeGreaterThanOrEqual(3);
  });

  it('GATE VALIDATION: generates ≥3 relevant insights per simulation', async () => {
    const provider = new MockDataProvider();
    const scenarios = [
      { location: 'sunny-week', label: 'Sunny' },
      { location: 'variable-week', label: 'Variable' },
      { location: 'winter-week', label: 'Winter' }
    ];

    for (const scenario of scenarios) {
      const forecast = await provider.fetchWeeklyForecast('2025-03-17', {
        location: scenario.location as any,
        tariffType: 'tempo'
      });

      const result = runWeeklySimulation({
        dt_s: 900,
        forecast,
        devices: createDevices(),
        mpcStrategy: mpcBalancedStrategy
      });

      const narrative = generateWeeklyNarrative(result, forecast);

      // GATE: ≥3 insights required
      expect(narrative.insights.length, `${scenario.label} week should generate ≥3 insights`).toBeGreaterThanOrEqual(3);

      // All insights should be relevant (have meaningful content)
      narrative.insights.forEach(insight => {
        expect(insight.title.length).toBeGreaterThan(5);
        expect(insight.description.length).toBeGreaterThan(15);
      });
    }
  });
});
