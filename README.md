# EnerFlux

[![Build status](https://img.shields.io/badge/build-TODO-lightgrey)](#ci)
[![Test status](https://img.shields.io/badge/tests-TODO-lightgrey)](#ci)

Laboratoire open-source pour comparer des stratégies d'autoconsommation résidentielle (PV, batterie, ECS, VE, chauffage, piscine) au travers d'une simulation déterministe et d'une UI interactive.

---

> 📖 **Documentation mise à jour** (20 octobre 2025)
>
> **Nouvelle structure documentaire** : Voir **[Docs/README.md](./Docs/README.md)** pour l'index complet
>
> **Vision v2.0** : Mode Laboratoire Pédagogique + Mode Optimisation Optimale → **[Docs/product_vision.md](./Docs/product_vision.md)**
>
> **Refactoring en cours** : Plan détaillé → **[Docs/refactoring_plan_mode_laboratoire.md](./Docs/refactoring_plan_mode_laboratoire.md)**

---

## Quickstart

### Prérequis
- Node.js LTS (≥ 18). Vérifiez avec `node --version`.
- npm ≥ 9 (installé avec Node). Mettez à jour via `npm install -g npm@latest` si besoin.

### Installer et lancer l'app
```bash
# 1. Cloner et installer
git clone https://github.com/enerflux-lab/enerflux.git
cd enerflux
npm install

# 2. Lancer le serveur de dev (Vite + React)
npm run dev
```
Le serveur Vite écoute par défaut sur [http://localhost:5173](http://localhost:5173). Un rechargement à chaud s'effectue à chaque modification.

### Construire pour la production
```bash
npm run build
```
Le bundle optimisé est généré dans `dist/`. Servez-le via `npm run preview` ou votre serveur statique préféré.

## Run tests
- **Suite unitaire & intégration** : `npm run test`. L'exécution complète prend ~20 s sur une machine de développement récente et affiche des avertissements Recharts attendus lors des tests UI.
- **Tests « golden » (exports JSON/CSV)** : inclus dans `npm run test` (`tests/exporter.test.ts`). Si un changement de format est intentionnel, mettez à jour les attentes dans ce fichier et justifiez-le dans la PR.
- **Mode watch** : `npm run test:watch` pour itérer rapidement pendant le développement.
- **Snapshots Vitest** : utilisez `npm run test -- --update` pour rafraîchir des snapshots si nous en ajoutons dans le futur.

## Documentation
- **Agent Guide (Doc-First)** → `AGENT.md`

### Docs map
| Document | Objectif |
| --- | --- |
| [Product Vision](Docs/product_vision.md) | Cadrage produit et personas ciblés pour guider les priorités. |
| [Development Plan](Docs/development_plan.md) | Jalons techniques/fonctionnels avec dépendances et périmètre. |
| [Algorithms Playbook](Docs/algorithms_playbook.md) | Matrice des stratégies + pseudocode homogène pour la prise de décision. |
| [Metrics & Tests](Docs/metrics_and_tests.md) | Définitions des KPI et cartographie des scénarios/tests associés. |
| [Tech Guidelines](Docs/tech_guidelines.md) | Règles d'architecture, style TypeScript et exigences de test. |
| [Domain Glossary](Docs/domain_glossary.md) | Terminologie normalisée (autoconsommation, SOC, ToU, etc.) avec exemples. |
| [Scenarios Catalog](Docs/scenarios_catalog) | Banque de scénarios prêts à l'emploi couvrant saisons, tarifs et presets. |
| [Status log](Docs/status.md) | Journal d'avancement synthétique pour suivre les livraisons. |
| [Backlog & TODO](Docs/todo.md) | Liste vivante des tâches à prioriser ou à investiguer. |

## Contributing
1. Forkez le dépôt et créez une branche : `git checkout -b feature/ma-feature`.
2. Implémentez vos changements en respectant les [guidelines techniques](Docs/tech_guidelines.md).
3. Exécutez `npm run test` (et `npm run build` si vous touchez au bundle) avant de pousser.
4. Ouvrez une PR détaillant le contexte, les tests et les impacts KPI.
5. Répondez aux revues et tenez la documentation à jour si nécessaire.

## Demo
La dernière build est disponible sur GitHub Pages : [enerflux.github.io](https://enerflux.github.io/). Chargez un preset (ex. « Matin froid » ou « Soirée VE ») pour comparer rapidement deux stratégies dans l'UI.

### Mode Laboratoire (Octobre 2025)
**Objectif** : Environnement pédagogique pour comprendre et comparer les stratégies d'allocation du surplus PV.

**Fonctionnalités** :
- **Comparaison A/B** : Lancez deux stratégies côte à côte sur le même scénario (météo + configuration équipements)
- **Ordre d'allocation visible** : Chaque stratégie affiche sa priorité d'allocation (ex. "Base → ECS → Batterie → ...")
- **7 scénarios prêts à l'emploi** : Profils météo variés (hiver rigoureux, été ensoleillé, etc.) avec configurations réalistes
- **10 stratégies disponibles** : De `no_control_offpeak` (baseline sans optimisation) à `reserve_evening` (réserve batterie soirée)
- **KPIs côte à côte** : Autoconsommation, coûts, confort thermique et ECS comparés en temps réel

**Cas d'usage** :
- 🎓 **Apprentissage** : Comprendre l'impact de l'ordre d'allocation sur l'autoconsommation
- 🔬 **Expérimentation** : Tester une nouvelle stratégie sans risque sur différents profils
- 📊 **Benchmark** : Comparer votre stratégie actuelle avec une baseline ou une alternative
- 🧪 **Prototypage** : Valider une idée d'optimisation avant implémentation en production

Consultez [Docs/waterfall_allocation.md](./Docs/waterfall_allocation.md) pour comprendre le système d'allocation configurable.

---

### Mode Coach Prédictif (Janvier 2025) ✅

**Objectif** : Simulateur hebdomadaire avec anticipation météo/tarifs et narrateur IA pour optimiser l'autoconsommation sur 7 jours.

**Fonctionnalités** :
- **Simulation 7 jours** : Orchestration multi-jours avec persistance état équipements (batterie SOC, température ECS)
- **4 stratégies MPC** : Heuristiques anticipant météo + Tempo (sunny_tomorrow, cloudy_tomorrow, tempo_red_guard, balanced)
- **Narrateur IA** : 6 analyseurs générant insights contextuels (opportunités, alertes, conseils actionables)
- **3 providers météo** : OpenWeather Solar (payant), PVGIS (gratuit EU), Mock (testing)
- **2 providers tarif** : RTE Tempo API officielle (gratuit), Mock (testing)
- **Chaîne de fallback** : Basculement automatique OpenWeather → PVGIS → Mock
- **UI interactive** :
  - Calendrier 7 jours avec météo + Tempo color
  - **Graphique comparatif animé** : Baseline (stratégie fixe) vs MPC optimisé avec courbes de coûts quotidiens
  - KPIs hebdomadaires (autoconsommation, coûts, confort)
  - Insights IA avec animations fluides
  - Tooltips explicatifs pour chaque stratégie MPC

**Status** :
- ✅ **Phase 1-2** : Backend MPC avec presets météo/tarifs (gains ≥15% mesurés)
- ✅ **Phase 3** : Narrateur IA (≥10 insights pertinents générés)
- ✅ **Phase 4** : Intégration APIs réelles (OpenWeather, PVGIS, RTE Tempo)
- ✅ **Phase 5** : UI Coach (calendrier 7j, KPIs, narrateur IA, animations fluides)
- 📋 **Phase 6** : Polish + documentation utilisateur (guide, tests E2E, responsive)

**Documentation** :
- Vision produit → [Docs/mode_coach_predictif_vision.md](./Docs/mode_coach_predictif_vision.md)
- Architecture technique → [Docs/mpc_architecture.md](./Docs/mpc_architecture.md)
- Phase 4 summary → [Docs/phase4_implementation_summary.md](./Docs/phase4_implementation_summary.md)
- Phase 5 summary → [Docs/phase5_implementation_summary.md](./Docs/phase5_implementation_summary.md)
- UI design doc → [Docs/phase5_ui_design.md](./Docs/phase5_ui_design.md)
- Guide providers → [src/data/providers/README.md](./src/data/providers/README.md)

**Usage (API Backend)** :
```typescript
import { DataProviderFactory, runWeeklySimulation, mpcBalancedStrategy } from './core/mpc';

// Mode Free (PVGIS + RTE Tempo, 100% gratuit)
const provider = DataProviderFactory.createFree(
  { peakPower_kWp: 6 },
  '48.8566,2.3522' // Paris
);

const forecast = await provider.fetchWeeklyForecast('2025-03-17');
const result = runWeeklySimulation({
  dt_s: 900,
  forecast,
  devices: [battery, dhwTank],
  mpcStrategy: mpcBalancedStrategy
});

console.log(`Weekly Cost: ${result.weeklyKPIs.netCostWithPenalties_eur.toFixed(2)} €`);
console.log(`Self-Consumption: ${result.weeklyKPIs.selfConsumption_percent.toFixed(1)} %`);
```

**Tests** : 160/160 passent (19 nouveaux pour Phase 4)

---

### Graphiques unifiés
- Palette daltonien-friendly appliquée à tous les graphiques (PV, charge, batterie, réseau, ECS, usages pilotés).
- Nouvel habillage `ChartFrame` : titres systématiques, sous-titres contextuels, légende harmonisée et tooltips tabulaires.
- Formats d'unités normalisés (`kW`, `kWh`, `€`, `%`, `HH:mm`) pour axes, tooltips et export.
- Accessibilité renforcée : contrastes contrôlés, grille légère, focus clavier sur les conteneurs de graphes.

#### Refonte des graphiques de comparaison A/B (Octobre 2025)
**Objectif** : Améliorer la lisibilité et réduire la surcharge visuelle des graphiques dans la vue de comparaison.

**Changements principaux** :
- **EnergyFlowDiagram** (nouveau) : Diagramme SVG animé avec navigation temporelle (slider + play/pause) représentant les flux énergétiques en temps réel entre PV → Maison/Batterie/Réseau et Batterie/Réseau → Maison. Visualisation intuitive avec particules animées proportionnelles à l'intensité des flux.
- **EnergyFlowsChart** : Simplifié de 7 séries empilées à 4 lignes claires (PV, Consommation totale, Batterie nette, Réseau net). Hauteur augmentée à 300px. Tooltips compacts et décalés (30px) du curseur.
- **BatterySocChart** : Retrait du wrapper `ChartFrame`, couleurs variant-specific (A=vert, B=violet), domaine Y auto-calculé si configuration batterie invalide (gère les cas `socMax=0`).
- **DecisionsTimeline** : Suppression des ~100+ `ReferenceLine` individuelles (lignes orange superposées illisibles), affichage uniquement des points d'événement + marqueur deadline. Hauteur réduite à 100px.
- **DhwPanel** : Passage à un seul axe Y (température uniquement, axe puissance retiré), ajout d'une zone de confort visuelle (50-60°C), ligne de cible avec label. Hauteur réduite à 140px.
- **ChartFrame** : Correction du système de hauteur (retrait `h-full`/`flex-1` causant expansion infinie), utilisation de `minHeight` comme hauteur explicite.

**Impact** : -272 lignes de code, meilleure lisibilité, tooltips moins intrusifs, gestion robuste des cas limites (batterie désactivée).

#### Onglet "Flux énergétiques" (Octobre 2025)
**Objectif** : Centraliser les visualisations de flux énergétiques dans un onglet dédié pour améliorer la navigation et la cohérence de l'UI.

**Fonctionnalités** :
- **Navigation à 3 onglets** : "Simulation" (comparaison A/B avec 4 graphiques), "Flux énergétiques" (visualisations des flux), "Paramètres avancés" (configuration)
- **Diagrammes animés côte à côte** : EnergyFlowDiagram pour stratégies A et B avec navigation temporelle synchronisée
- **Placeholder Sankey** : Section réservée pour les futurs diagrammes de Sankey montrant les flux cumulés (kWh) entre sources (PV, Batterie, Réseau) et destinations (Charge base, ECS, Chauffage, Piscine, VE)
- **État vide géré** : Message d'invitation à lancer une simulation si aucune donnée n'est disponible
- **Partage de données** : Mécanisme de callback (`onExportReady`) permettant à CompareAB de transmettre les résultats de simulation aux autres onglets

**Impact** : Meilleure organisation de l'interface, séparation claire entre comparaison temporelle (onglet Simulation) et analyse des flux globaux (onglet Flux énergétiques), préparation pour visualisations Sankey.

### Modélisation réaliste du ballon ECS et stratégies no-control (Octobre 2025)
**Objectif** : Corriger les lacunes du modèle ECS et ajouter des scénarios de référence sans optimisation PV.

**Problèmes identifiés** :
- Aucun puisage d'eau chaude modélisé → ballon reste chaud sans raison de rechauffer
- Modulation de puissance impossible sur chauffe-eau résistif (0.5 kW, 1.2 kW, etc.) alors que réalité = ON (2.6 kW) ou OFF (0 kW)
- Pas de stratégie "baseline" pour comparer gains d'optimisation vs comportement classique pré-PV

**Changements** :
- **DHWTank.ts** : Ajout de `WaterDrawEvent` (heure, volume, température eau froide) et `drawProfile` dans `DHWTankParams`
- **registry.ts** : Création de 3 profils types :
  - `light` : 120 L/jour (célibataire/couple)
  - `medium` : 160 L/jour (famille 3-4 personnes)
  - `heavy` : 220 L/jour (famille nombreuse)
- **scenarios.ts** : Application des profils aux 7 scénarios existants selon type de foyer
- **strategy.ts** : Ajout de 2 nouvelles stratégies de référence :
  - `no_control_offpeak` : Chauffe-eau heures creuses classique (aucune allocation surplus PV)
  - `no_control_hysteresis` : Thermostat simple sans optimisation PV
- **domain_glossary.md** : Ajout des définitions "Puisage ECS", "Contrôle ON/OFF", "Heures creuses", "No-control"

**Impact** : Simulations réalistes avec consommation ECS quotidienne, baseline de comparaison pour mesurer ROI des stratégies intelligentes, correction du modèle physique pour chauffe-eau résistif.

## CI
Les badges ci-dessus sont des espaces réservés tant que la CI GitHub Actions (build + tests) n'est pas publiée. Lorsque les workflows seront actifs, remplacez-les par les URL réelles.

## Licence
MIT (à confirmer avec l'équipe produit).
