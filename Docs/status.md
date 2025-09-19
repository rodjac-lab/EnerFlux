# EnerFlux — Status (2025-09-19)

## Contexte
Projet React/Vite/TS pour simuler l’autoconsommation PV avec batterie + ECS, comparer stratégies A/B et visualiser les KPIs.

## Fichiers clés
- `README.md` : présentation projet
- `AGENT.md` : consignes pour l’IA contributrice
- `src/` : moteur + UI
- `.github/workflows/ci-tests.yml` : CI (npm install, build, vitest)
- `.github/workflows/deploy.yml` : déploiement GitHub Pages

## Dernières PRs
- **PR#1 (core + scénarios stress)** : ajout presets `Matin froid`, `Batterie vide`, `Seuils` + Δ KPIs + tests divergence
- **CI** : OK côté build, ⚠️ tests en cours de stabilisation
- **PR#2 (tarifs)** : prévue après stabilisation du core

## État des tests
- `ecs_physics.test.ts` : ✅
- `engine_minimal.test.ts` : ❌ bilan ne tient pas compte du ΔSOC batterie
- `strategies_divergence.test.ts` : ✅ divergence ≥ 0.005 sur “Matin froid” & “Batterie vide”

## Prochaines étapes
1. Corriger bilans (inclure ΔSOC)
2. Monitorer scénario “Batterie vide” renforcé
3. Ajuster seuil divergence (actuellement 0.005, affiner si besoin)
4. Vérifier CI verte avant merge PR#1
5. Préparer PR#2 (tarifs €/kWh import/export + KPIs €)
