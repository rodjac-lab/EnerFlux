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

export interface ScenarioPreset {
  readonly id: string;
  readonly label: string;
  readonly description: string;
  readonly tags: readonly string[];
  generate: (dt_s: number) => ScenarioSeries;
}
