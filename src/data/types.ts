import type { BatteryParams } from '../devices/Battery';
import type { DHWTankParams } from '../devices/DHWTank';

export type TariffMode = 'fixed' | 'tou' | 'profile';

export interface TimeOfUseConfig {
  onpeak_hours: number[];
  offpeak_hours: number[];
  onpeak_price: number;
  offpeak_price: number;
}

export interface Tariffs {
  mode: TariffMode;
  import_EUR_per_kWh: number | number[];
  export_EUR_per_kWh: number | number[];
  tou?: TimeOfUseConfig;
}

/**
 * Types de données utilisées pour les scénarios et les séries temporelles
 * alimentant le moteur de simulation.
 */
export interface ScenarioSeries {
  /** Pas de temps utilisé pour générer les séries (s). */
  readonly dt_s: number;
  /** Série de puissance PV (kW). */
  readonly pvSeries_kW: readonly number[];
  /** Série de consommation de base du foyer (kW). */
  readonly baseLoadSeries_kW: readonly number[];
}

export interface ScenarioDefaults {
  readonly batteryConfig: BatteryParams;
  readonly ecsConfig: DHWTankParams;
  readonly tariffs: Tariffs;
}

export interface ScenarioPreset {
  readonly id: string;
  readonly label: string;
  readonly description: string;
  readonly tags: readonly string[];
  readonly defaultDt_s: number;
  readonly defaults: ScenarioDefaults;
  generate: (dt_s: number) => ScenarioSeries;
}

export interface ScenarioConfig {
  readonly dt: number;
  readonly pv: readonly number[];
  readonly load_base: readonly number[];
  readonly defaults: ScenarioDefaults;
  readonly tariffs: Tariffs;
}

export interface StepFlows {
  pv_to_load_kW: number;
  pv_to_ecs_kW: number;
  pv_to_batt_kW: number;
  pv_to_grid_kW: number;
  batt_to_load_kW: number;
  batt_to_ecs_kW: number;
  grid_to_load_kW: number;
  grid_to_ecs_kW: number;
}

export interface FlowSummaryKW {
  pv_to_load_kW: number;
  pv_to_ecs_kW: number;
  pv_to_batt_kW: number;
  pv_to_grid_kW: number;
  batt_to_load_kW: number;
  batt_to_ecs_kW: number;
  grid_to_load_kW: number;
  grid_to_ecs_kW: number;
}

export interface FlowSummaryKWh extends Record<string, number> {}
