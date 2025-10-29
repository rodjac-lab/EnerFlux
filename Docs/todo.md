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
- [x] Integrer chauffage electrique modulable :
  - [x] Modeliser un corps de chauffe resistif + inertie thermique logement
  - [x] Ajouter fenetres de confort (temperature cible par plage horaire)
  - [x] Etendre la strategie pour arbitrer ECS vs chauffage (hysteresis + priorites ECS)
  - [x] Ajouter presets hiver avec chauffage actif + tests physiques
- [x] Integrer pompe de piscine :
  - [x] Definir creneaux filtrage / thermoregulation
  - [x] Ajouter contraintes de duree quotidienne minimale + tests
- [x] Integrer borne VE :
  - [x] Modeliser sessions de charge (arrivee/depart, energie requise)
  - [x] Ajouter strategie pour reserve batterie vs charge VE
  - [x] Couvrir avec tests / presets dedies
- [x] S5.4 Strategie multi-equipements + KPI confort :
  - [x] Formaliser les priorites (ECS > chauffage > VE/piscine) + pseudo-code strategie
  - [x] Implementer `multi_equipment_priority` + adaptations `core/engine.ts`
  - [x] Ajouter presets stress (hiver combiné, soiree VE) + tests Vitest
  - [x] Calculer KPIs confort (chauffage, piscine, VE) + affichage UI/help

## Long terme
- [x] UI compacte / plus graphique (moins de saisie, plus de visualisation)
  - Scénario et stratégies alignés sur deux colonnes dans l'onglet « Simulation » pour libérer l'espace des graphiques.
  - Paramètres avancés déplacés dans un second onglet dédié et panneaux condensés pour réduire la saisie.
  - Comparateur A/B et graphiques mis en avant sur toute la largeur, détails repliés.
- [x] Mode Coach Prédictif (Phase 1-5 complétée Janvier 2025)
  - Simulation hebdomadaire avec 4 stratégies MPC
  - Intégration APIs réelles (OpenWeather, PVGIS, RTE Tempo)
  - Narrateur IA avec 6 analyseurs d'insights
  - UI interactive avec graphique comparatif animé Baseline vs MPC
- [ ] Scénarios multi-jours (analyse hebdo ou mensuelle)
- [ ] KPI confort (fenêtres de température au-dessus du seuil sur la journée)

## ⚠️ Limitations connues & points à améliorer

### Chauffage en simulation annuelle
**Problème identifié** (Octobre 2025) :
- **Comportement actuel** : Scénario "Été ensoleillé" a une consigne de chauffage à 24°C
- **Impact** : Si un utilisateur active manuellement le chauffage en été, le système peut chauffer lors de matins frais (18°C ext. → 22°C int. → chauffage déclenché pour atteindre 24°C)
- **Réalité** : En été, on ne chauffe jamais, même par matin frais
- **Solution future pour simulation annuelle** :
  - Option 1 : Désactivation automatique du chauffage entre avril-septembre
  - Option 2 : Mode été/hiver explicite (heating.mode = 'winter' | 'summer' | 'off')
  - Option 3 : Consigne été très basse (15°C) pour éviter déclenchements intempestifs
- **Statut** : Non bloquant actuellement (chauffage désactivé par défaut en été), à corriger pour simulation annuelle complète
- **Référence** : Discussion avec utilisateur 29/10/2025



