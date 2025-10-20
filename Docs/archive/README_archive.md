# Archive Documentation — EnerFlux

**Date de création** : 20 octobre 2025

---

## Pourquoi cette Archive ?

Cette archive contient les **versions antérieures** de documents qui ont été **modifiés ou remplacés** lors du refactoring "Mode Laboratoire Pédagogique" d'octobre 2025.

**Ces documents sont conservés pour** :
- 📚 Référence historique
- 🔍 Comprendre les décisions passées
- 📊 Tracer l'évolution du projet

⚠️ **Ces documents ne doivent PAS être utilisés pour développer ou comprendre le projet actuel.**

---

## Documents Archivés

### product_vision_v1_pre_refactoring.md
**Date** : Juillet 2025 (création initiale)
**Archivé** : 20 octobre 2025
**Raison** : Vision v1.0 remplacée par vision v2.0 (Mode Laboratoire + Mode Optimisation)
**Nouveau document** : [../product_vision.md](../product_vision.md)

**Changements principaux v1 → v2** :
- v1 : Stratégies contrôlent seulement le surplus après waterfall fixe
- v2 : Stratégies contrôlent l'ordre complet d'allocation (waterfall configurable)

---

## Documents Actuels (Actifs)

Pour travailler sur EnerFlux, consultez **uniquement** ces documents :

### Vision et Architecture
- **[product_vision.md](../product_vision.md)** : Vision actuelle du projet
- **[refactoring_plan_mode_laboratoire.md](../refactoring_plan_mode_laboratoire.md)** : Plan Mode 1 (Laboratoire)
- **[vision_mode2_optimisation_optimale.md](../vision_mode2_optimisation_optimale.md)** : Vision Mode 2 (Optimisation)

### Technique
- **[waterfall_allocation.md](../waterfall_allocation.md)** : Explication waterfall
- **[etat_de_lart_optimisation_pv.md](../etat_de_lart_optimisation_pv.md)** : État de l'art HEMS
- **[algorithms_playbook.md](../algorithms_playbook.md)** : Algorithmes stratégies
- **[scientific_coherence_audit.md](../scientific_coherence_audit.md)** : Audit scientifique

### Référence
- **[domain_glossary.md](../domain_glossary.md)** : Glossaire technique
- **[metrics_and_tests.md](../metrics_and_tests.md)** : KPIs et tests
- **[status.md](../status.md)** : Statut projet

---

## Historique des Refactorings

### Octobre 2025 : Mode Laboratoire Pédagogique
**Objectif** : Permettre vraie comparaison de stratégies avec ordres d'allocation différents

**Documents archivés** :
- `product_vision.md` → `product_vision_v1_pre_refactoring.md`

**Documents créés** :
- `refactoring_plan_mode_laboratoire.md`
- `vision_mode2_optimisation_optimale.md`
- `waterfall_allocation.md`
- `etat_de_lart_optimisation_pv.md`
- `recherche_etat_art_web_opensource.md`

**Changements code** :
- Refactoring `src/core/engine.ts` : Waterfall dynamique
- Refactoring `src/core/strategy.ts` : Interface `getAllocationOrder()`
- Nouvelles stratégies : `thermal_first`, `comfort_first`, `flexibility_first`

---

## Comment Contribuer

Si vous êtes un **nouveau contributeur** :

1. ❌ **NE PAS** lire les docs dans `archive/`
2. ✅ **Lire d'abord** : [product_vision.md](../product_vision.md)
3. ✅ **Puis** : [refactoring_plan_mode_laboratoire.md](../refactoring_plan_mode_laboratoire.md)
4. ✅ **Comprendre** : [waterfall_allocation.md](../waterfall_allocation.md)

Si vous voulez **comprendre l'historique** :
- Consultez `archive/` pour voir les versions antérieures
- Lisez les changelogs dans les docs actuels

---

**Auteur** : Claude (Anthropic)
**Dernière mise à jour** : 20 octobre 2025
