# EnerFlux — Status (2025-09-20)

## Contexte
Projet React/Vite/TS pour simuler l’autoconsommation PV avec batterie + ECS, comparer stratégies A/B et visualiser les KPIs, avec extension vers tarifs et contrats de service.

## Fichiers clés
- `README.md` : présentation projet
- `AGENT.md` : consignes pour l’IA contributrice
- `src/` : moteur (`engine.ts`), appareils (`Battery`, `DHWTank`), scénarios, stratégies, UI
- `.github/workflows/ci-tests.yml` : CI (npm install, build, vitest)
- `.github/workflows/deploy.yml` : déploiement GitHub Pages
- `docs/status.md`, `docs/todo.md` : suivi projet

## Dernieres etapes
- PR#1 (core + scenarios stress + KPIs flux + tests divergence) : ok.
- PR#2 (tarifs €/kWh import/export + KPIs €) : ok.
- Export JSON de simulation valide : bilans energetiques respectes a 1e-12, integration des prix fonctionnelle.
- Observation : *battery_first* semblait "meilleur" en € car il ne chauffait pas l'ECS jusqu'a la consigne -> mise en place du contrat de service ECS.
- Strategie `reserve_evening` : reserve batterie avant pointe et priorisation ECS ensuite.
- Strategie `ev_departure_guard` : preserve la batterie avant une session VE puis priorise la charge a l'approche du depart.
- Vue KPI condensee et comparaison multi-metrques : lecture synthétique A/B disponible.
- Modele de chauffage modulable (S5.1) livre : moteur, flux kWh, panneau UI et tests physiques.
- Modele de pompe de piscine (S5.2) livre : planification creneaux + rattrapage, panneau UI et tests de physique.
- Modele de borne VE (S5.3) livre : fenetre arrivee/depart, rattrapage, panneau UI, preset « Soirée VE » et strategie `ev_departure_guard`.
- Strategie `multi_equipment_priority` (S5.4) livree : priorisation ECS/chauffage/VE/piscine, KPIs confort chauffage/piscine/VE et preset "Stress multi-équipements".
- UI Simulation/Paramètres avancés remise à plat : panneau Scénario compact aligné avec Stratégies et comparateur A/B pleine largeur.
- **Refonte graphiques comparateur A/B (oct. 2025)** : simplification visuelle pour améliorer lisibilité (EnergyFlowsChart 4 lignes au lieu de 7, tooltips compacts décalés, BatterySocChart auto-domaine, DecisionsTimeline déclutterée, DhwPanel mono-axe). -272 lignes, tests verts, gestion robuste cas limites.
- **EnergyFlowDiagram** (nouveau composant, oct. 2025) : Diagramme SVG animé des flux énergétiques avec navigation temporelle, intégré au comparateur A/B pour visualisation interactive des flux PV/batterie/réseau heure par heure.
- **Modèle ECS réaliste + stratégies no-control (oct. 2025)** :
  - Ajout puisage eau chaude (`WaterDrawEvent`) avec 3 profils types (light/medium/heavy, 120-220 L/jour)
  - Correction modèle physique : refroidissement par tirage d'eau + déperditions thermiques
  - Nouvelles stratégies baseline : `no_control_offpeak` (heures creuses classique) et `no_control_hysteresis` (thermostat simple)
  - Application des profils de puisage aux 7 scénarios existants
  - Documentation enrichie (domain_glossary.md, README.md)

## Prochain focus (S5)
- S5.4 — Validation & polish :
  - Capture d’écran comparateur avec la stratégie multi-équipements.
  - Tests de non-régression et retours produit sur les nouveaux KPIs de confort.
  - Mise à jour finale du backlog/Docs (tick backlog S5.4, vérifier UX tooltips).

##  État des tests CI
- `ecs_physics.test.ts` : ✅
- `engine_minimal.test.ts` : corrigé (ΔSOC inclus) ✅
- `strategies_divergence.test.ts` : corrigé (seuils adaptés, presets renforcés) ✅
- CI globale sur `main` : ✅ verte

## État déploiement
- GitHub Pages actif (interface publiée), tests A/B visibles.
- Export JSON disponible pour analyse hors UI.

## Décision produit (sept. 2025)
- Étendre le simulateur avec un **contrat de service ECS** :
  - Must-hit soir (21h, 55 °C, pénalité €/K si non atteint)
  - Option matin (6h30, 50 °C) — off par défaut
  - KPI anti-légionelles (60 °C/7j) sans pénalité €
- Ajouter aides stratégiques optionnelles : *ecs hysteresis* et *deadline helper*.


