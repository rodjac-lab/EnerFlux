# Validation Scientifique — Audits & Tests

**Date** : Octobre 2025

---

## 📖 Contenu

Cette section contient les **audits scientifiques**, **résultats de validation** et **changelogs** des corrections de modèles physiques.

### Documents

- **[scientific_coherence_audit.md](scientific_coherence_audit.md)**
  - Audit cohérence scientifique du simulateur
  - Validation modèles physiques
  - Conservation énergie
  - Références académiques

- **[validation_e2e_results.md](validation_e2e_results.md)**
  - Résultats tests end-to-end
  - Validation scénarios complets
  - Métriques de performance

- **[CHANGELOG_validation_25oct2025.md](CHANGELOG_validation_25oct2025.md)**
  - Correction coefficient thermique ECS (5.0 → 2.0 W/K)
  - Justification ErP classe C
  - Résultats tests avant/après
  - Impact : 6/6 tests passent (vs 2/6 avant)

---

## 🚀 Quick Start

### Je veux vérifier la justesse scientifique
1. Lire **[scientific_coherence_audit.md](scientific_coherence_audit.md)**
2. Voir résultats validation : **[validation_e2e_results.md](validation_e2e_results.md)**

### Je modifie un modèle physique
1. Consulter audit scientifique
2. Justifier changements (références scientifiques)
3. Créer CHANGELOG_*.md si correction majeure
4. Valider avec tests edge cases

### Je veux comprendre la correction ErP
1. Lire **[CHANGELOG_validation_25oct2025.md](CHANGELOG_validation_25oct2025.md)**
2. Voir commit 47ec8dd (25 oct 2025)

---

**Auteurs** : Rodolphe + Claude (Anthropic)
