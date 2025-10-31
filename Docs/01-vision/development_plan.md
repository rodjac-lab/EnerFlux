# EnerFlux — Development Plan

## Overview
EnerFlux v1 vise à offrir un simulateur complet d'autoconsommation résidentielle, couvrant la planification énergétique (PV, batterie, ECS, chauffage, piscine, VE), les comparaisons de stratégies A/B et un ensemble de KPIs physiques/économiques exploitables. L'objectif produit est d'apporter une UI fluide, des scénarios reproductibles et des décisions appuyées par des métriques unit-safe et documentées.

## Lots S1 → S7
| Lot | Scope & goals | Changes | Deliverables | Acceptance criteria | Risks / Mitigations | Links | Owner |
| --- | --- | --- | --- | --- | --- | --- | --- |
| **S1 — Core foundations** | Boucle moteur, ECS, batterie, UI minimale.<br>Aligner la physique (bilans kW/kWh) et les presets de base. | Implémenter `core/engine`, stratégies ECS/batterie, presets été/hiver basiques. | Modules `core/engine.ts`, `core/strategy.ts`, `core/kpis.ts`.<br>Devices `Battery`, `DHWTank`.<br>UI App A/B + 2 graphes. | • KPI énergie respectent bilans à 1e-6 kWh.<br>• ECS atteint consigne + secours si besoin.<br>• Tests `engine_minimal` & `ecs_physics` verts. | Sous-modélisation ECS → valider via cas extrêmes.<br>Perf UI → pré-rendu + worker.<br>Dette technique → checklist JSDoc. | [Docs/status.md](Docs/status.md#dernieres-etapes)<br>[Docs/todo.md](Docs/todo.md#court-terme-s3) | Core team |
| **S2 — UX & multi-métriques** | Clarifier la comparaison A/B et les scores multi-critères. | Vue KPI condensée, presets enrichis, stratégie `mix_soc_threshold`. | UI comparateur enrichi, exports CSV/JSON v1, doc KPIs. | • Score multi-métriques affiché en UI.<br>• Export JSON validé (schéma v1).<br>• Tests snapshot KPI stables. | Complexité UI → prototypes Figma.<br>Désalignement produit → revue hebdo.<br>Export volumineux → streaming worker. | [Docs/status.md](Docs/status.md#dernieres-etapes)<br>[Docs/todo.md](Docs/todo.md#moyen-terme-s4) | UX guild |
| **S3 — ECS service contract** | Introduire contrats ECS & helpers pour gérer confort. | Contrat service ECS, stratégies `ecs_hysteresis` & `deadline_helper`, presets dédiés. | Types `EcsServiceContract`, panneau UI ECS, docs README. | • Penalties € appliquées si cible manquée.<br>• KPI T° ECS ≥ cible >95 % sur preset « Matin froid ».<br>• Tests `ecs_service_contract` et `ecs_helpers` verts. | Compréhension contrat → doc & tooltips.<br>Régression ECS → tests golden flux ECS.<br>Charge cognitive UI → toggles contextualisés. | [Docs/todo.md](Docs/todo.md#court-terme-s3) | ECS squad |
| **S4 — Économie & stratégie soirée** | Ajouter KPIs économiques et arbitrage soirée. | Stratégie `reserve_evening`, KPIs ROI/Δ€, vue KPI condensée. | Modules KPI € + docs, presets soirée. | • KPI ROI et Δ€ affichés et documentés.<br>• Stratégie `reserve_evening` maintient SOC ≥60 % avant 18 h dans tests.<br>• Snapshot KPI € stable sur preset « Ballon confort ». | Hypothèses € fragiles → référence `Docs/metrics_and_tests.md`.<br>Stratégie mal comprise → guide scenario. | [Docs/status.md](Docs/status.md#dernieres-etapes)<br>[Docs/todo.md](Docs/todo.md#moyen-terme-s4) | Finance WG |
| **S5 — Multi-équipements** ✅ | Intégrer chauffage, piscine, VE et arbitrage multi-priorités. | Implémenter devices chauffage/piscine/VE, stratégie `multi_equipment_priority`, KPIs confort. | Devices S5, presets hiver/piscine/VE, capture comparateur, tests physiques. | • Chauffage maintient confort ≥90 % sur preset hiver.<br>• Filtration piscine ≥100 % complétée sur preset été.<br>• KPIs confort affichés et validés via tests Vitest. | Synchronisation équipes → stand-up dédié.<br>Complexité stratégie → pseudo-code partagé (`Docs/s5_plan.md`).<br>Dette doc → suivi `Docs/status.md`. | [Docs/s5_plan.md](Docs/s5_plan.md)<br>[Docs/status.md](Docs/status.md#prochain-focus-s5) | Multi-eq taskforce |
| **S6 — Mode Coach Prédictif (MPC)** 🎯 | Simulations hebdomadaires avec anticipation météo/tarifs pour démontrer gains du pilotage prédictif. | Extension moteur multi-jours (7j), stratégie MPC avec 4 heuristiques, narrateur IA explications, UI Coach timeline hebdo, intégration APIs météo/tarifs (Phase 3). | Backend `runWeekSimulation()`, stratégie `mpcSmartWeek`, narrateur IA insights, UI `CoachView`, DataProvider APIs Météo France + RTE Tempo (Phase 3). | • Simulation 7j stable (conservation <0.1 kWh/jour).<br>• MPC bat stratégie fixe ≥15% coût.<br>• ≥10 insights IA pertinents/semaine.<br>• UI timeline 7j + comparaison MPC vs baseline.<br>• DataProvider APIs Météo France + RTE Tempo (Phase 3). | Heuristiques MPC inefficaces → validation gains Phase 1-2 avant APIs.<br>APIs instables → fallback presets transparent.<br>Complexité UI → prototypage timeline 7j. | [Docs/mode_coach_predictif_vision.md](Docs/mode_coach_predictif_vision.md)<br>[Docs/mpc_architecture.md](Docs/mpc_architecture.md) | Coach Team |
| **S7 — Tarifs avancés & ouverture** | Préparer V1 publique : tarifs dynamiques avancés, API REST export, monitoring. | ToU dynamique complexe, API REST d'export, instrumentation Sentry. | Modules tarifs dynamiques, documentation API REST, bundle monitoré, alerting. | • API export retourne JSON signé (tests contract).<br>• Alerting Sentry actif en préprod.<br>• Documentation API REST complète. | Scope creep → RFC obligatoire.<br>Risques compliance → revue légale. | [Docs/todo.md](Docs/todo.md#long-terme)<br>[Docs/status.md](Docs/status.md#etat-deploiement) | Core + Platform |

## Current Focus — S6 Mode Coach Prédictif

**Statut actuel** : S1-S5 ✅ complétés, v2.0 Mode Laboratoire taggé.

**Lot actif** : **S6 — Mode Coach Prédictif**

Détails techniques centralisés dans :
- **Vision produit** : [Docs/mode_coach_predictif_vision.md](Docs/mode_coach_predictif_vision.md)
- **Architecture technique** : [Docs/mpc_architecture.md](Docs/mpc_architecture.md)

### Découpage S6 en Phases

| Phase | Objectif | Durée | Deliverable | Gate | Statut |
|-------|----------|-------|-------------|------|--------|
| **Phase 1-2** ✅ | MVP avec presets | 3 sem | MPC fonctionnel, gains ≥15% mesurés | Gains MPC validés avant Phase 3 | **COMPLÉTÉ** |
| **Phase 3** ✅ | Narrateur IA (🔄 AVANT APIs) | 1 sem | ≥10 insights pertinents testés avec MPC | Narrateur explique heuristiques MPC | **COMPLÉTÉ** |
| **Phase 4** ✅ | Intégration APIs réelles (🔄 APRÈS Narrateur) | 1 sem | DataProvider + OpenWeather + PVGIS + RTE Tempo | APIs fonctionnelles + narrateur OK | **COMPLÉTÉ** |
| **Phase 5** ✅ | UI Coach complète | 1 sem | Timeline 7j + animations Plotset + narrateur IA | UI réactive + animations fluides | **COMPLÉTÉ** |
| **Phase 6** | Polish & doc utilisateur | 1 sem | Guide utilisateur, export JSON, tests E2E | Prêt pour utilisateurs finaux | Planned |

**Total estimé S6** : 7 semaines

**Progression** : Phase 5/6 ✅ (83% complété)

Le suivi quotidien (ticks backlog, décisions) reste dans [Docs/status.md](Docs/status.md) et [Docs/todo.md](Docs/todo.md).

---

### Phase 4: APIs Réelles — Détail d'implémentation ✅

**Date de complétion**: 2025-01-26
**Documentation**: [Docs/phase4_implementation_summary.md](phase4_implementation_summary.md)

#### Livrables Phase 4

**Providers météo intégrés**:
- ✅ `OpenWeatherProvider` - OpenWeather Solar Irradiance API (payant, prévisions 15j)
- ✅ `PVGISProvider` - PVGIS EU Commission (gratuit, TMY historiques)
- ✅ `MockWeatherProvider` - Presets déterministes (Phase 1-3, testing)

**Providers tarif intégrés**:
- ✅ `RTETempoProvider` - RTE Tempo API officielle (gratuit, annonce J-1)
- ✅ `MockTariffProvider` - Presets Tempo (Phase 1-3, testing)

**Architecture**:
- ✅ `DataProviderFactory` - Factory pattern avec 3 modes (mock/real/auto)
- ✅ `FallbackWeatherProvider` - Chaîne de fallback automatique (OpenWeather → PVGIS → Mock)
- ✅ Fallback RTE Tempo - Si échec API → 7 jours BLUE (hypothèse conservative)

**Tests**:
- ✅ 19 tests d'intégration (mocked API responses)
- ✅ 160/160 total suite (100% passing, zéro breaking change)
- ✅ Coverage: API parsing, error handling, fallback chain, location validation

**Documentation**:
- ✅ [phase4_implementation_summary.md](phase4_implementation_summary.md) - Architecture complète
- ✅ [src/data/providers/README.md](../src/data/providers/README.md) - Guide utilisation
- ✅ [examples/real_providers_demo.ts](../examples/real_providers_demo.ts) - Démo interactive

**Code**:
- ✅ 1549 LOC ajoutées (4 providers + factory + tests)
- ✅ API publique étendue dans [src/core/mpc.ts](../src/core/mpc.ts)
- ✅ Build production réussi (673 kB bundle)

#### Validation Gates Phase 4

| Gate | Critère | Statut | Evidence |
|------|---------|--------|----------|
| APIs fonctionnelles | 3 providers météo + 2 providers tarif implémentés | ✅ PASS | 5 providers codés + tests |
| Fallback robuste | Chaîne de fallback automatique testée | ✅ PASS | `FallbackWeatherProvider` + 2 tests intégration |
| Zéro breaking change | Tests Phase 1-3 non affectés | ✅ PASS | 160/160 tests passent |
| Documentation complète | Architecture, usage, exemples documentés | ✅ PASS | 3 docs créés (summary + README + demo) |
| Narrateur OK | Phase 3 compatible avec Phase 4 | ✅ PASS | Aucun changement requis, 100% compatible |

#### Usage Phase 4

**Mode Mock** (testing, pas d'API):
```typescript
const provider = DataProviderFactory.createMock();
const forecast = await provider.fetchWeeklyForecast('2025-03-17');
```

**Mode Free** (PVGIS + RTE Tempo, 100% gratuit):
```typescript
const provider = DataProviderFactory.createFree(
  { peakPower_kWp: 6 },
  '48.8566,2.3522'
);
const forecast = await provider.fetchWeeklyForecast('2025-03-17');
```

**Mode Real** (OpenWeather + RTE Tempo, clé API requise):
```typescript
const provider = DataProviderFactory.createReal(
  'your-api-key',
  { peakPower_kWp: 6, efficiency: 0.75 },
  '48.8566,2.3522'
);
const forecast = await provider.fetchWeeklyForecast('2025-03-17');
```

#### Prochaine Phase

**Phase 5: UI Mode Coach** (1 semaine estimée)
- Tab-based navigation (coexistence Mode Labo + Mode Coach)
- Weekly calendar avec forecast météo/tarifs
- Narrative cards (insights AI Phase 3)
- KPIs comparatifs (MPC vs baseline)
- Energy flow diagrams animés

---

## Governance
- **Proposer un lot** : ouvrir une RFC courte (PR `Docs/development_plan.md`) décrivant objectifs, owner, risques. Validation lors du weekly planning.
- **Valider / fermer un lot** :
  - Vérifier que les critères d'acceptation sont démontrés (tests, captures, exports) et référencés dans `Docs/status.md`.
  - Mettre à jour `Docs/todo.md` (case cochée) et ajouter un résumé de livraison dans `Docs/status.md`.
  - Fermer ou lier les issues/PRs associées.
- **Déplacer un item** : noter le changement dans `Docs/status.md` (section « Décisions produit ») et ajuster `Docs/todo.md` en conséquence, en gardant l'historique (cases décochées → commentaires).
- **Gates entre phases** (S6) : Validation obligatoire des gains/stabilité avant passage phase suivante. Si gate échoue, iteration sur phase actuelle avant de continuer.
