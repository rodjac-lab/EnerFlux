/**
 * Mode Coach Prédictif — Public API
 *
 * Exports centralisés pour faciliter l'import du système MPC.
 *
 * @example Mock Provider (Phase 1-3, Testing)
 * ```typescript
 * import { runWeeklySimulation, mpcBalancedStrategy, MockDataProvider } from './core/mpc';
 *
 * const provider = new MockDataProvider();
 * const forecast = await provider.fetchWeeklyForecast('2025-03-17', {
 *   location: 'sunny-week',
 *   tariffType: 'tempo'
 * });
 *
 * const result = runWeeklySimulation({
 *   dt_s: 900,
 *   forecast,
 *   devices: [battery, dhwTank],
 *   mpcStrategy: mpcBalancedStrategy
 * });
 * ```
 *
 * @example Real Providers (Phase 4, Production)
 * ```typescript
 * import { DataProviderFactory, runWeeklySimulation, mpcBalancedStrategy } from './core/mpc';
 *
 * // Factory mode (OpenWeather + RTE Tempo)
 * const provider = DataProviderFactory.createReal(
 *   'your-api-key',
 *   { peakPower_kWp: 6, efficiency: 0.75 },
 *   '48.8566,2.3522'
 * );
 *
 * // OR free mode (PVGIS + RTE Tempo)
 * const provider = DataProviderFactory.createFree(
 *   { peakPower_kWp: 6 },
 *   '48.8566,2.3522'
 * );
 *
 * const forecast = await provider.fetchWeeklyForecast('2025-03-17');
 * const result = runWeeklySimulation({ dt_s: 900, forecast, devices, mpcStrategy: mpcBalancedStrategy });
 * ```
 *
 * @module core/mpc
 */

// Forecast types
export type { Forecast, DailyWeather, DailyTariff, WeeklyForecast, TempoColor } from './forecast';

// MPC Strategies
export type { MPCStrategy, MPCStrategyId, MPCStrategyContext } from './mpcStrategy';
export {
  mpcSunnyTomorrowStrategy,
  mpcCloudyTomorrowStrategy,
  mpcTempoRedGuardStrategy,
  mpcBalancedStrategy,
  resolveMPCStrategy,
  mpcToReactiveStrategy
} from './mpcStrategy';

// Weekly Simulation
export type {
  WeeklySimulationInput,
  WeeklySimulationResult,
  DailyResult,
  WeeklyComparisonResult
} from './weekSimulation';
export { runWeeklySimulation, compareWeeklySimulations } from './weekSimulation';

// Data Providers
export type { WeatherProvider, TariffProvider, DataProvider } from '../data/providers/DataProvider';

// Mock Providers (Phase 1-3)
export {
  MockWeatherProvider,
  MockTariffProvider,
  MockDataProvider,
  getTempoPreset,
  getTempoPresetNames
} from '../data/providers';

// Real Providers (Phase 4)
export {
  OpenWeatherProvider,
  PVGISProvider,
  RTETempoProvider,
  type PVSystemConfig
} from '../data/providers';

// Provider Factory
export {
  DataProviderFactory,
  type ProviderMode,
  type RealProviderConfig
} from '../data/providers';

// AI Narrative (Phase 3)
export type {
  Insight,
  InsightCategory,
  InsightPriority,
  WeeklyNarrative,
  NarrativeOptions
} from './aiNarrative';
export { generateWeeklyNarrative } from './aiNarrative';
