# EnerFlux — Backlog / TODO (2025-09-20)

## Court terme (S3)
- [ ] Implémenter **contrat de service ECS** :
  - [ ] Types & transport (`EcsServiceContract`)
  - [ ] KPI service : T° @deadline, déficit K, pénalités €, net_cost_with_penalties
  - [ ] Badge “Service ECS” dans UI + affichage pénalités
- [ ] Stratégies optionnelles :
  - [ ] `ecs_hysteresis`
  - [ ] `deadline_helper`
- [ ] Tests Vitest :
  - [ ] Vérifier pénalité si T° < cible à la deadline
  - [ ] Vérifier `deadline_helper` respecte contrainte
- [ ] Docs :
  - [ ] README : section “Contrat de service ECS”

## Moyen terme (S4)
- [ ] Étendre KPIs économiques :
  - [ ] ROI simplifié (temps de retour sur investissement)
  - [ ] Δ € vs scénario “grid-only”
- [ ] Ajouter presets “TOU MatinFroid”, “TOU BatterieVide” (déjà esquissés)
- [ ] Ajouter stratégie `reserve_evening`

## Long terme
- [ ] Intégrer chauffage, piscine, VE
- [ ] UI compacte / plus graphique (moins de saisie, plus de visualisation)
- [ ] Scénarios multi-jours (analyse hebdo ou mensuelle)
- [ ] KPI confort (fenêtres de T° ≥ seuil sur la journée)
