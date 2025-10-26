/**
 * Data provider exports for Mode Coach Prédictif.
 *
 * @module data/providers
 */

// Core interfaces
export type { WeatherProvider, TariffProvider, DataProvider } from './DataProvider';

// Mock providers (Phase 1-3)
export { MockWeatherProvider } from './MockWeatherProvider';
export { MockTariffProvider, getTempoPreset, getTempoPresetNames } from './MockTariffProvider';
export { MockDataProvider } from './MockDataProvider';

// Real providers (Phase 4)
export { OpenWeatherProvider, type PVSystemConfig } from './OpenWeatherProvider';
export { PVGISProvider } from './PVGISProvider';
export { RTETempoProvider } from './RTETempoProvider';

// Factory
export {
  DataProviderFactory,
  type ProviderMode,
  type RealProviderConfig
} from './DataProviderFactory';
