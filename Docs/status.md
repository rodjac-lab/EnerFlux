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

## Prochain focus (S5)
- S5.4 — Stratégie multi-appareils & KPI confort :
  - **Semaine 1 : cadrage** — cartographie des demandes des 4 devices, formalisation des règles produit et mise à jour du pseudo-code dans `Docs/s5_plan.md`.
  - **Semaine 2 : implémentation moteur/stratégie** — ajout stratégie `multi_equipment_priority`, adaptation `EnvContext`, jeux de presets stress (hiver + soirée VE) et tests Vitest associés.
  - **Semaine 3 : KPIs & UI** — nouveaux KPIs confort (chauffage, piscine, VE) dans `core/kpis.ts`, affichage UI + tooltips d’aide, documentation README/Help mise à jour.
  - **Semaine 4 : validation & polish** — revues croisée, capture écran UI, documentation scenarios + finalisation backlog.

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


