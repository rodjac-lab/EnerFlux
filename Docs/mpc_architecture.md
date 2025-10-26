# Mode Coach Prédictif — Architecture Technique

**Date de création** : 25 octobre 2025  
**Statut** : 🏗️ Spécification technique  
**Version** : 1.0  
**Auteurs** : Rodolphe + Claude (Anthropic)

---

## 📋 Vue d'Ensemble

Ce document détaille l'architecture technique du **Mode Coach Prédictif**, une extension majeure d'EnerFlux permettant :
1. **Simulations multi-jours** (7 jours hebdomadaires)
2. **Stratégie MPC** (Model Predictive Control) avec prévisions
3. **Narrateur IA** pour explications contextuelles
4. **UI Coach** avec timeline hebdomadaire

**Document parent** : [mode_coach_predictif_vision.md](./mode_coach_predictif_vision.md)

---

## 🏗️ Architecture Globale

### Layers & Responsabilités

```
┌─────────────────────────────────────────────────────────┐
│                    UI Layer (React)                     │
│  - CoachView.tsx (timeline 7j)                         │
│  - WeekTimeline.tsx (graphiques)                       │
│  - AICoachNarrative.tsx (explications)                 │
│  - DataSourceSelector.tsx (sélection APIs) ← Phase 3   │
└─────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────┐
│                 Business Logic Layer                    │
│  - weekSimulation.ts (orchestration 7j)                │
│  - mpcStrategy.ts (stratégie anticipative)             │
│  - aiNarrative.ts (génération insights)                │
└─────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────┐
│                   Core Engine Layer                     │
│  - engine.ts (ÉTENDU pour multi-jours)                 │
│  - strategy.ts (ÉTENDU avec Forecast)                  │
│  - allocation.ts (inchangé)                            │
└─────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────┐
│                     Data Layer                          │
│  - weekScenarios.ts (presets hebdo)                    │
│  - providers/ (abstraction APIs) ← Phase 3             │
│    ├─ MockWeatherProvider.ts (Phase 1)                 │
│    ├─ MeteoFranceProvider.ts (Phase 3)                 │
│    ├─ OpenWeatherProvider.ts (Phase 3)                 │
│    ├─ RTETempoProvider.ts (Phase 3)                    │
│    └─ DataProvider.ts (interface)                      │
└─────────────────────────────────────────────────────────┘
```

### 🎯 Approche Progressive

**Phase 1-2 (MVP)** : Heuristiques simples + Presets mock
- Valider concept MPC
- Tester 4 heuristiques de base
- Mesurer gains vs stratégies fixes
- **Source données** : Presets codés en dur

**Phase 3 (Narrateur IA)** : Explications intelligentes sur presets
- Développer narrateur IA avec presets déterministes
- Valider pertinence insights (opp., warnings, achievements)
- Tester explications avec heuristiques MPC Phase 1-2
- **Objectif** : Insights validés AVANT complexité APIs

**Phase 4 (Extension)** : Intégration données réelles
- Brancher APIs Météo France, RTE Tempo
- Même logique MPC + narrateur, données dynamiques
- Comparaison preset vs réel
- **Source données** : APIs externes + fallback presets

---

## 🔧 Phase 1 : Extension Backend Multi-Jours

### 1.1 Nouveaux Types (src/data/types.ts)

```typescript
/**
 * Configuration météo pour une journée
 */
export interface DailyWeather {
  /** Jour de la semaine (0=lundi, 6=dimanche) */
  day: number;
  
  /** Date ISO (ex: "2025-10-28") */
  date: string;
  
  /** Description météo (ex: "Ensoleillé", "Nuageux", "Pluie") */
  description: string;
  
  /** Icône météo (ex: "☀️", "☁️", "🌧️") */
  icon: string;
  
  /** Production PV prévue pour la journée (kWh) */
  pvTotal_kWh: number;
  
  /** Série de production PV sur 24h (kW), pas de dt_s */
  pvProfile_kW: readonly number[];
  
  /** Température ambiante moyenne (°C) */
  avgAmbientTemp_C: number;
  
  /** Série de température ambiante sur 24h (°C) */
  ambientTempProfile_C: readonly number[];
}

/**
 * Type de tarif Tempo (France)
 */
export type TempoColor = 'blue' | 'white' | 'red';

/**
 * Configuration tarifaire pour une journée
 */
export interface DailyTariff {
  /** Jour de la semaine (0=lundi, 6=dimanche) */
  day: number;
  
  /** Date ISO (ex: "2025-10-28") */
  date: string;
  
  /** Type de tarif */
  tariffType: 'tempo' | 'tou' | 'fixed';
  
  /** Couleur Tempo (si applicable) */
  tempoColor?: TempoColor;
  
  /** Prix heures creuses (€/kWh) */
  offpeakPrice_eur_kWh: number;
  
  /** Prix heures pleines (€/kWh) */
  peakPrice_eur_kWh: number;
  
  /** Heures creuses (ex: [[22, 6]] = 22h-6h) */
  offpeakHours: [number, number][];
  
  /** Heures pleines (ex: [[6, 22]] = 6h-22h) */
  peakHours: [number, number][];
  
  /** Série de prix import sur 24h (€/kWh), indexée par pas de temps */
  importPriceSeries_eur_kWh: readonly number[];
  
  /** Série de prix export sur 24h (€/kWh) */
  exportPriceSeries_eur_kWh: readonly number[];
}

/**
 * Prévisions pour les prochaines heures (utilisé par MPC)
 */
export interface Forecast {
  /** Horizon de prévision (heures) */
  horizon_hours: number;
  
  /** Production PV prévue (kW), tableau de taille horizon_hours * (3600/dt_s) */
  pvNext_kW: readonly number[];
  
  /** Prix import prévus (€/kWh) */
  importPricesNext_eur_kWh: readonly number[];
  
  /** Prix export prévus (€/kWh) */
  exportPricesNext_eur_kWh: readonly number[];
  
  /** Température ambiante prévue (°C) */
  ambientTempNext_C: readonly number[];
}

/**
 * Input pour simulation hebdomadaire (7 jours)
 */
export interface WeekSimulationInput {
  /** Pas de temps (secondes) */
  dt_s: number;
  
  /** Prévisions météo (7 jours) */
  weatherForecast: readonly DailyWeather[];
  
  /** Prévisions tarifs (7 jours) */
  tariffForecast: readonly DailyTariff[];
  
  /** Profil de consommation type (répété 7 fois ou spécifique par jour) */
  loadProfile: WeekLoadProfile;
  
  /** Configuration équipements */
  devices: readonly Device[];
  
  /** Stratégie (avec ou sans MPC) */
  strategy: Strategy | MPCStrategy;
  
  /** ID stratégie */
  strategyId: StrategyId | MPCStrategyId;
  
  /** Contrat de service ECS */
  ecsService?: Partial<EcsServiceContract>;
}

/**
 * Profil de consommation hebdomadaire
 */
export interface WeekLoadProfile {
  /** Type de profil */
  type: 'uniform' | 'weekday_weekend' | 'custom';
  
  /** Profil semaine (lundi-vendredi) si weekday_weekend */
  weekdayProfile_kW?: readonly number[]; // 288 points (24h à dt_s=300s)
  
  /** Profil week-end (samedi-dimanche) si weekday_weekend */
  weekendProfile_kW?: readonly number[];
  
  /** Profil uniforme (tous les jours identiques) si uniform */
  uniformProfile_kW?: readonly number[];
  
  /** Profils personnalisés par jour si custom */
  customProfiles_kW?: readonly (readonly number[])[]; // 7 profils
}

/**
 * Résultat simulation d'une journée
 */
export interface DaySimulationResult {
  /** Jour de la semaine */
  day: number;
  
  /** Date ISO */
  date: string;
  
  /** Résultat simulation classique (steps, flows, totals, kpis) */
  simulation: SimulationResult;
  
  /** Insights IA générés pour cette journée */
  aiInsights: AIInsight[];
  
  /** Décisions MPC clés de la journée */
  keyDecisions: MPCDecision[];
}

/**
 * Résultat simulation hebdomadaire (7 jours)
 */
export interface WeekSimulationResult {
  /** Pas de temps */
  dt_s: number;
  
  /** Résultats par jour */
  days: readonly DaySimulationResult[];
  
  /** Totaux hebdomadaires */
  weekTotals: WeekTotals;
  
  /** KPIs hebdomadaires */
  weekKPIs: WeekKPIs;
  
  /** Insights IA hebdomadaires (synthèse) */
  weeklyInsights: AIInsight[];
  
  /** Météo utilisée */
  weatherForecast: readonly DailyWeather[];
  
  /** Tarifs utilisés */
  tariffForecast: readonly DailyTariff[];
}

/**
 * Totaux énergétiques sur la semaine
 */
export interface WeekTotals {
  pvProduction_kWh: number;
  consumption_kWh: number;
  gridImport_kWh: number;
  gridExport_kWh: number;
  batteryDelta_kWh: number;
  ecsEnergy_kWh: number;
  heatingEnergy_kWh: number;
  poolEnergy_kWh: number;
  evEnergy_kWh: number;
}

/**
 * KPIs hebdomadaires
 */
export interface WeekKPIs {
  /** Autoconsommation moyenne (%) */
  avgSelfConsumption: number;
  
  /** Coût total semaine (€) */
  totalCost_eur: number;
  
  /** Coût par jour (€/jour) */
  avgCostPerDay_eur: number;
  
  /** Confort ECS moyen (%) */
  avgEcsComfort: number;
  
  /** Cycles batterie total */
  totalBatteryCycles: number;
  
  /** Cycles par jour */
  avgCyclesPerDay: number;
}
```

### 1.2 Extension engine.ts

```typescript
// src/core/engine.ts - NOUVELLES FONCTIONS

/**
 * Exécute une simulation sur 7 jours
 * 
 * @param input Configuration simulation hebdomadaire
 * @returns Résultats jour par jour + totaux semaine
 */
export function runWeekSimulation(
  input: WeekSimulationInput
): WeekSimulationResult {
  const { dt_s, weatherForecast, tariffForecast, loadProfile, devices, strategy, strategyId, ecsService } = input;
  
  // Validation
  if (weatherForecast.length !== 7) {
    throw new Error('weatherForecast must contain exactly 7 days');
  }
  if (tariffForecast.length !== 7) {
    throw new Error('tariffForecast must contain exactly 7 days');
  }
  
  const dayResults: DaySimulationResult[] = [];
  
  // Simuler jour par jour
  for (let day = 0; day < 7; day++) {
    const dailyWeather = weatherForecast[day];
    const dailyTariff = tariffForecast[day];
    
    // Générer load profile pour ce jour
    const baseLoadSeries_kW = getLoadProfileForDay(loadProfile, day);
    
    // Simuler la journée
    const daySimResult = runSimulation({
      dt_s,
      pvSeries_kW: dailyWeather.pvProfile_kW,
      baseLoadSeries_kW,
      devices,
      strategy: isMPCStrategy(strategy) 
        ? createMPCStrategyWithForecast(strategy, weatherForecast, tariffForecast, day)
        : strategy,
      strategyId,
      ambientTemp_C: dailyWeather.avgAmbientTemp_C,
      importPrices_EUR_per_kWh: dailyTariff.importPriceSeries_eur_kWh,
      exportPrices_EUR_per_kWh: dailyTariff.exportPriceSeries_eur_kWh,
      ecsService
    });
    
    // Générer insights IA pour ce jour (si MPC)
    const aiInsights = isMPCStrategy(strategy)
      ? generateDailyInsights(daySimResult, dailyWeather, dailyTariff, day)
      : [];
    
    // Extraire décisions MPC clés
    const keyDecisions = isMPCStrategy(strategy)
      ? extractKeyDecisions(daySimResult, day)
      : [];
    
    dayResults.push({
      day,
      date: dailyWeather.date,
      simulation: daySimResult,
      aiInsights,
      keyDecisions
    });
  }
  
  // Calculer totaux hebdomadaires
  const weekTotals = computeWeekTotals(dayResults);
  const weekKPIs = computeWeekKPIs(dayResults, weekTotals);
  const weeklyInsights = generateWeeklyInsights(dayResults, weekTotals, weekKPIs);
  
  return {
    dt_s,
    days: dayResults,
    weekTotals,
    weekKPIs,
    weeklyInsights,
    weatherForecast,
    tariffForecast
  };
}

/**
 * Récupère le profil de charge pour un jour donné
 */
function getLoadProfileForDay(
  profile: WeekLoadProfile,
  day: number // 0=lundi, 6=dimanche
): readonly number[] {
  switch (profile.type) {
    case 'uniform':
      return profile.uniformProfile_kW!;
    
    case 'weekday_weekend':
      // Samedi (5) et dimanche (6) = weekend
      return (day >= 5) 
        ? profile.weekendProfile_kW! 
        : profile.weekdayProfile_kW!;
    
    case 'custom':
      return profile.customProfiles_kW![day];
    
    default:
      throw new Error(`Unknown load profile type: ${profile.type}`);
  }
}

/**
 * Calcule les totaux sur la semaine
 */
function computeWeekTotals(days: readonly DaySimulationResult[]): WeekTotals {
  return {
    pvProduction_kWh: days.reduce((sum, d) => sum + d.simulation.totals.pvProduction_kWh, 0),
    consumption_kWh: days.reduce((sum, d) => sum + d.simulation.totals.consumption_kWh, 0),
    gridImport_kWh: days.reduce((sum, d) => sum + d.simulation.totals.gridImport_kWh, 0),
    gridExport_kWh: days.reduce((sum, d) => sum + d.simulation.totals.gridExport_kWh, 0),
    batteryDelta_kWh: days.reduce((sum, d) => sum + d.simulation.totals.batteryDelta_kWh, 0),
    ecsEnergy_kWh: days.reduce((sum, d) => sum + d.simulation.totals.ecsEnergy_kWh, 0),
    heatingEnergy_kWh: 0, // TODO: ajouter heating dans totals
    poolEnergy_kWh: days.reduce((sum, d) => sum + d.simulation.totals.poolEnergy_kWh, 0),
    evEnergy_kWh: days.reduce((sum, d) => sum + d.simulation.totals.evEnergy_kWh, 0)
  };
}

/**
 * Calcule les KPIs hebdomadaires
 */
function computeWeekKPIs(
  days: readonly DaySimulationResult[],
  totals: WeekTotals
): WeekKPIs {
  const avgSelfConsumption = days.reduce((sum, d) => sum + d.simulation.kpis.selfConsumption, 0) / 7;
  
  // TODO: Calculer coût avec prix variables
  const totalCost_eur = 0; // Somme des coûts journaliers
  
  const avgEcsComfort = days.reduce((sum, d) => {
    // Trouver KPI confort ECS dans d.simulation.kpis
    // Pour l'instant approximation
    return sum + 0.9;
  }, 0) / 7;
  
  const totalBatteryCycles = days.reduce((sum, d) => sum + (d.simulation.kpis.batteryCycles ?? 0), 0);
  
  return {
    avgSelfConsumption,
    totalCost_eur,
    avgCostPerDay_eur: totalCost_eur / 7,
    avgEcsComfort,
    totalBatteryCycles,
    avgCyclesPerDay: totalBatteryCycles / 7
  };
}
```

---

## 🤖 Phase 2 : Stratégie MPC

### 2.1 Types Stratégie MPC (src/core/strategy.ts)

```typescript
// Extension des IDs stratégie
export type MPCStrategyId =
  | 'mpc_smart_week'
  | 'mpc_cost_optimizer'
  | 'mpc_comfort_first';

export type StrategyId = /* existing IDs */ | MPCStrategyId;

/**
 * Contexte étendu avec prévisions (pour MPC)
 */
export interface MPCStrategyContext extends StrategyContext {
  /** Prévisions météo/tarifs pour les prochaines heures */
  forecast: Forecast;
  
  /** Jour de la semaine actuel (0-6) */
  currentDay: number;
  
  /** Heure de la journée (0-23) */
  currentHour: number;
}

/**
 * Stratégie MPC avec anticipation
 */
export interface MPCStrategy {
  id: MPCStrategyId;
  label: string;
  description: string;
  
  /** Horizon de prévision (heures) */
  forecastHorizon_hours: number;
  
  /**
   * Calcule les allocations en tenant compte des prévisions
   * 
   * @param context Contexte actuel + prévisions
   * @returns Allocations de puissance
   */
  allocate(context: MPCStrategyContext): StrategyAllocation[];
}

/**
 * Type guard pour détecter stratégie MPC
 */
export function isMPCStrategy(strategy: Strategy | MPCStrategy): strategy is MPCStrategy {
  return 'forecastHorizon_hours' in strategy && 'allocate' in strategy;
}
```

### 2.2 Implémentation Stratégie MPC (src/core/mpc-strategy.ts - NOUVEAU)

```typescript
import { MPCStrategy, MPCStrategyContext, StrategyAllocation, getAllocationOrder } from './strategy';
import { Forecast, TempoColor } from '../data/types';

/**
 * Stratégie MPC "Smart Week"
 * 
 * Anticipe les prochaines 24h de météo et tarifs pour optimiser les décisions.
 * 
 * Heuristiques principales :
 * 1. Si demain ensoleillé : Prioriser ECS aujourd'hui, garder capacité batterie pour demain
 * 2. Si demain nuageux + tarif cher : Charger batterie à fond aujourd'hui
 * 3. Si Tempo ROUGE demain : Réserver batterie dès maintenant
 * 4. Si heures creuses actuelles + jour cher demain : Charger batterie depuis réseau
 */
export const mpcSmartWeek: MPCStrategy = {
  id: 'mpc_smart_week',
  label: 'Coach Intelligent (MPC)',
  description: 'Anticipe météo et tarifs pour optimiser économies et confort',
  forecastHorizon_hours: 24,
  
  allocate(context: MPCStrategyContext): StrategyAllocation[] {
    const { forecast, surplus_kW, requests, currentHour } = context;
    
    // Analyser les prévisions
    const analysis = analyzeForecast(forecast);
    
    // Déterminer priorités dynamiques
    const priorities = decidePriorities(context, analysis);
    
    // Allouer selon priorités
    return allocateByPriorities(requests, surplus_kW, priorities);
  }
};

/**
 * Analyse des prévisions pour détecter opportunités/risques
 */
interface ForecastAnalysis {
  /** Journée ensoleillée demain ? */
  tomorrowSunny: boolean;
  
  /** Production PV prévue demain (kWh) */
  tomorrowPvTotal_kWh: number;
  
  /** Journée nuageuse demain ? */
  tomorrowCloudy: boolean;
  
  /** Tarif moyen demain (€/kWh) */
  tomorrowAvgPrice_eur_kWh: number;
  
  /** Jour Tempo ROUGE demain ? */
  tomorrowTempoRed: boolean;
  
  /** Heures creuses actuelles ? */
  currentOffpeak: boolean;
  
  /** Heures creuses restantes aujourd'hui (heures) */
  offpeakHoursLeft_today: number;
  
  /** Prix actuel (€/kWh) */
  currentPrice_eur_kWh: number;
}

function analyzeForecast(forecast: Forecast): ForecastAnalysis {
  const { pvNext_kW, importPricesNext_eur_kWh } = forecast;
  
  // Calculer production PV demain (prochaines 24h)
  const stepsPerDay = 288; // 24h à dt=300s
  const tomorrowPvTotal_kWh = pvNext_kW
    .slice(0, stepsPerDay)
    .reduce((sum, p) => sum + p, 0) * (300 / 3600); // kW → kWh
  
  // Déterminer si ensoleillé (> 6 kWh/jour) ou nuageux (< 3 kWh/jour)
  const tomorrowSunny = tomorrowPvTotal_kWh > 6;
  const tomorrowCloudy = tomorrowPvTotal_kWh < 3;
  
  // Prix moyen demain
  const tomorrowAvgPrice_eur_kWh = importPricesNext_eur_kWh
    .slice(0, stepsPerDay)
    .reduce((sum, p) => sum + p, 0) / stepsPerDay;
  
  // Tempo ROUGE si prix > 0.50€/kWh
  const tomorrowTempoRed = tomorrowAvgPrice_eur_kWh > 0.50;
  
  // Prix actuel
  const currentPrice_eur_kWh = importPricesNext_eur_kWh[0];
  
  // Heures creuses si prix < 0.18€/kWh
  const currentOffpeak = currentPrice_eur_kWh < 0.18;
  
  return {
    tomorrowSunny,
    tomorrowPvTotal_kWh,
    tomorrowCloudy,
    tomorrowAvgPrice_eur_kWh,
    tomorrowTempoRed,
    currentOffpeak,
    offpeakHoursLeft_today: 0, // TODO: calculer précisément
    currentPrice_eur_kWh
  };
}

/**
 * Décide les priorités en fonction de l'analyse prévisions
 */
interface DynamicPriorities {
  /** Ordre d'allocation des devices */
  order: string[];
  
  /** Raison de cette décision */
  reason: string;
  
  /** Score d'urgence par device (0-1) */
  urgencyScores: Map<string, number>;
}

function decidePriorities(
  context: MPCStrategyContext,
  analysis: ForecastAnalysis
): DynamicPriorities {
  const { tomorrowSunny, tomorrowCloudy, tomorrowTempoRed, currentOffpeak, tomorrowAvgPrice_eur_kWh } = analysis;
  
  // Règle 1 : Demain ensoleillé → Prioriser ECS maintenant
  if (tomorrowSunny && !currentOffpeak) {
    return {
      order: ['baseload', 'ecs', 'heating', 'pool', 'ev', 'battery'],
      reason: 'Demain ensoleillé : ECS prioritaire aujourd\'hui, batterie chargera naturellement demain',
      urgencyScores: new Map([
        ['ecs', 0.9],
        ['battery', 0.3],
        ['heating', 0.6],
        ['pool', 0.4],
        ['ev', 0.5]
      ])
    };
  }
  
  // Règle 2 : Demain nuageux + tarif cher → Charger batterie à fond maintenant
  if (tomorrowCloudy && tomorrowAvgPrice_eur_kWh > 0.20) {
    return {
      order: ['baseload', 'battery', 'ecs', 'heating', 'pool', 'ev'],
      reason: `Demain nuageux + tarif ${tomorrowAvgPrice_eur_kWh.toFixed(2)}€/kWh : Charger batterie prioritaire`,
      urgencyScores: new Map([
        ['battery', 0.95],
        ['ecs', 0.6],
        ['heating', 0.5],
        ['pool', 0.2],
        ['ev', 0.4]
      ])
    };
  }
  
  // Règle 3 : Tempo ROUGE demain → Réserve batterie maximale
  if (tomorrowTempoRed) {
    return {
      order: ['baseload', 'battery', 'ev', 'ecs', 'heating', 'pool'],
      reason: 'Tempo ROUGE demain : Réserve batterie prioritaire pour autonomie maximale',
      urgencyScores: new Map([
        ['battery', 1.0],
        ['ev', 0.7], // VE aussi car critique
        ['ecs', 0.4],
        ['heating', 0.3],
        ['pool', 0.1]
      ])
    };
  }
  
  // Règle 4 : Heures creuses + tarif normal demain → Équilibré
  if (currentOffpeak && tomorrowAvgPrice_eur_kWh < 0.20) {
    return {
      order: ['baseload', 'ecs', 'battery', 'heating', 'ev', 'pool'],
      reason: 'Heures creuses + demain standard : Stratégie équilibrée',
      urgencyScores: new Map([
        ['ecs', 0.7],
        ['battery', 0.7],
        ['heating', 0.6],
        ['ev', 0.5],
        ['pool', 0.3]
      ])
    };
  }
  
  // Défaut : Stratégie standard ecs_first
  return {
    order: ['baseload', 'ecs', 'battery', 'heating', 'pool', 'ev'],
    reason: 'Stratégie standard (pas de condition MPC spécifique)',
    urgencyScores: new Map([
      ['ecs', 0.8],
      ['battery', 0.6],
      ['heating', 0.5],
      ['pool', 0.3],
      ['ev', 0.4]
    ])
  };
}

/**
 * Alloue la puissance selon les priorités dynamiques
 */
function allocateByPriorities(
  requests: StrategyRequest[],
  surplus_kW: number,
  priorities: DynamicPriorities
): StrategyAllocation[] {
  // Trier les requêtes selon l'ordre de priorité
  const deviceOrder = new Map(priorities.order.map((d, i) => [d, i]));
  
  const sorted = [...requests].sort((a, b) => {
    const orderA = deviceOrder.get(a.device.id) ?? 99;
    const orderB = deviceOrder.get(b.device.id) ?? 99;
    return orderA - orderB;
  });
  
  // Allouer selon ordre
  let remaining = surplus_kW;
  const allocations: StrategyAllocation[] = [];
  
  for (const req of sorted) {
    if (remaining <= 0) break;
    
    const power = Math.min(req.request.maxAccept_kW, remaining);
    if (power > 0) {
      allocations.push({ deviceId: req.device.id, power_kW: power });
      remaining -= power;
    }
  }
  
  return allocations;
}

/**
 * Crée une stratégie MPC wrapper pour runSimulation()
 * (convertit MPCStrategy en Strategy classique)
 */
export function createMPCStrategyWithForecast(
  mpcStrategy: MPCStrategy,
  weatherForecast: readonly DailyWeather[],
  tariffForecast: readonly DailyTariff[],
  currentDay: number
): Strategy {
  return (context: StrategyContext): StrategyAllocation[] => {
    // Construire Forecast à partir des prévisions semaine
    const forecast = buildForecast(
      weatherForecast,
      tariffForecast,
      currentDay,
      context.time_s,
      context.dt_s,
      mpcStrategy.forecastHorizon_hours
    );
    
    // Construire MPCStrategyContext
    const mpcContext: MPCStrategyContext = {
      ...context,
      forecast,
      currentDay,
      currentHour: Math.floor((context.time_s % 86400) / 3600)
    };
    
    // Appeler stratégie MPC
    return mpcStrategy.allocate(mpcContext);
  };
}

/**
 * Construit objet Forecast à partir des données hebdo
 */
function buildForecast(
  weatherForecast: readonly DailyWeather[],
  tariffForecast: readonly DailyTariff[],
  currentDay: number,
  time_s: number,
  dt_s: number,
  horizon_hours: number
): Forecast {
  const stepsPerHour = 3600 / dt_s;
  const totalSteps = horizon_hours * stepsPerHour;
  
  const pvNext_kW: number[] = [];
  const importPricesNext_eur_kWh: number[] = [];
  const exportPricesNext_eur_kWh: number[] = [];
  const ambientTempNext_C: number[] = [];
  
  // Index actuel dans la journée
  const stepsPerDay = 86400 / dt_s;
  const currentStepInDay = Math.floor((time_s % 86400) / dt_s);
  
  let stepsRemaining = totalSteps;
  let day = currentDay;
  let stepInDay = currentStepInDay;
  
  while (stepsRemaining > 0 && day < 7) {
    const dailyWeather = weatherForecast[day];
    const dailyTariff = tariffForecast[day];
    
    // Nombre de steps disponibles ce jour
    const stepsAvailableToday = stepsPerDay - stepInDay;
    const stepsToCopy = Math.min(stepsRemaining, stepsAvailableToday);
    
    // Copier les données
    for (let i = 0; i < stepsToCopy; i++) {
      const idx = stepInDay + i;
      pvNext_kW.push(dailyWeather.pvProfile_kW[idx] ?? 0);
      importPricesNext_eur_kWh.push(dailyTariff.importPriceSeries_eur_kWh[idx] ?? 0.18);
      exportPricesNext_eur_kWh.push(dailyTariff.exportPriceSeries_eur_kWh[idx] ?? 0.10);
      ambientTempNext_C.push(dailyWeather.ambientTempProfile_C[idx] ?? 15);
    }
    
    stepsRemaining -= stepsToCopy;
    day++;
    stepInDay = 0; // Jour suivant commence à 0
  }
  
  return {
    horizon_hours,
    pvNext_kW,
    importPricesNext_eur_kWh,
    exportPricesNext_eur_kWh,
    ambientTempNext_C
  };
}
```

---

## 🎙️ Phase 3 : Narrateur IA

### 3.1 Types Insights (src/core/ai-narrative.ts - NOUVEAU)

```typescript
/**
 * Type d'insight généré par l'IA
 */
export type InsightType = 
  | 'opportunity'  // Opportunité d'optimisation
  | 'warning'      // Alerte sur décision suboptimale
  | 'achievement'  // Succès, bonne gestion
  | 'tip'          // Conseil pour demain
  | 'explanation'; // Explication décision MPC

/**
 * Insight généré par le narrateur IA
 */
export interface AIInsight {
  /** Timestamp (secondes depuis début simulation) */
  timestamp: number;
  
  /** Jour de la semaine (0-6) */
  day: number;
  
  /** Heure de la journée (0-23) */
  hour: number;
  
  /** Type d'insight */
  type: InsightType;
  
  /** Message principal (1 phrase courte) */
  message: string;
  
  /** Raisonnement détaillé */
  reasoning: string;
  
  /** Impact quantifié (ex: "Économie : 1.20€") */
  impact: string;
  
  /** Données contextuelles pour affichage */
  context?: {
    pvExport_kWh?: number;
    batterySoc_percent?: number;
    ecsTemp_C?: number;
    gridImport_kWh?: number;
    tariffPrice_eur_kWh?: number;
  };
}

/**
 * Décision MPC clé à mettre en avant
 */
export interface MPCDecision {
  /** Timestamp décision */
  timestamp: number;
  
  /** Heure (HH:mm) */
  timeLabel: string;
  
  /** Device priorisé */
  prioritizedDevice: string;
  
  /** Raison de cette priorité */
  reason: string;
  
  /** Gain estimé (€) */
  estimatedGain_eur: number;
}
```

### 3.2 Génération Insights (src/core/ai-narrative.ts)

```typescript
/**
 * Génère insights IA pour une journée simulée
 */
export function generateDailyInsights(
  dayResult: SimulationResult,
  weather: DailyWeather,
  tariff: DailyTariff,
  day: number
): AIInsight[] {
  const insights: AIInsight[] = [];
  
  // 1. Détecter surplus PV exporté (opportunité manquée)
  if (dayResult.totals.gridExport_kWh > 3) {
    insights.push({
      timestamp: day * 86400,
      day,
      hour: 14, // Généralement midi-après-midi
      type: 'opportunity',
      message: `${dayResult.totals.gridExport_kWh.toFixed(1)} kWh PV exportés`,
      reasoning: `Surplus PV non utilisé, batterie probablement pleine avant fin de journée`,
      impact: `Perte potentielle : ${(dayResult.totals.gridExport_kWh * 0.12).toFixed(2)}€ (valeur autoconso non réalisée)`,
      context: {
        pvExport_kWh: dayResult.totals.gridExport_kWh
      }
    });
  }
  
  // 2. Détecter import réseau en heures pleines (warning)
  const importDuringPeak = calculateImportDuringPeak(dayResult, tariff);
  if (importDuringPeak > 2) {
    insights.push({
      timestamp: day * 86400 + 18 * 3600,
      day,
      hour: 18,
      type: 'warning',
      message: `Import réseau en heures pleines : ${importDuringPeak.toFixed(1)} kWh`,
      reasoning: `Batterie insuffisante pour couvrir pointe soirée`,
      impact: `Coût supplémentaire : ${(importDuringPeak * 0.08).toFixed(2)}€ vs heures creuses`,
      context: {
        gridImport_kWh: importDuringPeak,
        tariffPrice_eur_kWh: tariff.peakPrice_eur_kWh
      }
    });
  }
  
  // 3. Détecter journée optimale (achievement)
  if (dayResult.kpis.selfConsumption > 0.90 && dayResult.totals.gridExport_kWh < 1) {
    insights.push({
      timestamp: day * 86400 + 20 * 3600,
      day,
      hour: 20,
      type: 'achievement',
      message: `Journée parfaite ! ${(dayResult.kpis.selfConsumption * 100).toFixed(0)}% autoconsommation`,
      reasoning: `Surplus PV bien utilisé, faible export, batterie optimisée`,
      impact: `Économie maximale réalisée`,
      context: {}
    });
  }
  
  // 4. Conseil pour demain (tip)
  // TODO: Nécessite accès à weatherForecast[day+1]
  
  return insights;
}

function calculateImportDuringPeak(
  result: SimulationResult,
  tariff: DailyTariff
): number {
  // Calculer import uniquement pendant heures pleines
  let importPeak = 0;
  
  for (let i = 0; i < result.flows.length; i++) {
    const hour = Math.floor((i * result.dt_s) / 3600);
    const isPeak = tariff.peakHours.some(([start, end]) => hour >= start && hour < end);
    
    if (isPeak) {
      importPeak += result.flows[i].grid_to_load_kW * (result.dt_s / 3600);
    }
  }
  
  return importPeak;
}

/**
 * Génère insights hebdomadaires (synthèse)
 */
export function generateWeeklyInsights(
  days: readonly DaySimulationResult[],
  totals: WeekTotals,
  kpis: WeekKPIs
): AIInsight[] {
  const insights: AIInsight[] = [];
  
  // Synthèse semaine
  insights.push({
    timestamp: 0,
    day: 0,
    hour: 0,
    type: 'achievement',
    message: `Semaine terminée : ${kpis.avgSelfConsumption.toFixed(0)}% autoconsommation moyenne`,
    reasoning: `Performance globale sur 7 jours`,
    impact: `Coût total : ${kpis.totalCost_eur.toFixed(2)}€`,
    context: {}
  });
  
  // Identifier meilleur/pire jour
  const bestDay = days.reduce((best, d, i) => 
    d.simulation.kpis.selfConsumption > days[best].simulation.kpis.selfConsumption ? i : best, 
    0
  );
  
  insights.push({
    timestamp: bestDay * 86400,
    day: bestDay,
    hour: 12,
    type: 'achievement',
    message: `${getDayName(bestDay)} : Meilleur jour (${(days[bestDay].simulation.kpis.selfConsumption * 100).toFixed(0)}% autoconso)`,
    reasoning: `Météo favorable et stratégie optimale`,
    impact: `Économie maximale ce jour`,
    context: {}
  });
  
  return insights;
}

function getDayName(day: number): string {
  return ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche'][day];
}
```

---

## 📦 Phase 4 : Data Layer (Scénarios Hebdo)

### 4.1 Scénarios Météo Hebdo (src/data/week-scenarios.ts - NOUVEAU)

```typescript
import { DailyWeather, DailyTariff, WeekSimulationInput } from './types';
import { generatePvProfile } from './series';

/**
 * Génère profil PV pour une journée selon ensoleillement
 */
function generateDailyPvProfile(
  date: string,
  description: 'sunny' | 'cloudy' | 'rainy' | 'partly_cloudy',
  peakPower_kWp: number,
  dt_s: number
): DailyWeather {
  const stepsPerDay = 86400 / dt_s;
  
  // Facteur d'ensoleillement
  const sunFactor = {
    sunny: 1.0,
    partly_cloudy: 0.6,
    cloudy: 0.35,
    rainy: 0.15
  }[description];
  
  // Générer profil base (courbe solaire)
  const pvProfile_kW = generatePvProfile(peakPower_kWp, dt_s, stepsPerDay).map(p => p * sunFactor);
  
  // Calculer total
  const pvTotal_kWh = pvProfile_kW.reduce((sum, p) => sum + p, 0) * (dt_s / 3600);
  
  // Température ambiante (simplifié)
  const baseTemp = description === 'sunny' ? 20 : description === 'cloudy' ? 15 : 12;
  const ambientTempProfile_C = Array(stepsPerDay).fill(0).map((_, i) => {
    const hour = (i * dt_s) / 3600;
    return baseTemp + Math.sin((hour - 6) * Math.PI / 12) * 5; // Variation jour/nuit
  });
  
  return {
    day: 0, // À définir par appelant
    date,
    description: descriptionLabel[description],
    icon: descriptionIcon[description],
    pvTotal_kWh,
    pvProfile_kW,
    avgAmbientTemp_C: baseTemp,
    ambientTempProfile_C
  };
}

const descriptionLabel = {
  sunny: 'Ensoleillé',
  partly_cloudy: 'Partiellement nuageux',
  cloudy: 'Nuageux',
  rainy: 'Pluvieux'
};

const descriptionIcon = {
  sunny: '☀️',
  partly_cloudy: '🌤️',
  cloudy: '☁️',
  rainy: '🌧️'
};

/**
 * Génère tarifs Tempo pour une journée
 */
function generateDailyTempo(
  date: string,
  color: TempoColor,
  dt_s: number
): DailyTariff {
  const stepsPerDay = 86400 / dt_s;
  
  // Prix Tempo (2024-2025)
  const prices = {
    blue: { offpeak: 0.1609, peak: 0.1894 },
    white: { offpeak: 0.1894, peak: 0.2562 },
    red: { offpeak: 0.2088, peak: 0.7562 }
  };
  
  const { offpeak, peak } = prices[color];
  
  // Heures creuses : 22h-6h
  const offpeakHours: [number, number][] = [[22, 24], [0, 6]];
  const peakHours: [number, number][] = [[6, 22]];
  
  // Générer séries de prix
  const importPriceSeries_eur_kWh: number[] = [];
  const exportPriceSeries_eur_kWh: number[] = Array(stepsPerDay).fill(0.10); // Export fixe
  
  for (let i = 0; i < stepsPerDay; i++) {
    const hour = Math.floor((i * dt_s) / 3600);
    const isOffpeak = (hour >= 22 || hour < 6);
    importPriceSeries_eur_kWh.push(isOffpeak ? offpeak : peak);
  }
  
  return {
    day: 0, // À définir par appelant
    date,
    tariffType: 'tempo',
    tempoColor: color,
    offpeakPrice_eur_kWh: offpeak,
    peakPrice_eur_kWh: peak,
    offpeakHours,
    peakHours,
    importPriceSeries_eur_kWh,
    exportPriceSeries_eur_kWh
  };
}

/**
 * Preset : Semaine Mixte Tempo
 * 
 * - Lun-Mer : Ensoleillé, Tempo BLEU
 * - Jeu : Nuageux, Tempo BLANC
 * - Ven : Partiellement nuageux, Tempo BLANC
 * - Sam-Dim : Ensoleillé, Tempo BLEU
 */
export function generateWeekMixedTempo(
  startDate: string, // ISO "2025-10-28"
  peakPower_kWp: number,
  dt_s: number
): { weatherForecast: DailyWeather[], tariffForecast: DailyTariff[] } {
  const weather: DailyWeather[] = [
    { ...generateDailyPvProfile('2025-10-28', 'sunny', peakPower_kWp, dt_s), day: 0 },
    { ...generateDailyPvProfile('2025-10-29', 'sunny', peakPower_kWp, dt_s), day: 1 },
    { ...generateDailyPvProfile('2025-10-30', 'sunny', peakPower_kWp, dt_s), day: 2 },
    { ...generateDailyPvProfile('2025-10-31', 'cloudy', peakPower_kWp, dt_s), day: 3 },
    { ...generateDailyPvProfile('2025-11-01', 'partly_cloudy', peakPower_kWp, dt_s), day: 4 },
    { ...generateDailyPvProfile('2025-11-02', 'sunny', peakPower_kWp, dt_s), day: 5 },
    { ...generateDailyPvProfile('2025-11-03', 'sunny', peakPower_kWp, dt_s), day: 6 }
  ];
  
  const tariffs: DailyTariff[] = [
    { ...generateDailyTempo('2025-10-28', 'blue', dt_s), day: 0 },
    { ...generateDailyTempo('2025-10-29', 'blue', dt_s), day: 1 },
    { ...generateDailyTempo('2025-10-30', 'blue', dt_s), day: 2 },
    { ...generateDailyTempo('2025-10-31', 'white', dt_s), day: 3 },
    { ...generateDailyTempo('2025-11-01', 'white', dt_s), day: 4 },
    { ...generateDailyTempo('2025-11-02', 'blue', dt_s), day: 5 },
    { ...generateDailyTempo('2025-11-03', 'blue', dt_s), day: 6 }
  ];
  
  return { weatherForecast: weather, tariffForecast: tariffs };
}

// TODO: Ajouter autres presets (semaine pluvieuse, semaine avec jour ROUGE, etc.)
```

---

## 🎨 Phase 5 : UI Coach

### 5.1 Composant Principal (src/ui/coach/CoachView.tsx - NOUVEAU)

```typescript
import React, { useState } from 'react';
import { WeekSimulationResult } from '../../data/types';
import { WeatherForecastCard } from './WeatherForecastCard';
import { TariffForecastCard } from './TariffForecastCard';
import { StrategyComparisonCard } from './StrategyComparisonCard';
import { WeekTimeline } from './WeekTimeline';
import { AICoachNarrative } from './AICoachNarrative';

export const CoachView: React.FC = () => {
  const [weekResult, setWeekResult] = useState<WeekSimulationResult | null>(null);
  const [loading, setLoading] = useState(false);
  
  const runWeekSimulation = async () => {
    setLoading(true);
    // TODO: Appeler worker ou API
    // const result = await simulateWeek(input);
    // setWeekResult(result);
    setLoading(false);
  };
  
  if (!weekResult) {
    return (
      <div className="p-6 space-y-4">
        <h1 className="text-2xl font-bold">🤖 Coach Énergétique</h1>
        <p className="text-gray-600">
          Analysez votre semaine énergétique et découvrez les gains du pilotage prédictif.
        </p>
        <button
          onClick={runWeekSimulation}
          disabled={loading}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          {loading ? 'Simulation en cours...' : 'Lancer simulation semaine'}
        </button>
      </div>
    );
  }
  
  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="space-y-2">
        <h1 className="text-2xl font-bold">🤖 Coach Énergétique</h1>
        <p className="text-gray-600">Semaine du {weekResult.weatherForecast[0].date} au {weekResult.weatherForecast[6].date}</p>
      </div>
      
      {/* Prévisions Météo */}
      <WeatherForecastCard forecast={weekResult.weatherForecast} />
      
      {/* Prévisions Tarifs */}
      <TariffForecastCard forecast={weekResult.tariffForecast} />
      
      {/* Comparaison Stratégies */}
      <StrategyComparisonCard
        weekResult={weekResult}
        // TODO: Ajouter baseline result pour comparaison
      />
      
      {/* Timeline 7 jours */}
      <WeekTimeline days={weekResult.days} />
      
      {/* Narrateur IA */}
      <AICoachNarrative insights={weekResult.weeklyInsights} />
    </div>
  );
};
```

### 5.2 Composants Détaillés

Voir fichiers à créer :
- `src/ui/coach/WeatherForecastCard.tsx`
- `src/ui/coach/TariffForecastCard.tsx`
- `src/ui/coach/StrategyComparisonCard.tsx`
- `src/ui/coach/WeekTimeline.tsx`
- `src/ui/coach/AICoachNarrative.tsx`

(Détails implémentation dans prochaine phase)

---

## 📊 Flux de Données

```
┌─────────────────────────────────────────────────────────┐
│               USER (Dimanche soir)                      │
│  - Sélectionne preset "Semaine Mixte Tempo"            │
│  - OU entre prévisions manuelles                       │
└─────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────┐
│            WeekSimulation Orchestrator                  │
│  1. Charge weatherForecast (7j)                        │
│  2. Charge tariffForecast (7j)                         │
│  3. Génère loadProfile (semaine/weekend)               │
│  4. Pour day = 0 to 6:                                 │
│     a. Crée Forecast (24h lookahead)                   │
│     b. Appelle runSimulation(day)                      │
│     c. Génère AIInsights(day)                          │
│  5. Agrège résultats (weekTotals, weekKPIs)            │
│  6. Génère weeklyInsights (synthèse)                   │
└─────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────┐
│               WeekSimulationResult                      │
│  - days[0..6] : DaySimulationResult                    │
│  - weekTotals : énergie/coût semaine                   │
│  - weekKPIs : autoconso, cycles, confort               │
│  - weeklyInsights : narrateur IA                       │
└─────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────┐
│                   UI CoachView                          │
│  - Timeline 7j (graphiques)                            │
│  - Cards météo/tarifs                                  │
│  - Comparaison MPC vs baseline                         │
│  - Insights IA (opportunités, warnings, tips)          │
└─────────────────────────────────────────────────────────┘
```

---

## 🧪 Tests & Validation

### Tests Unitaires Requis

1. **`week-simulation.test.ts`**
   - runWeekSimulation() conserve énergie sur 7j
   - Totaux hebdo = somme totaux journaliers
   - Forecast correctement construit (24h lookahead)

2. **`mpc-strategy.test.ts`**
   - analyzeForecast() détecte correctement tomorrowSunny/Cloudy
   - decidePriorities() retourne ordre adapté au contexte
   - MPC bat stratégie fixe sur scénario mixte (≥15% gain)

3. **`ai-narrative.test.ts`**
   - generateDailyInsights() détecte surplus exporté
   - generateWeeklyInsights() identifie meilleur jour
   - Insights contiennent impact quantifié

### Tests E2E

1. **Simulation 7j MPC vs ECS First**
   - Input : Semaine Mixte Tempo
   - Vérifier : MPC coût < ECS First coût
   - Vérifier : Conservation énergie < 0.1 kWh/jour

2. **Narrateur génère ≥10 insights**
   - Simulation complète
   - Compter insights types (opportunity, warning, achievement, tip)
   - Valider pertinence (pas de faux positifs)

---

## 📈 Métriques de Performance

### Objectifs Techniques

| Métrique | Cible | Justification |
|----------|-------|---------------|
| **Temps simulation 7j** | < 5s | UX acceptable (dimanche soir) |
| **Conservation énergie** | < 0.1 kWh/jour | Précision physique |
| **Gain MPC vs fixe** | ≥15% | ROI anticipation |
| **Insights générés** | ≥10/semaine | Valeur ajoutée narrateur |
| **Taux insights pertinents** | ≥80% | Confiance utilisateur |

### Optimisations Prévues

1. **Calculs parallèles** : Simuler 7 jours en parallèle (Web Workers)
2. **Cache prévisions** : Ne recalculer que si prévisions changent
3. **Lazy load UI** : Timeline 7j chargée progressivement

---

## 🚀 Roadmap d'Implémentation

### Phase 1-2 : MVP avec Presets (Semaine 1-3)
**Objectif** : Valider concept MPC avec données simulées

#### Semaine 1-2 : Foundation Backend
- [ ] Créer types `DailyWeather`, `DailyTariff`, `Forecast`, `WeekSimulationInput/Result`
- [ ] Implémenter `runWeekSimulation()` dans `engine.ts`
- [ ] Créer `MockWeatherProvider` et `week-scenarios.ts` avec 3 presets
- [ ] Tests conservation énergie 7 jours

#### Semaine 2-3 : MPC Strategy (4 heuristiques simples)
- [ ] Créer `mpc-strategy.ts` avec `mpcSmartWeek`
- [ ] Implémenter 4 heuristiques :
  1. Demain ensoleillé → Prioriser ECS
  2. Demain nuageux + tarif cher → Charger batterie
  3. Tempo ROUGE demain → Réserve maximale
  4. Normal → Stratégie équilibrée
- [ ] Implémenter `analyzeForecast()` et `decidePriorities()`
- [ ] Intégrer MPC dans `runWeekSimulation()`
- [ ] Tests gains MPC vs stratégies fixes (objectif ≥15%)

**Livrable Phase 1-2** : MPC fonctionnel sur presets, gains mesurables

---

### Phase 3 : Narrateur IA (Semaine 4) ← AVANT APIs
**Objectif** : Explications intelligentes testées avec presets déterministes

- [ ] Créer `ai-narrative.ts` avec types `AIInsight`, `MPCDecision`
- [ ] Implémenter `generateDailyInsights()`
  - [ ] Détection surplus PV exporté (opportunity)
  - [ ] Détection import HP (warning)
  - [ ] Détection journée optimale (achievement)
  - [ ] Conseil anticipatif pour demain (tip)
- [ ] Implémenter `generateWeeklyInsights()` (synthèse)
- [ ] **Tests narrateur avec heuristiques MPC Phase 1-2**
  - [ ] Vérifier insights cohérents avec décisions MPC
  - [ ] Valider quantification impacts (€, kWh, %)
  - [ ] Tester sur 3 presets (ensoleié, nuageux, mixte)
- [ ] Validation pertinence insights (≥80% pertinents)

**Livrable Phase 3** : ≥10 insights générés/semaine, explications validées avec MPC

**Gate Phase 3** : Narrateur doit expliquer correctement décisions MPC sur presets avant Phase 4

---

### Phase 4 : Intégration Données Réelles (Semaine 5) ← APRÈS Narrateur
**Objectif** : Brancher APIs externes (narrateur déjà fonctionnel)

- [ ] Créer interface `DataProvider` (WeatherDataProvider, TariffDataProvider)
- [ ] Implémenter `MeteoFranceProvider`
  - [ ] API key setup
  - [ ] Conversion format Météo France → DailyWeather
  - [ ] Estimation production PV depuis irradiance
- [ ] Implémenter `RTETempoProvider`
  - [ ] OAuth2 setup RTE
  - [ ] Récupération couleur Tempo J+1
  - [ ] Heuristique estimation J+2..J+7
- [ ] Créer `DataSourceSelector` UI
  - [ ] Dropdown providers (Mock / Météo France / OpenWeather)
  - [ ] Input localisation
  - [ ] Gestion erreurs + fallback preset
- [ ] Tests intégration API
  - [ ] Mock API responses
  - [ ] Validation format données
- [ ] **Vérifier narrateur fonctionne avec données réelles**
  - [ ] Insights générés avec APIs
  - [ ] Cohérence explications sur données dynamiques

**Livrable Phase 4** : Coach fonctionne avec données réelles OU presets, narrateur OK sur les deux

**Gate Phase 4** : APIs stables + fallback préset + narrateur cohérent avec données réelles

---

### Phase 5 : UI Coach Complète (Semaine 6)
**Objectif** : Interface utilisateur finale

- [ ] Créer `CoachView.tsx` et composants enfants
- [ ] `WeatherForecastCard` : Affichage 7j avec icônes
- [ ] `TariffForecastCard` : Couleurs Tempo + prix
- [ ] `StrategyComparisonCard` : MPC vs baseline (gains)
- [ ] `WeekTimeline` : Graphique 7j avec Recharts
- [ ] `AICoachNarrative` : Liste insights avec types
- [ ] Badge "🔴 Données Réelles" vs "📋 Preset"
- [ ] Mode "Planification Dimanche Soir"

**Livrable Phase 5** : UI complète, prête pour utilisateurs

---

### Phase 6 : Polish & Doc (Semaine 7)
**Objectif** : Finitions et documentation utilisateur

- [ ] Export JSON simulation semaine
- [ ] Cache prévisions (localStorage, 1h TTL)
- [ ] Guide utilisateur Mode Coach
- [ ] Exemples cas d'usage (3 personas)
- [ ] Tests E2E complet
- [ ] Optimisations performance (< 5s simulation 7j)

---

## 🔗 Dépendances & Compatibilité

### Dépendances Actuelles (OK)
- ✅ `engine.ts` : Facilement extensible multi-jours
- ✅ `strategy.ts` : Système d'allocation réutilisable
- ✅ `kpis.ts` : Agrégation compatible

### Nouvelles Dépendances

| Dépendance | Version | Usage | Phase |
|------------|---------|-------|-------|
| `date-fns` | ^3.0.0 | Manipulation dates (semaine) | Phase 1 |
| `recharts` | ^2.10.0 | Timeline 7j (déjà présent) | Phase 5 |
| - | - | **Phase 3 uniquement** | - |
| Météo France API | - | Prévisions météo réelles | Phase 3 |
| RTE eCO2mix API | - | Couleurs Tempo officielles | Phase 3 |

### Compatibilité

- ✅ **Backward compatible** : Mode Laboratoire v2.0 non affecté
- ✅ **Progressive enhancement** : MPC ajouté sans casser existant
- ✅ **API stable** : `SimulationInput` étendu, pas modifié

---

## 📚 Références

### Documentation Liée
- [mode_coach_predictif_vision.md](./mode_coach_predictif_vision.md) : Vision produit
- [vision_mode2_optimisation_optimale.md](./vision_mode2_optimisation_optimale.md) : Mode 2 (scores dynamiques)
- [tech_guidelines.md](./tech_guidelines.md) : Conventions code

### Papiers MPC Résidentiel
- Zhang et al. (2019), "MPC for Residential Energy Management", IEEE Trans. Smart Grid
- Oldewurtel et al. (2012), "Use of Model Predictive Control for Experimental Control of a Building Cooling System"

---

## ✅ Critères d'Acceptation

### Phase 1-2 : MVP avec Presets
- [ ] `runWeekSimulation()` fonctionne sur 7 jours
- [ ] Conservation énergie < 0.1 kWh/jour sur chaque jour
- [ ] MPC bat meilleure stratégie fixe ≥15% sur preset "Semaine Mixte"
- [ ] Forecast correctement construit (24h lookahead)
- [ ] `mpcSmartWeek` implémentée avec 4 heuristiques
- [ ] Décisions explicables (reason field rempli)
- [ ] Tests unitaires stratégie (analyzeForecast, decidePriorities)
- [ ] 3 presets hebdo exploitables (été, hiver, mixte)

**Gate Phase 1-2** : Si gains MPC < 15%, revoir heuristiques avant Phase 3

### Phase 3 : Narrateur IA (AVANT APIs)
- [ ] ≥10 insights générés par semaine type
- [ ] Types variés (opportunity, warning, achievement, tip)
- [ ] Impact quantifié (€, kWh, %)
- [ ] **Insights cohérents avec décisions MPC Phase 1-2**
- [ ] Tests sur 3 presets (ensoleilé, nuageux, mixte)
- [ ] Taux pertinence ≥80% (validation manuelle)

**Gate Phase 3** : Narrateur explique correctement heuristiques MPC sur presets

### Phase 4 : Intégration Données Réelles (APRÈS Narrateur)
- [ ] Interface `DataProvider` documentée et testée
- [ ] `MeteoFranceProvider` fonctionnel (≥90% uptime)
- [ ] `RTETempoProvider` récupère J+1 officiel
- [ ] UI `DataSourceSelector` permet switch Mock/API
- [ ] Gestion erreurs + fallback preset transparent
- [ ] Cache prévisions (évite appels répétés)
- [ ] Tests avec données réelles (enregistrées en fixtures)
- [ ] **Narrateur fonctionne avec données réelles**

**Gate Phase 4** : APIs stables + fallback OK + narrateur cohérent sur données réelles

### Phase 5 : UI Coach
- [ ] Timeline 7j affichée (graphique empilé)
- [ ] Cards météo/tarifs fonctionnelles
- [ ] Comparaison MPC vs baseline visible
- [ ] Insights IA affichés et lisibles
- [ ] Badge source données (Réel/Preset)
- [ ] Temps simulation < 5s

### Phase 6 : Polish & Doc
- [ ] Guide utilisateur Mode Coach (avec captures)
- [ ] Exemples 3 personas (Marc, Sophie, Thomas)
- [ ] Architecture documentée (ce fichier) ✅
- [ ] Tests E2E documentés
- [ ] Export JSON semaine fonctionnel

---

**Auteurs** : Rodolphe + Claude (Anthropic)  
**Date** : 25 octobre 2025  
**Version** : 1.0  
**Statut** : 🏗️ Spécification technique prête pour implémentation
