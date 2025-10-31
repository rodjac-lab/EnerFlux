# Documentation EnerFlux

**Dernière mise à jour** : 31 octobre 2025 (Réorganisation complète)
**Version** : 3.0

---

## 🎯 Démarrage Rapide

### Vous êtes... → Commencez par...

| Profil | Point d'entrée | Temps lecture |
|--------|----------------|---------------|
| 🆕 **Nouvel utilisateur** | [01-vision/product_vision.md](01-vision/product_vision.md) | 15 min |
| 👤 **Utilisateur Mode Labo** | [02-mode-laboratoire/guide_utilisateur_strategies.md](02-mode-laboratoire/guide_utilisateur_strategies.md) | 20 min |
| 🎯 **Utilisateur Mode Coach** | [03-mode-coach/README.md](03-mode-coach/README.md) | 10 min |
| 👨‍💻 **Développeur** | [04-technique/tech_guidelines.md](04-technique/tech_guidelines.md) | 30 min |
| 🔬 **Chercheur** | [06-recherche/etat_de_lart_optimisation_pv.md](06-recherche/etat_de_lart_optimisation_pv.md) | 45 min |

---

## 📁 Structure de la Documentation

```
Docs/
├── 01-vision/                    Vision produit & roadmap
│   ├── product_vision.md         ⭐ COMMENCEZ ICI
│   ├── domain_glossary.md        Glossaire technique
│   ├── development_plan.md       Roadmap S1-S7
│   ├── status.md                 Historique projet
│   └── todo.md                   Backlog

├── 02-mode-laboratoire/          Mode Laboratoire (stratégies A/B)
│   ├── README.md                 Vue d'ensemble Mode Labo
│   ├── guide_utilisateur_strategies.md   Guide utilisateur ⭐
│   ├── waterfall_allocation.md   Système d'allocation
│   ├── algorithms_playbook.md    Algorithmes 10 stratégies
│   └── refactoring_plan.md       Plan refactoring v2.0

├── 03-mode-coach/                Mode Coach Prédictif (MPC)
│   ├── README.md                 Vue d'ensemble Mode Coach ⭐
│   ├── guide_utilisateur.md      Guide utilisateur (Phase 6 - À créer)
│   ├── vision.md                 Vision produit MPC
│   ├── architecture.md           Architecture technique (1594 lignes)
│   └── implementation/
│       ├── phase1_2_implementation_summary.md
│       ├── phase3_implementation_summary.md
│       ├── phase4_implementation_summary.md
│       ├── phase5_implementation_summary.md
│       └── phase5_ui_design.md

├── 04-technique/                 Guidelines & standards
│   ├── README.md
│   ├── tech_guidelines.md        Conventions code
│   ├── metrics_and_tests.md      Définitions KPIs
│   └── testing_guidelines.md     Standards tests

├── 05-validation/                Validation scientifique
│   ├── README.md
│   ├── scientific_coherence_audit.md
│   ├── validation_e2e_results.md
│   └── CHANGELOG_validation_25oct2025.md   Correction ErP

├── 06-recherche/                 État de l'art & recherche
│   ├── README.md
│   ├── etat_de_lart_optimisation_pv.md
│   ├── recherche_etat_art_web_opensource.md
│   ├── strategy_comparison_reliability.md
│   ├── scientific_paper_benchmark_plan.md
│   └── vision_mode2_optimisation_optimale.md   Mode 2 (futur)

└── archive/                      Anciennes versions
    ├── README_archive.md
    ├── product_vision_v1_pre_refactoring.md
    └── s5_plan.md
```

---

## 🗺️ Parcours de Lecture par Objectif

### 🎯 Objectif 1 : Comprendre EnerFlux

**Temps total** : 45 min

1. [01-vision/product_vision.md](01-vision/product_vision.md) (15 min)
   - Vision v2.0, personas, roadmap
2. [02-mode-laboratoire/README.md](02-mode-laboratoire/README.md) (10 min)
   - Vue d'ensemble Mode Laboratoire
3. [03-mode-coach/README.md](03-mode-coach/README.md) (10 min)
   - Vue d'ensemble Mode Coach
4. [01-vision/domain_glossary.md](01-vision/domain_glossary.md) (10 min)
   - Glossaire si termes inconnus

### 🎮 Objectif 2 : Utiliser le Mode Laboratoire

**Temps total** : 30 min

1. [02-mode-laboratoire/guide_utilisateur_strategies.md](02-mode-laboratoire/guide_utilisateur_strategies.md) (20 min)
   - Arbre de décision, recommandations
2. Tester dans l'UI : [GitHub Pages](https://rodjac-lab.github.io/EnerFlux/) (10 min)
3. Si besoin détails : [02-mode-laboratoire/waterfall_allocation.md](02-mode-laboratoire/waterfall_allocation.md)

### 🎯 Objectif 3 : Utiliser le Mode Coach

**Temps total** : 25 min

1. [03-mode-coach/README.md](03-mode-coach/README.md) (10 min)
2. [03-mode-coach/vision.md](03-mode-coach/vision.md) (15 min)
   - Comprendre MPC et heuristiques
3. Tester dans l'UI : [GitHub Pages](https://rodjac-lab.github.io/EnerFlux/) onglet "Coach"

**Note** : Guide utilisateur détaillé à venir Phase 6

### 👨‍💻 Objectif 4 : Contribuer au Développement

**Temps total** : 1h30

1. [01-vision/product_vision.md](01-vision/product_vision.md) (15 min)
2. [01-vision/development_plan.md](01-vision/development_plan.md) (20 min)
   - Comprendre roadmap S6 Phase 6
3. [04-technique/tech_guidelines.md](04-technique/tech_guidelines.md) (30 min)
   - **Obligatoire** : Conventions code
4. [04-technique/testing_guidelines.md](04-technique/testing_guidelines.md) (15 min)
   - Standards tests
5. Explorer code : `src/core/engine.ts`, `src/core/strategy.ts` (10 min)

### 🔧 Objectif 5 : Créer une Stratégie Custom

**Temps total** : 1h

1. [02-mode-laboratoire/waterfall_allocation.md](02-mode-laboratoire/waterfall_allocation.md) (20 min)
   - Comprendre système allocation
2. [02-mode-laboratoire/algorithms_playbook.md](02-mode-laboratoire/algorithms_playbook.md) (30 min)
   - Voir exemples stratégies existantes
3. Implémenter dans `src/core/strategy.ts` (10 min)
   - Créer fonction `getAllocationOrder()`
4. Tester sur 7 scénarios (voir [04-technique/testing_guidelines.md](04-technique/testing_guidelines.md))

### 🔬 Objectif 6 : Recherche Académique

**Temps total** : 2h

1. [06-recherche/etat_de_lart_optimisation_pv.md](06-recherche/etat_de_lart_optimisation_pv.md) (45 min)
   - État de l'art HEMS académique
2. [06-recherche/recherche_etat_art_web_opensource.md](06-recherche/recherche_etat_art_web_opensource.md) (30 min)
   - Projets open source
3. [03-mode-coach/architecture.md](03-mode-coach/architecture.md) (45 min)
   - Architecture MPC (1594 lignes)
4. [06-recherche/scientific_paper_benchmark_plan.md](06-recherche/scientific_paper_benchmark_plan.md)
   - Protocoles benchmarks

---

## 📖 Index par Document Clé

### ⭐ Documents Essentiels

| Document | Description | Audience |
|----------|-------------|----------|
| [01-vision/product_vision.md](01-vision/product_vision.md) | **Point d'entrée principal** | Tous |
| [02-mode-laboratoire/guide_utilisateur_strategies.md](02-mode-laboratoire/guide_utilisateur_strategies.md) | Guide utilisateur Mode Labo | Utilisateurs |
| [03-mode-coach/README.md](03-mode-coach/README.md) | Guide Mode Coach | Utilisateurs |
| [04-technique/tech_guidelines.md](04-technique/tech_guidelines.md) | Conventions code | Développeurs |

### 📚 Documents de Référence

| Document | Description | Longueur |
|----------|-------------|----------|
| [03-mode-coach/architecture.md](03-mode-coach/architecture.md) | Architecture MPC complète | 1594 lignes |
| [02-mode-laboratoire/waterfall_allocation.md](02-mode-laboratoire/waterfall_allocation.md) | Système allocation | 493 lignes |
| [03-mode-coach/vision.md](03-mode-coach/vision.md) | Vision produit MPC | 616 lignes |
| [02-mode-laboratoire/refactoring_plan.md](02-mode-laboratoire/refactoring_plan.md) | Plan refactoring v2.0 | 570 lignes |

---

## ❓ FAQ Documentation

### Quel document lire en premier ?
→ **[01-vision/product_vision.md](01-vision/product_vision.md)** (15 min)

### Quelle différence entre Mode Labo et Mode Coach ?
→ **Mode Labo** : Compare 10 stratégies réactives (décisions instant présent)
→ **Mode Coach** : Stratégie prédictive (anticipe 24-48h, gains +20-35%)
→ Voir [01-vision/product_vision.md](01-vision/product_vision.md) section "Deux Modes"

### Comment choisir ma stratégie d'autoconsommation ?
→ **[02-mode-laboratoire/guide_utilisateur_strategies.md](02-mode-laboratoire/guide_utilisateur_strategies.md)**
Suivre l'arbre de décision section 2

### Comment fonctionne le Mode Coach Prédictif ?
→ **[03-mode-coach/README.md](03-mode-coach/README.md)** puis **[03-mode-coach/vision.md](03-mode-coach/vision.md)**

### Je veux contribuer, par où commencer ?
1. Lire [01-vision/development_plan.md](01-vision/development_plan.md) section "Current Focus"
2. Consulter [01-vision/todo.md](01-vision/todo.md) pour tâches Phase 6
3. Lire **obligatoirement** [04-technique/tech_guidelines.md](04-technique/tech_guidelines.md)

### Où est la validation scientifique ?
→ **[05-validation/](05-validation/)** dossier complet
Notamment [05-validation/CHANGELOG_validation_25oct2025.md](05-validation/CHANGELOG_validation_25oct2025.md) (correction ErP)

### Les anciens docs sont-ils obsolètes ?
Oui, archivés dans **[archive/](archive/)**
Ne pas utiliser pour contribuer au projet actuel

---

## 🔄 Changelog Documentation

### v3.0 (31 octobre 2025) - Réorganisation complète
- ✅ Création structure dossiers thématiques (01-vision à 06-recherche)
- ✅ Déplacement 29 fichiers markdown
- ✅ Création 6 README.md de section
- ✅ Mise à jour liens internes (en cours)
- ✅ README principal restructuré avec parcours de lecture

### v2.1 (21 octobre 2025)
- Ajout guide utilisateur stratégies
- Mise à jour refactoring Mode Labo

### v2.0 (Octobre 2025)
- Ajout documentation Mode Coach Prédictif (7 docs)
- Refactoring Mode Laboratoire v2.0

---

## 📝 Contribuer à la Documentation

### Ajouter un nouveau document
1. Choisir le bon dossier thématique (`01-vision/` à `06-recherche/`)
2. Utiliser template avec header :
   ```markdown
   # Titre du Document

   **Date de création** : YYYY-MM-DD
   **Dernière mise à jour** : YYYY-MM-DD
   **Auteur** : Nom
   ```
3. Ajouter lien dans le README.md de la section
4. Mettre à jour ce README principal si document majeur

### Mettre à jour un document existant
1. Modifier le document
2. Mettre à jour "Dernière mise à jour"
3. Ajouter entrée changelog si changement majeur

### Archiver un document obsolète
1. Déplacer dans `archive/`
2. Mettre à jour `archive/README_archive.md`
3. Supprimer lien du README de section

---

## 🔗 Liens Utiles

**Démo Live** :
- [GitHub Pages](https://rodjac-lab.github.io/EnerFlux/) - Application complète

**Code Source** :
- [src/core/](../src/core/) - Moteur simulation
- [src/devices/](../src/devices/) - Modèles physiques
- [src/ui/](../src/ui/) - Interface utilisateur

**Tests** :
- [tests/](../tests/) - Suite de tests complète
- CI : GitHub Actions (build + tests automatiques)

**Projet** :
- [GitHub Repository](https://github.com/rodjac-lab/EnerFlux)
- [GitHub Issues](https://github.com/rodjac-lab/EnerFlux/issues)

---

**Auteurs** : Rodolphe + Claude (Anthropic)
**Licence** : Open Source
**Contact** : [GitHub Issues](https://github.com/rodjac-lab/EnerFlux/issues)
