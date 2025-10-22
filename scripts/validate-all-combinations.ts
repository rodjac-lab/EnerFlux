/**
 * LOT 7 - Validation E2E : Test des 70 combinaisons stratégie × scénario
 *
 * Ce script lance toutes les combinaisons possibles et génère un rapport markdown
 * avec deux tableaux complémentaires :
 * - Tableau 1 : Podium par scénario (top 3 stratégies)
 * - Tableau 2 : Performance globale par stratégie (moyenne sur tous scénarios)
 */

import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';
import { writeFileSync } from 'fs';
import { runSimulation, type SimulationResult } from '../src/core/engine.js';
import { resolveStrategy, type StrategyId } from '../src/core/strategy.js';
import { getScenarioPreset, PresetId } from '../src/data/scenarios.js';
import { resolvePrices } from '../src/data/tariffs.js';
import { createDevice, type DeviceConfig } from '../src/devices/registry.js';
import { resolveEcsServiceForStrategy } from '../src/workers/strategy-contract.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Liste des 7 scénarios
const SCENARIOS: PresetId[] = [
  PresetId.EteEnsoleille,
  PresetId.HiverCouvert,
  PresetId.MatinFroid,
  PresetId.BallonConfort,
  PresetId.BatterieVide,
  PresetId.SoireeVE,
  PresetId.MultiStress
];

// Liste des 10 stratégies
const STRATEGIES: StrategyId[] = [
  'ecs_first',
  'ecs_hysteresis',
  'deadline_helper',
  'battery_first',
  'mix_soc_threshold',
  'reserve_evening',
  'ev_departure_guard',
  'multi_equipment_priority',
  'no_control_offpeak',
  'no_control_hysteresis'
];

// Noms lisibles pour les scénarios
const SCENARIO_LABELS: Record<PresetId, string> = {
  [PresetId.EteEnsoleille]: 'Été ensoleillé',
  [PresetId.HiverCouvert]: 'Hiver rigoureux',
  [PresetId.MatinFroid]: 'Matin froid',
  [PresetId.BallonConfort]: 'Été modéré (ECS soirée)',
  [PresetId.BatterieVide]: 'Batterie vide (matin)',
  [PresetId.SoireeVE]: 'Été modéré (VE soirée)',
  [PresetId.MultiStress]: 'Multi-équipements'
};

// Noms lisibles pour les stratégies
const STRATEGY_LABELS: Record<StrategyId, string> = {
  'ecs_first': 'ECS prioritaire (brut)',
  'ecs_hysteresis': 'ECS + hystérésis',
  'deadline_helper': 'ECS + deadline',
  'battery_first': 'Batterie prioritaire',
  'mix_soc_threshold': 'Mix (seuil SOC)',
  'reserve_evening': 'Réserve soirée',
  'ev_departure_guard': 'VE départ sécurisé',
  'multi_equipment_priority': 'Multi-équipements',
  'no_control_offpeak': 'Sans pilotage (HC)',
  'no_control_hysteresis': 'Sans pilotage (thermo)'
};

interface CombinationResult {
  scenario: PresetId;
  strategy: StrategyId;
  autoconso: number;
  autoproduction: number;
  cost_EUR: number;
  ecsComfort: number;
  batteryCycles: number;
  heatingComfort?: number;
  poolCompletion?: number;
  evCompletion?: number;
  energyConservation: {
    valid: boolean;
    error_kWh: number;
  };
}

/**
 * Clone device configs for simulation
 */
const cloneConfig = (config: DeviceConfig): DeviceConfig => {
  switch (config.type) {
    case 'battery':
      return { ...config, params: { ...config.params } };
    case 'dhw-tank':
      return { ...config, params: { ...config.params } };
    case 'heating':
      return { ...config, params: { ...config.params } };
    case 'pool-pump':
      return {
        ...config,
        params: { ...config.params, preferredWindows: config.params.preferredWindows.map((w) => ({ ...w })) }
      };
    case 'ev-charger':
      return {
        ...config,
        params: { ...config.params, session: { ...config.params.session } }
      };
    default:
      return config;
  }
};

/**
 * Lance une simulation directement (sans worker)
 */
function runSingleSimulation(
  scenario: PresetId,
  strategyId: StrategyId
): SimulationResult {
  const preset = getScenarioPreset(scenario);
  if (!preset) {
    throw new Error(`Scénario inconnu: ${scenario}`);
  }

  const dt_s = preset.defaultDt_s;
  const series = preset.generate(dt_s);

  // Construire les devices à partir des configs du scénario
  const devicesConfig: DeviceConfig[] = [];

  // Batterie (toujours présente dans defaults)
  if (preset.defaults.batteryConfig) {
    devicesConfig.push({
      id: 'battery',
      label: 'Batterie',
      type: 'battery',
      params: preset.defaults.batteryConfig
    });
  }

  // ECS (toujours présent dans defaults)
  if (preset.defaults.ecsConfig) {
    devicesConfig.push({
      id: 'dhw',
      label: 'Ballon ECS',
      type: 'dhw-tank',
      params: preset.defaults.ecsConfig
    });
  }

  // Chauffage (si configuré)
  if (preset.defaults.heatingConfig && preset.defaults.heatingConfig.enabled) {
    devicesConfig.push({
      id: 'heating',
      label: 'Chauffage',
      type: 'heating',
      params: preset.defaults.heatingConfig.params
    });
  }

  // Piscine (si configurée)
  if (preset.defaults.poolConfig && preset.defaults.poolConfig.enabled) {
    devicesConfig.push({
      id: 'pool',
      label: 'Pompe piscine',
      type: 'pool-pump',
      params: preset.defaults.poolConfig.params
    });
  }

  // VE (si configuré)
  if (preset.defaults.evConfig && preset.defaults.evConfig.enabled) {
    devicesConfig.push({
      id: 'ev',
      label: 'Borne VE',
      type: 'ev-charger',
      params: preset.defaults.evConfig.params
    });
  }

  const devices = devicesConfig.map(cfg => createDevice(cloneConfig(cfg)));

  // Tarifs fixes pour toutes les simulations
  const tariffs = { mode: 'fixed' as const, import_EUR_per_kWh: 0.25, export_EUR_per_kWh: 0.10 };
  const { importPrices, exportPrices} = resolvePrices(tariffs, series.pvSeries_kW.length, series.dt_s);

  // Contract ECS
  const ecsService = { mode: 'force' as const, targetCelsius: 55, deadlineHour: 21 };
  const ecsContract = resolveEcsServiceForStrategy(ecsService, strategyId);

  // Stratégie
  const strategy = resolveStrategy(strategyId, { thresholdPercent: 50 });

  return runSimulation({
    dt_s: series.dt_s,
    pvSeries_kW: series.pvSeries_kW,
    baseLoadSeries_kW: series.baseLoadSeries_kW,
    devices,
    strategy,
    strategyId,
    ambientTemp_C: 20,
    importPrices_EUR_per_kWh: importPrices,
    exportPrices_EUR_per_kWh: exportPrices,
    ecsService: ecsContract,
    debugTrace: false
  });
}

/**
 * Vérifie la conservation de l'énergie
 */
function checkEnergyConservation(result: SimulationResult): { valid: boolean; error_kWh: number } {
  const { totals } = result;

  // Équation de conservation : PV + Import = Consommation + Export + ΔSOC
  const input = totals.pvProduction_kWh + totals.gridImport_kWh;
  const output = totals.consumption_kWh + totals.gridExport_kWh + totals.batteryDelta_kWh;

  const error = Math.abs(input - output);
  const valid = error < 0.01; // Tolérance 10 Wh

  return { valid, error_kWh: error };
}

/**
 * Lance toutes les combinaisons
 */
function runAllCombinations(): CombinationResult[] {
  const results: CombinationResult[] = [];
  let completed = 0;
  const total = SCENARIOS.length * STRATEGIES.length;

  console.log(`🚀 Lancement de ${total} simulations (${SCENARIOS.length} scénarios × ${STRATEGIES.length} stratégies)...\n`);

  for (const scenario of SCENARIOS) {
    console.log(`\n📊 Scénario: ${SCENARIO_LABELS[scenario]}`);

    for (const strategy of STRATEGIES) {
      try {
        const result = runSingleSimulation(scenario, strategy);
        const conservation = checkEnergyConservation(result);

        results.push({
          scenario,
          strategy,
          autoconso: result.kpis.selfConsumption,
          autoproduction: result.kpis.selfProduction,
          cost_EUR: result.kpis.netCost_EUR,
          ecsComfort: result.kpis.ecsTargetUptime,
          batteryCycles: result.kpis.batteryCycles,
          heatingComfort: result.kpis.heating_comfort_ratio,
          poolCompletion: result.kpis.pool_filtration_completion,
          evCompletion: result.kpis.ev_charge_completion,
          energyConservation: conservation
        });

        completed++;
        const progress = ((completed / total) * 100).toFixed(1);
        const statusIcon = conservation.valid ? '✅' : '❌';
        console.log(`  ${statusIcon} ${strategy.padEnd(25)} [${progress}%]`);

        if (!conservation.valid) {
          console.warn(`    ⚠️  Energy conservation failed: ${conservation.error_kWh.toFixed(3)} kWh error`);
        }
      } catch (error) {
        console.error(`  ❌ ${strategy.padEnd(25)} FAILED:`, error instanceof Error ? error.message : error);
      }
    }
  }

  console.log(`\n✅ ${completed}/${total} simulations completed\n`);
  return results;
}

/**
 * Génère le rapport markdown
 */
function generateMarkdownReport(results: CombinationResult[]): string {
  const lines: string[] = [];

  lines.push('# Validation E2E — 70 Combinaisons Stratégie × Scénario');
  lines.push('');
  lines.push('**Date** : ' + new Date().toISOString().split('T')[0]);
  lines.push('**LOT 7** : Validation et Tests E2E du refactoring Mode Laboratoire');
  lines.push('');
  lines.push('---');
  lines.push('');

  // Résumé
  const totalValid = results.filter(r => r.energyConservation.valid).length;
  lines.push('## Résumé');
  lines.push('');
  lines.push(`- **Total simulations** : ${results.length}`);
  lines.push(`- **Conservation énergie** : ${totalValid}/${results.length} ✅`);
  lines.push(`- **Scénarios testés** : ${SCENARIOS.length}`);
  lines.push(`- **Stratégies testées** : ${STRATEGIES.length}`);
  lines.push('');

  if (totalValid < results.length) {
    lines.push('### ⚠️ Erreurs de conservation d\'énergie');
    lines.push('');
    results
      .filter(r => !r.energyConservation.valid)
      .forEach(r => {
        lines.push(`- **${SCENARIO_LABELS[r.scenario]}** × **${r.strategy}** : Erreur ${r.energyConservation.error_kWh.toFixed(3)} kWh`);
      });
    lines.push('');
  }

  lines.push('---');
  lines.push('');

  // TABLEAU 1 : Podium par scénario
  lines.push('## Tableau 1 : Podium par Scénario');
  lines.push('');
  lines.push('**Question** : "Pour ce scénario, quelle stratégie dois-je choisir ?"');
  lines.push('');
  lines.push('| Scénario | 🥇 Top 1 | 🥈 Top 2 | 🥉 Top 3 | Métrique |');
  lines.push('|----------|---------|---------|---------|----------|');

  for (const scenario of SCENARIOS) {
    const scenarioResults = results.filter(r => r.scenario === scenario);
    const sorted = [...scenarioResults].sort((a, b) => b.autoconso - a.autoconso);
    const top3 = sorted.slice(0, 3);

    const top1 = top3[0] ? `${STRATEGY_LABELS[top3[0].strategy]} (${(top3[0].autoconso * 100).toFixed(1)}%)` : '-';
    const top2 = top3[1] ? `${STRATEGY_LABELS[top3[1].strategy]} (${(top3[1].autoconso * 100).toFixed(1)}%)` : '-';
    const top3Str = top3[2] ? `${STRATEGY_LABELS[top3[2].strategy]} (${(top3[2].autoconso * 100).toFixed(1)}%)` : '-';

    lines.push(`| ${SCENARIO_LABELS[scenario]} | ${top1} | ${top2} | ${top3Str} | Autoconso |`);
  }

  lines.push('');
  lines.push('**Légende** : Classement par autoconsommation (% PV consommé sur site).');
  lines.push('');
  lines.push('---');
  lines.push('');

  // TABLEAU 2 : Performance globale par stratégie
  lines.push('## Tableau 2 : Performance Globale par Stratégie');
  lines.push('');
  lines.push('**Question** : "Cette stratégie est-elle robuste sur tous les scénarios ?"');
  lines.push('');

  // Calcul des moyennes
  interface StrategyStats {
    strategy: StrategyId;
    avgAutoconso: number;
    avgCost: number;
    avgEcsComfort: number;
    avgCycles: number;
    count: number;
  }

  const strategyStats: Map<StrategyId, StrategyStats> = new Map();

  for (const strategy of STRATEGIES) {
    const strategyResults = results.filter(r => r.strategy === strategy);
    const count = strategyResults.length;

    if (count === 0) continue;

    const avgAutoconso = strategyResults.reduce((sum, r) => sum + r.autoconso, 0) / count;
    const avgCost = strategyResults.reduce((sum, r) => sum + r.cost_EUR, 0) / count;
    const avgEcsComfort = strategyResults.reduce((sum, r) => sum + r.ecsComfort, 0) / count;
    const avgCycles = strategyResults.reduce((sum, r) => sum + r.batteryCycles, 0) / count;

    strategyStats.set(strategy, {
      strategy,
      avgAutoconso,
      avgCost,
      avgEcsComfort,
      avgCycles,
      count
    });
  }

  // Tri par autoconso moyenne
  const sortedStats = Array.from(strategyStats.values()).sort((a, b) => b.avgAutoconso - a.avgAutoconso);

  lines.push('| Rang | Stratégie | Autoconso moy. | Coût moy. | Confort ECS | Cycles batt. |');
  lines.push('|------|-----------|----------------|-----------|-------------|--------------|');

  sortedStats.forEach((stat, idx) => {
    const rank = idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : `${idx + 1}`;
    const autoconso = `${(stat.avgAutoconso * 100).toFixed(1)}%`;
    const cost = stat.avgCost >= 0 ? `+${stat.avgCost.toFixed(2)}€` : `${stat.avgCost.toFixed(2)}€`;
    const comfort = `${(stat.avgEcsComfort * 100).toFixed(1)}%`;
    const cycles = stat.avgCycles.toFixed(2);

    lines.push(`| ${rank} | ${STRATEGY_LABELS[stat.strategy]} | ${autoconso} | ${cost} | ${comfort} | ${cycles} |`);
  });

  lines.push('');
  lines.push('**Légende** : Moyennes calculées sur les 7 scénarios. Classement par autoconsommation moyenne.');
  lines.push('');
  lines.push('---');
  lines.push('');

  // Tableau 3 : Matrice complète (optionnel, pour référence)
  lines.push('## Tableau 3 : Matrice Complète (Autoconsommation %)');
  lines.push('');
  lines.push('<details>');
  lines.push('<summary>Cliquer pour voir la matrice complète des 70 combinaisons</summary>');
  lines.push('');
  lines.push('| Scénario | ' + STRATEGIES.map(s => STRATEGY_LABELS[s]).join(' | ') + ' |');
  lines.push('|' + '-'.repeat(10) + '|' + STRATEGIES.map(() => '-'.repeat(10)).join('|') + '|');

  for (const scenario of SCENARIOS) {
    const row = [SCENARIO_LABELS[scenario]];

    for (const strategy of STRATEGIES) {
      const result = results.find(r => r.scenario === scenario && r.strategy === strategy);
      const value = result ? `${(result.autoconso * 100).toFixed(1)}%` : '-';
      row.push(value);
    }

    lines.push('| ' + row.join(' | ') + ' |');
  }

  lines.push('');
  lines.push('</details>');
  lines.push('');
  lines.push('---');
  lines.push('');

  // Insights
  lines.push('## Insights');
  lines.push('');

  if (sortedStats.length > 0) {
    const best = sortedStats[0];
    const worst = sortedStats[sortedStats.length - 1];

    lines.push(`### 🏆 Meilleure stratégie globale : ${STRATEGY_LABELS[best.strategy]}`);
    lines.push('');
    lines.push(`- **Autoconsommation moyenne** : ${(best.avgAutoconso * 100).toFixed(1)}%`);
    lines.push(`- **Coût moyen** : ${best.avgCost >= 0 ? '+' : ''}${best.avgCost.toFixed(2)}€`);
    lines.push(`- **Confort ECS moyen** : ${(best.avgEcsComfort * 100).toFixed(1)}%`);
    lines.push('');

    lines.push(`### 📉 Moins performante : ${STRATEGY_LABELS[worst.strategy]}`);
    lines.push('');
    lines.push(`- **Autoconsommation moyenne** : ${(worst.avgAutoconso * 100).toFixed(1)}%`);
    lines.push(`- **Coût moyen** : ${worst.avgCost >= 0 ? '+' : ''}${worst.avgCost.toFixed(2)}€`);
    lines.push(`- **Confort ECS moyen** : ${(worst.avgEcsComfort * 100).toFixed(1)}%`);
    lines.push('');
  }

  // Analyse par scénario
  lines.push('### Stratégies dominantes par scénario');
  lines.push('');

  for (const scenario of SCENARIOS) {
    const scenarioResults = results.filter(r => r.scenario === scenario);
    const best = [...scenarioResults].sort((a, b) => b.autoconso - a.autoconso)[0];

    if (best) {
      const costStr = typeof best.cost_EUR === 'number'
        ? `${best.cost_EUR >= 0 ? '+' : ''}${best.cost_EUR.toFixed(2)}€`
        : 'N/A';
      lines.push(`- **${SCENARIO_LABELS[scenario]}** : ${STRATEGY_LABELS[best.strategy]} (${(best.autoconso * 100).toFixed(1)}% autoconso, ${costStr})`);
    }
  }

  lines.push('');
  lines.push('---');
  lines.push('');
  lines.push('**Généré automatiquement par** : `scripts/validate-all-combinations.ts`');
  lines.push('');

  return lines.join('\n');
}

/**
 * Point d'entrée principal
 */
function main() {
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║  LOT 7 - Validation E2E : 70 Combinaisons                 ║');
  console.log('╚════════════════════════════════════════════════════════════╝');
  console.log('');

  const startTime = Date.now();

  try {
    const results = runAllCombinations();
    const report = generateMarkdownReport(results);

    const outputPath = resolve(__dirname, '../Docs/validation_e2e_results.md');
    writeFileSync(outputPath, report, 'utf8');

    const duration = ((Date.now() - startTime) / 1000).toFixed(1);

    console.log('');
    console.log('╔════════════════════════════════════════════════════════════╗');
    console.log('║  ✅ VALIDATION COMPLÉTÉE                                   ║');
    console.log('╚════════════════════════════════════════════════════════════╝');
    console.log('');
    console.log(`📄 Rapport généré : ${outputPath}`);
    console.log(`⏱️  Durée : ${duration}s`);
    console.log('');
  } catch (error) {
    console.error('❌ Erreur lors de la validation :', error);
    process.exit(1);
  }
}

main();
