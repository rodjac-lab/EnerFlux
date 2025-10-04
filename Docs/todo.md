# EnerFlux — Backlog / TODO (2025-09-20)

## Court terme (S3)
- [x] Implémenter **contrat de service ECS** :
  - [x] Types & transport (`EcsServiceContract`)
  - [x] KPI service : T° @deadline, déficit K, pénalités €, net_cost_with_penalties
  - [x] Badge/UI pour visualiser secours ou pénalités
- [x] Tests Vitest :
  - [x] Vérifier pénalité si T° < cible à la deadline (`ecs_service_contract.test.ts`)
  - [x] Vérifier comportements helpers/hystérésis (`ecs_helpers.test.ts`)
- [x] Docs :
  - [x] README : section “Contrat de service ECS”
- [x] Exposer les stratégies **`ecs_hysteresis`** et **`deadline_helper`** dans `core/strategy.ts`
  - [x] Ajouter sélection correspondante dans la UI (panel Stratégie + worker)
  - [x] Décrire l’impact dans l’aide (tooltip HELP)
- [x] Ajouter presets S3 autour des contrats ECS (ex : « Matin froid », « Ballon confort »)

## Moyen terme (S4)
- [x] Étendre KPIs économiques :
  - [x] ROI simplifié (temps de retour sur investissement)
  - [x] Δ € vs scénario “grid-only”
- [ ] Ajouter stratégie `reserve_evening`
- [ ] UI : vue condensée des KPIs + comparaison multi-métriques

## Long terme
- [ ] Intégrer chauffage, piscine, VE
- [ ] UI compacte / plus graphique (moins de saisie, plus de visualisation)
- [ ] Scénarios multi-jours (analyse hebdo ou mensuelle)
- [ ] KPI confort (fenêtres de T° ≥ seuil sur la journée)
