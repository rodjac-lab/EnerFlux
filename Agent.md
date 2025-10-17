# EnerFlux — Agent Guide (Doc-First)

## Pourquoi
Chaque changement de code doit laisser une trace lisible : *quoi, pourquoi, comment tester*.  
Doc à jour = vitesse, confiance, onboarding.

## Directive Doc-First (toute PR)
1. Si tu ajoutes/modifies une fonctionnalité, **mets à jour la doc** dans `Docs/` et, si visible utilisateur, le `README.md`.
2. Si tu touches au **moteur/stratégies/KPIs**, mets à jour :
   - `Docs/algorithms_playbook.md` (logique, paramètres, pseudo-code)
   - `Docs/metrics_and_tests.md` (défs, golden tests s’il y a impact)
3. Si tu ajoutes une **convention/dépendance** ou modifies l’archi :
   - `Docs/tech_guidelines.md`
   - `Docs/development_plan.md` et `Docs/status.md` (avancement du lot)
4. Si tu changes l’**UI/les graphes**, ajoute/actualise captures & notes dans `README.md` (ou page Docs dédiée).

## Matrice d’impact (Code → Docs à MAJ)
| Zone de code | Docs minimales à mettre à jour |
|---|---|
| `src/engine`, `src/core`, stratégies | `algorithms_playbook.md`, `metrics_and_tests.md` (+ tests) |
| `src/ui/charts` (graphiques/UX) | `README.md` (captures/notes), `development_plan.md` si lot |
| `src/devices` (ECS, VE, PAC, piscine) | `algorithms_playbook.md` (inputs/params), `metrics_and_tests.md` (KPIs) |
| Conventions, deps, layout | `tech_guidelines.md` |
| Roadmap/état d’avancement | `development_plan.md`, `status.md` |

## Acceptation (par PR)
- [ ] Code + tests (unit/golden si impact KPI)
- [ ] **Docs MAJ** (fichiers/sections listés dans la PR)
- [ ] Lien vers scénarios/metrics concernés
- [ ] PR petite & ciblée

## “N/A” acceptable ?
Oui, si **justifié** dans la PR :  
> *Docs N/A car refactor interne sans changement de comportement (tests verts, pas d’impact KPI/UX).*

## Exemple
Feature: stratégie `reserve_evening`.  
À faire : ajouter la stratégie + pseudo-code dans `algorithms_playbook.md`, préciser KPIs dans `metrics_and_tests.md`, cocher l’étape du lot dans `development_plan.md`.
