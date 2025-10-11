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
- [x] Ajouter stratégie `reserve_evening`
- [x] UI : vue condensée des KPIs + comparaison multi-métriques

## Palier suivant (S5)
- [ ] Integrer chauffage electrique modulable :
  - [x] Modeliser un corps de chauffe resistif + inertie thermique logement
  - [x] Ajouter fenetres de confort (temperature cible par plage horaire)
  - [ ] Etendre la strategie pour arbitrer ECS vs chauffage
  - [ ] Ajouter presets hiver avec chauffage actif + tests physiques
- [x] Integrer pompe de piscine :
  - [x] Definir creneaux filtrage / thermoregulation
  - [x] Ajouter contraintes de duree quotidienne minimale + tests
- [ ] Integrer borne VE :
  - [x] Modeliser sessions de charge (arrivee/depart, energie requise)
  - [x] Ajouter strategie pour reserve batterie vs charge VE
  - [x] Couvrir avec tests / presets dedies

## Long terme
- [ ] UI compacte / plus graphique (moins de saisie, plus de visualisation)
  - Graphiques principaux visibles en haut, centrés sur un preset/scénario choisi.
  - Paramètres avancés repliables (curseurs ou panneau latéral) pour affiner sans surcharger la vue principale.
  - Tableaux détaillés en bas ou dans un onglet dédié pour expliquer les courbes.
- [ ] Scénarios multi-jours (analyse hebdo ou mensuelle)
- [ ] KPI confort (fenêtres de température au-dessus du seuil sur la journée)



