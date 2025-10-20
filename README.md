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
