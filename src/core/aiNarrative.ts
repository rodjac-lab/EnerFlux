/**
 * AI Narrative Generator for Mode Coach Prédictif
 * 
 * Analyzes weekly simulation results and generates human-readable insights:
 * - Opportunities (cost savings, optimization potential)
 * - Warnings (comfort risks, Tempo RED days)
 * - Achievements (goals reached, good performance)
 * - Tips (actionable advice for next week)
 * 
 * Phase 3: Works with mock presets (deterministic narratives)
 * Phase 4+: Can integrate real-time data and contextual advice
 * 
 * @module core/aiNarrative
 */

import type { WeeklySimulationResult, WeeklyComparisonResult } from './weekSimulation';
import type { WeeklyForecast, TempoColor } from './forecast';

/**
 * Insight categories for narrative generation.
 */
export type InsightCategory = 'opportunity' | 'warning' | 'achievement' | 'tip';

/**
 * Insight severity/priority levels.
 */
export type InsightPriority = 'high' | 'medium' | 'low';

/**
 * Individual insight generated from simulation analysis.
 */
export interface Insight {
  /** Unique insight identifier */
  readonly id: string;

  /** Insight category */
  readonly category: InsightCategory;

  /** Priority level for UI sorting */
  readonly priority: InsightPriority;

  /** Human-readable title (short, <50 chars) */
  readonly title: string;

  /** Detailed description (markdown supported) */
  readonly description: string;

  /** Numeric value for insights with metrics (optional) */
  readonly value?: number;

  /** Unit for the value (€, kWh, %, etc.) */
  readonly unit?: string;

  /** Day index if insight is day-specific (0-6) */
  readonly dayIndex?: number;

  /** Icon suggestion for UI (emoji or icon name) */
  readonly icon?: string;
}

/**
 * Complete narrative for a weekly simulation.
 */
export interface WeeklyNarrative {
  /** All generated insights */
  readonly insights: readonly Insight[];

  /** Summary statistics */
  readonly summary: {
    totalInsights: number;
    byCategory: Record<InsightCategory, number>;
    byPriority: Record<InsightPriority, number>;
  };

  /** Generation metadata */
  readonly metadata: {
    generatedAt: Date;
    forecastStartDate: string;
    strategyUsed: string;
  };
}

/**
 * Narrative generation options.
 */
export interface NarrativeOptions {
  /** Maximum number of insights to generate */
  maxInsights?: number;

  /** Minimum priority to include (filters out lower priority) */
  minPriority?: InsightPriority;

  /** Focus on specific categories only */
  focusCategories?: InsightCategory[];

  /** Language for narratives (future: en/fr) */
  language?: 'fr' | 'en';
}

// Default options
const DEFAULT_OPTIONS: Required<NarrativeOptions> = {
  maxInsights: 10,
  minPriority: 'low',
  focusCategories: ['opportunity', 'warning', 'achievement', 'tip'],
  language: 'fr'
};

let insightCounter = 0;
function generateInsightId(): string {
  return `insight_${Date.now()}_${insightCounter++}`;
}

/**
 * Analyze Tempo days in the week and generate warnings/tips.
 */
function analyzeTempoInsights(forecast: WeeklyForecast): Insight[] {
  const insights: Insight[] = [];
  
  const tempoColors = forecast.tariffs.map(t => t.tempoColor).filter(Boolean) as TempoColor[];
  const redDays = forecast.tariffs.filter(t => t.tempoColor === 'RED');
  const whiteDays = forecast.tariffs.filter(t => t.tempoColor === 'WHITE');

  // Warning: RED days detected
  if (redDays.length > 0) {
    const redDates = redDays.map(d => d.date).join(', ');
    insights.push({
      id: generateInsightId(),
      category: 'warning',
      priority: 'high',
      title: `${redDays.length} jour${redDays.length > 1 ? 's' : ''} Tempo ROUGE cette semaine`,
      description: `Les jours **ROUGE** (${redDates}) ont un tarif HP très élevé (**0.76€/kWh**). Préparez votre batterie la veille pour limiter l'import réseau.`,
      value: redDays.length,
      icon: '🔴'
    });
  }

  // Tip: WHITE days optimization
  if (whiteDays.length > 0 && redDays.length === 0) {
    insights.push({
      id: generateInsightId(),
      category: 'tip',
      priority: 'medium',
      title: 'Optimiser les jours BLANC',
      description: `Cette semaine a ${whiteDays.length} jour${whiteDays.length > 1 ? 's' : ''} BLANC (tarif modéré). Profitez-en pour charger l'ECS en heures creuses plutôt qu'en PV.`,
      value: whiteDays.length,
      icon: '⚪'
    });
  }

  return insights;
}

/**
 * Analyze weather patterns and PV production.
 */
function analyzeWeatherInsights(forecast: WeeklyForecast, result: WeeklySimulationResult): Insight[] {
  const insights: Insight[] = [];

  const totalPV = result.weeklyKPIs.pvProduction_kWh;
  const avgPVPerDay = totalPV / 7;

  // Achievement: High PV week
  if (avgPVPerDay > 25) {
    insights.push({
      id: generateInsightId(),
      category: 'achievement',
      priority: 'medium',
      title: 'Excellente semaine solaire',
      description: `Production PV de **${totalPV.toFixed(0)} kWh** cette semaine (moyenne ${avgPVPerDay.toFixed(1)} kWh/jour). Votre installation fonctionne à plein régime !`,
      value: totalPV,
      unit: 'kWh',
      icon: '☀️'
    });
  }

  // Warning: Low PV week
  if (avgPVPerDay < 10) {
    insights.push({
      id: generateInsightId(),
      category: 'warning',
      priority: 'medium',
      title: 'Semaine peu ensoleillée',
      description: `Production PV limitée (${totalPV.toFixed(0)} kWh). Privilégiez les heures creuses pour l'ECS et limitez les consommations non essentielles.`,
      value: totalPV,
      unit: 'kWh',
      icon: '☁️'
    });
  }

  // Opportunity: Variable weather
  const pvVariance = forecast.weather.reduce((variance, day) => {
    const diff = day.pvTotal_kWh - avgPVPerDay;
    return variance + diff * diff;
  }, 0) / 7;

  if (pvVariance > 50) {
    insights.push({
      id: generateInsightId(),
      category: 'opportunity',
      priority: 'low',
      title: 'Météo variable : anticipez les creux',
      description: 'La production PV varie beaucoup cette semaine. Les jours ensoleillés, chargez la batterie au maximum pour compenser les jours nuageux.',
      icon: '🌤️'
    });
  }

  return insights;
}

/**
 * Analyze cost performance and savings opportunities.
 */
function analyzeCostInsights(
  result: WeeklySimulationResult,
  comparison?: WeeklyComparisonResult
): Insight[] {
  const insights: Insight[] = [];

  const weeklyCost = result.weeklyKPIs.netCostWithPenalties_eur;
  const dailyCost = weeklyCost / 7;

  // Achievement: Good cost performance
  if (weeklyCost < 10) {
    insights.push({
      id: generateInsightId(),
      category: 'achievement',
      priority: 'high',
      title: 'Coût maîtrisé cette semaine',
      description: `Facture énergétique de seulement **${weeklyCost.toFixed(2)}€** (${dailyCost.toFixed(2)}€/jour). Excellent contrôle des dépenses !`,
      value: weeklyCost,
      unit: '€',
      icon: '💰'
    });
  }

  // Opportunity: MPC gains vs baseline
  if (comparison && comparison.gains.costReduction_eur > 0.5) {
    insights.push({
      id: generateInsightId(),
      category: 'opportunity',
      priority: 'high',
      title: 'Stratégie prédictive efficace',
      description: `Le Mode Coach vous a fait économiser **${comparison.gains.costReduction_eur.toFixed(2)}€** (${comparison.gains.costReduction_percent.toFixed(1)}%) par rapport à une gestion classique. Continuez !`,
      value: comparison.gains.costReduction_eur,
      unit: '€',
      icon: '🎯'
    });
  }

  // Warning: High cost week
  if (weeklyCost > 20) {
    insights.push({
      id: generateInsightId(),
      category: 'warning',
      priority: 'medium',
      title: 'Semaine coûteuse',
      description: `Facture de ${weeklyCost.toFixed(2)}€. Vérifiez si des consommations exceptionnelles sont en cause ou si la batterie a été sous-utilisée.`,
      value: weeklyCost,
      unit: '€',
      icon: '⚠️'
    });
  }

  return insights;
}

/**
 * Analyze self-consumption and autarky performance.
 */
function analyzeSelfConsumptionInsights(result: WeeklySimulationResult): Insight[] {
  const insights: Insight[] = [];

  const selfCons = result.weeklyKPIs.selfConsumption_percent;
  const autarky = result.weeklyKPIs.autarky_percent;

  // Achievement: Excellent self-consumption
  if (selfCons > 90) {
    insights.push({
      id: generateInsightId(),
      category: 'achievement',
      priority: 'medium',
      title: 'Autoconsommation excellente',
      description: `Vous consommez **${selfCons.toFixed(1)}%** de votre production solaire localement. Très peu d'énergie est revendue au réseau.`,
      value: selfCons,
      unit: '%',
      icon: '♻️'
    });
  }

  // Opportunity: Low self-consumption
  if (selfCons < 60 && result.weeklyKPIs.gridExport_kWh > 20) {
    const exportLost = result.weeklyKPIs.gridExport_kWh;
    insights.push({
      id: generateInsightId(),
      category: 'opportunity',
      priority: 'high',
      title: 'Production PV sous-utilisée',
      description: `Vous exportez ${exportLost.toFixed(1)} kWh au réseau cette semaine. Augmentez la capacité batterie ou décalez des consommations (ECS, piscine) vers les heures ensoleillées.`,
      value: exportLost,
      unit: 'kWh',
      icon: '📤'
    });
  }

  // Achievement: Good autarky
  if (autarky > 70) {
    insights.push({
      id: generateInsightId(),
      category: 'achievement',
      priority: 'medium',
      title: 'Autonomie énergétique élevée',
      description: `Vous couvrez **${autarky.toFixed(1)}%** de vos besoins avec votre installation solaire. Vous êtes peu dépendant du réseau !`,
      value: autarky,
      unit: '%',
      icon: '🏡'
    });
  }

  return insights;
}

/**
 * Analyze comfort (ECS, heating) performance.
 */
function analyzeComfortInsights(result: WeeklySimulationResult): Insight[] {
  const insights: Insight[] = [];

  const ecsComfort = result.weeklyKPIs.ecsComfortAvg;
  const ecsRescue = result.weeklyKPIs.ecsRescueTotal_kWh;

  // Achievement: Perfect ECS comfort
  if (ecsComfort >= 0.95) {
    insights.push({
      id: generateInsightId(),
      category: 'achievement',
      priority: 'low',
      title: 'Confort ECS optimal',
      description: `Température de l'eau chaude maintenue au niveau cible **${(ecsComfort * 100).toFixed(0)}%** du temps. Pas de douche froide cette semaine !`,
      value: ecsComfort * 100,
      unit: '%',
      icon: '🚿'
    });
  }

  // Warning: ECS comfort degraded
  if (ecsComfort < 0.7) {
    insights.push({
      id: generateInsightId(),
      category: 'warning',
      priority: 'high',
      title: 'Confort ECS dégradé',
      description: `L'eau chaude n'a atteint la température cible que **${(ecsComfort * 100).toFixed(0)}%** du temps. Augmentez la priorité ECS ou activez le mode forcé avant 7h.`,
      value: ecsComfort * 100,
      unit: '%',
      icon: '❄️'
    });
  }

  // Warning: ECS rescue used
  if (ecsRescue > 2) {
    insights.push({
      id: generateInsightId(),
      category: 'warning',
      priority: 'medium',
      title: 'Rattrapage ECS fréquent',
      description: `Le système a dû forcer le chauffage ECS ${ecsRescue.toFixed(1)} kWh en mode rescue. Anticipez mieux les besoins ou augmentez le volume du ballon.`,
      value: ecsRescue,
      unit: 'kWh',
      icon: '🔥'
    });
  }

  return insights;
}

/**
 * Generate actionable tips based on forecast and results.
 */
function generateTips(
  forecast: WeeklyForecast,
  result: WeeklySimulationResult
): Insight[] {
  const insights: Insight[] = [];

  // Tip: Tempo strategy
  const hasRed = forecast.tariffs.some(t => t.tempoColor === 'RED');
  if (hasRed) {
    insights.push({
      id: generateInsightId(),
      category: 'tip',
      priority: 'high',
      title: 'Préparez-vous aux jours ROUGE',
      description: 'La veille d\'un jour ROUGE, chargez votre batterie au maximum (même en HC) et chauffez l\'ECS à fond. Le surcoût HC sera compensé par les économies du lendemain.',
      icon: '💡'
    });
  }

  // Tip: Battery usage
  const batteryUsageRatio = result.weeklyKPIs.gridImport_kWh / result.weeklyKPIs.consumption_kWh;
  if (batteryUsageRatio > 0.5) {
    insights.push({
      id: generateInsightId(),
      category: 'tip',
      priority: 'medium',
      title: 'Optimisez l\'usage de la batterie',
      description: 'Vous importez encore beaucoup du réseau. Vérifiez que la batterie se charge bien en journée et se décharge en soirée (18h-22h).',
      icon: '🔋'
    });
  }

  return insights;
}

/**
 * Generate complete weekly narrative from simulation results.
 * 
 * @param result - Weekly simulation result (MPC strategy)
 * @param forecast - Weekly forecast used for simulation
 * @param comparison - Optional comparison with baseline (for gain insights)
 * @param options - Narrative generation options
 * @returns Complete narrative with categorized insights
 */
export function generateWeeklyNarrative(
  result: WeeklySimulationResult,
  forecast: WeeklyForecast,
  comparison?: WeeklyComparisonResult,
  options?: NarrativeOptions
): WeeklyNarrative {
  const opts = { ...DEFAULT_OPTIONS, ...options };

  // Collect all insights from different analyzers
  let allInsights: Insight[] = [
    ...analyzeTempoInsights(forecast),
    ...analyzeWeatherInsights(forecast, result),
    ...analyzeCostInsights(result, comparison),
    ...analyzeSelfConsumptionInsights(result),
    ...analyzeComfortInsights(result),
    ...generateTips(forecast, result)
  ];

  // Filter by category if specified
  if (opts.focusCategories && opts.focusCategories.length < 4) {
    allInsights = allInsights.filter(i => opts.focusCategories!.includes(i.category));
  }

  // Filter by minimum priority
  const priorityOrder: Record<InsightPriority, number> = { high: 3, medium: 2, low: 1 };
  const minPriorityValue = priorityOrder[opts.minPriority];
  allInsights = allInsights.filter(i => priorityOrder[i.priority] >= minPriorityValue);

  // Sort by priority (high first), then category
  const categoryOrder: Record<InsightCategory, number> = { warning: 1, opportunity: 2, achievement: 3, tip: 4 };
  allInsights.sort((a, b) => {
    const priorityDiff = priorityOrder[b.priority] - priorityOrder[a.priority];
    if (priorityDiff !== 0) return priorityDiff;
    return categoryOrder[a.category] - categoryOrder[b.category];
  });

  // Limit to max insights
  const insights = allInsights.slice(0, opts.maxInsights);

  // Compute summary statistics
  const byCategory: Record<InsightCategory, number> = {
    opportunity: 0,
    warning: 0,
    achievement: 0,
    tip: 0
  };
  const byPriority: Record<InsightPriority, number> = {
    high: 0,
    medium: 0,
    low: 0
  };

  insights.forEach(insight => {
    byCategory[insight.category]++;
    byPriority[insight.priority]++;
  });

  return {
    insights,
    summary: {
      totalInsights: insights.length,
      byCategory,
      byPriority
    },
    metadata: {
      generatedAt: new Date(),
      forecastStartDate: forecast.startDate,
      strategyUsed: 'mpc_balanced' // TODO: extract from result
    }
  };
}
