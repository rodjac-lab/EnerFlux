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

## Dernières étapes
- PR#1 (core + scénarios stress + KPIs flux + tests divergence) : ✅ mergée après résolution de conflits.
- PR#2 (tarifs €/kWh import/export + KPIs €) : ✅ mergée.
- Export JSON de simulation validé : bilans énergétiques respectés à 1e-12, intégration des prix fonctionnelle.
- Observation : *battery_first* semblait “meilleur” en € car il **ne chauffait pas l’ECS** jusqu’à la consigne → service non rendu.
- Décision : introduire un **contrat de service ECS** (must-hit + pénalités €/K) pour rendre la comparaison juste.

## État des tests CI
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
