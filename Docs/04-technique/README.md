# Documentation Technique — Guidelines & Standards

**Date** : Octobre 2025

---

## 📖 Contenu

Cette section contient les **guidelines techniques**, **conventions de code** et **standards de testing** du projet EnerFlux.

### Documents

- **[tech_guidelines.md](tech_guidelines.md)**
  - Conventions TypeScript
  - Architecture core/ pure-functional
  - Règles immutabilité
  - Type-safe units (kW, kWh, °C)
  - Standards PR et commits

- **[metrics_and_tests.md](metrics_and_tests.md)**
  - Définitions KPIs
  - Scénarios de test
  - Critères de validation
  - Formules calcul

- **[testing_guidelines.md](testing_guidelines.md)**
  - Organisation tests
  - Tests unitaires / intégration / golden
  - Coverage cible (≥85%)
  - Protocole golden tests
  - Exigences déterminisme

---

## 🚀 Quick Start

### Je vais contribuer du code
1. Lire **[tech_guidelines.md](tech_guidelines.md)** (obligatoire)
2. Respecter conventions TypeScript
3. Écrire tests (voir **[testing_guidelines.md](testing_guidelines.md)**)

### Je vais ajouter un KPI
1. Lire **[metrics_and_tests.md](metrics_and_tests.md)**
2. Définir formule + unités
3. Ajouter tests de validation
4. Documenter dans metrics_and_tests.md

### Je vais modifier le moteur de simulation
1. Lire **[tech_guidelines.md](tech_guidelines.md)** section "Core Simulation Engine"
2. Respecter règles pure-functional
3. Ajouter tests edge cases
4. Valider conservation énergie

---

**Auteurs** : Rodolphe + Claude (Anthropic)
