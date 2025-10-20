# Documentation EnerFlux

**Dernière mise à jour** : 20 octobre 2025

---

## 📖 Pour Commencer (Nouveaux Contributeurs)

Si vous découvrez EnerFlux, lisez **dans cet ordre** :

1. **[product_vision.md](./product_vision.md)** ⭐ **COMMENCEZ ICI**
   - Vision globale du projet
   - Mode 1 (Laboratoire) et Mode 2 (Optimisation)
   - Roadmap

2. **[waterfall_allocation.md](./waterfall_allocation.md)**
   - Comment le surplus PV est alloué
   - Différence waterfall vs stratégies
   - Exemples concrets

3. **[refactoring_plan_mode_laboratoire.md](./refactoring_plan_mode_laboratoire.md)**
   - Plan détaillé du refactoring en cours
   - 8 lots de travail
   - Timeline et estimations

---

## 📚 Documentation par Catégorie

### Vision et Planification
- **[product_vision.md](./product_vision.md)** : Vision v2.0 (Mode Laboratoire + Mode Optimisation)
- **[refactoring_plan_mode_laboratoire.md](./refactoring_plan_mode_laboratoire.md)** : Plan Mode 1 (Laboratoire)
- **[vision_mode2_optimisation_optimale.md](./vision_mode2_optimisation_optimale.md)** : Vision Mode 2 (futur)
- **[status.md](./status.md)** : Historique du projet

### Architecture et Technique
- **[waterfall_allocation.md](./waterfall_allocation.md)** : Allocation surplus PV (waterfall)
- **[algorithms_playbook.md](./algorithms_playbook.md)** : Algorithmes des stratégies
- **[scientific_coherence_audit.md](./scientific_coherence_audit.md)** : Audit scientifique
- **[tech_guidelines.md](./tech_guidelines.md)** : Guidelines techniques

### État de l'Art et Recherche
- **[etat_de_lart_optimisation_pv.md](./etat_de_lart_optimisation_pv.md)** : Bonnes pratiques HEMS
- **[recherche_etat_art_web_opensource.md](./recherche_etat_art_web_opensource.md)** : Projets open source
- **[strategy_comparison_reliability.md](./strategy_comparison_reliability.md)** : Fiabilité comparaisons

### Référence
- **[domain_glossary.md](./domain_glossary.md)** : Glossaire technique
- **[metrics_and_tests.md](./metrics_and_tests.md)** : KPIs et tests
- **[development_plan.md](./development_plan.md)** : Plan de développement
- **[s5_plan.md](./s5_plan.md)** : Sprint 5

---

## 🗂️ Archive

Les **anciennes versions** des documents (pré-refactoring) sont dans :
- **[archive/README_archive.md](./archive/README_archive.md)** : Explication de l'archive

⚠️ **NE PAS utiliser les docs archivés pour contribuer au projet actuel**

---

## 🚀 Quick Start Développeur

### Je veux comprendre le projet
1. Lire [product_vision.md](./product_vision.md)
2. Lire [waterfall_allocation.md](./waterfall_allocation.md)
3. Explorer le code : `src/core/engine.ts` et `src/core/strategy.ts`

### Je veux contribuer au refactoring Mode 1
1. Lire [refactoring_plan_mode_laboratoire.md](./refactoring_plan_mode_laboratoire.md)
2. Choisir un LOT disponible
3. Suivre les tâches du LOT
4. Tester et commiter

### Je veux comprendre l'état de l'art HEMS
1. Lire [etat_de_lart_optimisation_pv.md](./etat_de_lart_optimisation_pv.md)
2. Lire [recherche_etat_art_web_opensource.md](./recherche_etat_art_web_opensource.md)
3. Comparer avec EnerFlux actuel

### Je veux créer une nouvelle stratégie
1. Lire [algorithms_playbook.md](./algorithms_playbook.md)
2. Voir exemples dans `src/core/strategy.ts`
3. Implémenter `getAllocationOrder()`
4. Tester sur scénarios

---

## 📊 Schéma de Documentation

```
Documentation EnerFlux
│
├── 📘 VISION
│   ├── product_vision.md (v2.0) ⭐ START HERE
│   ├── refactoring_plan_mode_laboratoire.md (Mode 1)
│   └── vision_mode2_optimisation_optimale.md (Mode 2 - futur)
│
├── 🔧 TECHNIQUE
│   ├── waterfall_allocation.md (allocation PV)
│   ├── algorithms_playbook.md (stratégies)
│   ├── scientific_coherence_audit.md (validation)
│   └── tech_guidelines.md (guidelines)
│
├── 🔬 RECHERCHE
│   ├── etat_de_lart_optimisation_pv.md (bonnes pratiques)
│   ├── recherche_etat_art_web_opensource.md (projets open source)
│   └── strategy_comparison_reliability.md (fiabilité)
│
├── 📖 RÉFÉRENCE
│   ├── domain_glossary.md (glossaire)
│   ├── metrics_and_tests.md (KPIs)
│   ├── status.md (historique)
│   └── development_plan.md (roadmap)
│
└── 🗄️ ARCHIVE
    ├── README_archive.md
    └── product_vision_v1_pre_refactoring.md
```

---

## ❓ FAQ Documentation

### Quel document lire en premier ?
→ **[product_vision.md](./product_vision.md)**

### Où est expliqué le waterfall ?
→ **[waterfall_allocation.md](./waterfall_allocation.md)**

### Comment contribuer au refactoring ?
→ **[refactoring_plan_mode_laboratoire.md](./refactoring_plan_mode_laboratoire.md)**

### Quelle est la différence entre Mode 1 et Mode 2 ?
→ **[product_vision.md](./product_vision.md)** section "Deux Modes Complémentaires"

### Les anciens docs sont-ils obsolètes ?
→ Oui, voir **[archive/README_archive.md](./archive/README_archive.md)**

### Comment créer une stratégie ?
→ **[algorithms_playbook.md](./algorithms_playbook.md)** + exemples dans `src/core/strategy.ts`

### Quel est l'état de l'art HEMS ?
→ **[etat_de_lart_optimisation_pv.md](./etat_de_lart_optimisation_pv.md)**

---

## 📝 Contribuer à la Documentation

### Créer un nouveau document
1. Utiliser template avec header :
   ```markdown
   # Titre du Document

   **Date de création** : YYYY-MM-DD
   **Dernière mise à jour** : YYYY-MM-DD
   **Auteur** : Nom
   ```

2. Ajouter lien dans ce README.md

### Mettre à jour un document existant
1. Modifier le document
2. Mettre à jour "Dernière mise à jour"
3. Ajouter changelog si changement majeur

### Archiver un document
1. Copier dans `archive/`
2. Renommer avec suffixe `_v1_pre_XXX.md`
3. Mettre à jour `archive/README_archive.md`
4. Créer nouvelle version ou supprimer

---

**Auteur** : Rodolphe + Claude (Anthropic)
**Version** : 2.0
**Date** : 20 octobre 2025
