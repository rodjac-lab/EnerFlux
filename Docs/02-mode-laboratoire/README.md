# Mode Laboratoire — Documentation

**Version** : 2.0 (v2.0 taggué octobre 2025)
**Statut** : ✅ Complet et stable
**Date** : Octobre 2025

---

## 📖 Vue d'Ensemble

Le **Mode Laboratoire** permet de **comparer côte-à-côte** (A/B) l'impact de 10 stratégies d'allocation du surplus PV sur les mêmes scénarios, avec métriques détaillées.

**Objectif** : Comprendre comment différentes **priorités d'allocation** (ECS vs batterie vs chauffage vs VE) influencent :
- 💰 Coûts énergétiques
- 🔋 Taux d'autoconsommation
- 🏠 Confort (ECS, chauffage, VE)

---

## 🎯 Pour Qui ?

### 👤 Utilisateurs Finaux
→ **[guide_utilisateur_strategies.md](guide_utilisateur_strategies.md)**
Guide complet pour choisir et comparer les stratégies

### 👨‍💻 Développeurs
→ **[waterfall_allocation.md](waterfall_allocation.md)**
Comment fonctionne l'allocation en cascade (waterfall)

→ **[algorithms_playbook.md](algorithms_playbook.md)**
Pseudocode et logique détaillée de chaque stratégie

---

## 📚 Documentation par Thème

### Guide Utilisateur
- **[guide_utilisateur_strategies.md](guide_utilisateur_strategies.md)** (493 lignes)
  - Arbre de décision pour choisir sa stratégie
  - Exemples 3 personas (Marc, Sophie, Thomas)
  - Matrice de recommandations
  - Quand utiliser chaque stratégie

### Architecture Allocation
- **[waterfall_allocation.md](waterfall_allocation.md)** (493 lignes)
  - Principe du waterfall (cascade de priorités)
  - 4 ordres d'allocation distincts
  - Exemples concrets avec calculs
  - Différence avec stratégies

### Algorithmes Stratégies
- **[algorithms_playbook.md](algorithms_playbook.md)** (9682 lignes ?)
  - Pseudocode des 10 stratégies
  - Paramètres et seuils
  - Logique de décision détaillée
  - Tests unitaires

### Refactoring Mode 1
- **[refactoring_plan.md](refactoring_plan.md)** (570 lignes)
  - Plan refactoring LOT 1-8
  - Migration vers waterfall configurable
  - Chronologie octobre 2025
  - Décisions architecture

---

## 🎮 10 Stratégies Disponibles

### Baseline (Références)
1. **`no_control_offpeak`** : Heures creuses classique (aucun PV)
2. **`no_control_hysteresis`** : Thermostat simple sans PV

### Stratégies Simple Priorité
3. **`ecs_first`** : Priorité ECS, puis batterie
4. **`battery_first`** : Priorité batterie, puis ECS

### Stratégies Conditionnelles
5. **`mix_soc_threshold`** : Switch priorité à SOC 50%
6. **`reserve_evening`** : Réserve batterie avant 18h
7. **`ev_departure_guard`** : Sécurise charge VE avant départ

### Stratégies Avancées
8. **`multi_equipment_priority`** : Gestion 5 équipements (ECS/chauffage/VE/piscine/batterie)
9. **`ecs_hysteresis`** : ECS avec hystérésis (confort)
10. **`deadline_helper`** : Garantie deadline ECS 21h

---

## 🚀 Quick Start

### Je veux comparer deux stratégies
1. Ouvrir [GitHub Pages](https://rodjac-lab.github.io/EnerFlux/)
2. Onglet **"Simulation"**
3. Sélectionner scénario (ex: "Hiver rigoureux")
4. Choisir **Stratégie A** et **Stratégie B**
5. Observer graphiques + KPIs comparatifs

### Je veux choisir MA stratégie
1. Lire **[guide_utilisateur_strategies.md](guide_utilisateur_strategies.md)**
2. Suivre l'arbre de décision (section 2)
3. Tester la stratégie recommandée dans l'UI

### Je veux comprendre l'algorithme d'une stratégie
1. Lire **[algorithms_playbook.md](algorithms_playbook.md)**
2. Chercher la stratégie (ex: `multi_equipment_priority`)
3. Voir pseudocode + paramètres

### Je veux créer une nouvelle stratégie
1. Lire **[waterfall_allocation.md](waterfall_allocation.md)** (comprendre le système)
2. Définir ordre d'allocation dans `src/core/strategy.ts`
3. Implémenter `getAllocationOrder()`
4. Ajouter tests unitaires
5. Tester sur 7 scénarios

---

## 📊 4 Ordres d'Allocation

| Ordre | Priorités | Stratégies utilisant cet ordre |
|-------|-----------|--------------------------------|
| **ECS_BATTERY** | ECS → Batterie | `ecs_first`, `ecs_hysteresis`, `deadline_helper` |
| **BATTERY_ECS** | Batterie → ECS | `battery_first` |
| **DYNAMIC_SOC** | Conditionnel (SOC) | `mix_soc_threshold` |
| **MULTI_EQUIP** | ECS → Chauffage → VE → Piscine → Batterie | `multi_equipment_priority` |

**Note** : `reserve_evening` et `ev_departure_guard` modifient dynamiquement les priorités selon contexte temporel.

---

## 📈 7 Scénarios de Test

1. **Été ensoleillé** : Surplus PV important, pas de chauffage
2. **Hiver rigoureux** : Production faible, chauffage actif
3. **Matin froid** : Pic ECS matinal, deadline critique
4. **Soirée VE** : Session charge VE 19h-23h
5. **Journée douce** : Conditions moyennes
6. **Nuit piscine** : Filtration nocturne en HC
7. **Semaine complète** : 7 jours complets (test long)

---

## 🔗 Liens Utiles

**Code source** :
- [src/core/strategy.ts](../../src/core/strategy.ts) - Définitions stratégies
- [src/core/allocation.ts](../../src/core/allocation.ts) - Moteur waterfall
- [src/core/engine.ts](../../src/core/engine.ts) - Boucle simulation
- [src/data/scenarios.ts](../../src/data/scenarios.ts) - 7 scénarios

**Documentation connexe** :
- [01-vision/](../01-vision/) - Vision produit v2.0
- [03-mode-coach/](../03-mode-coach/) - Mode Coach Prédictif (MPC)
- [04-technique/](../04-technique/) - Guidelines techniques

**Tests** :
- [tests/strategy_allocation_order.test.ts](../../tests/strategy_allocation_order.test.ts)
- [tests/edge_cases_validation.test.ts](../../tests/edge_cases_validation.test.ts)

---

## 💡 Concepts Clés

### Waterfall (Cascade de Priorités)
Système d'allocation où le surplus PV est distribué **séquentiellement** selon une liste de priorités ordonnée, jusqu'à épuisement du surplus.

**Exemple** :
```
Surplus : 3 kW
Ordre : ECS → Batterie
1. ECS demande 2 kW → alloué 2 kW (reste 1 kW)
2. Batterie demande 4 kW → alloué 1 kW (épuisé)
```

### Stratégie vs Ordre
- **Ordre d'allocation** : Liste de priorités (ex: ECS → Batterie)
- **Stratégie** : Logique qui **choisit** l'ordre selon le contexte (heure, SOC, deadline, etc.)

### Allocation Request
Chaque device émet un `request` à chaque pas de temps :
- `maxAccept_kW` : Puissance max acceptable
- `need` : Type de besoin (`toHeat`, `toStore`, `toCharge`)
- `priorityHint` : Indice d'urgence (optionnel)

---

## ❓ FAQ

### Quelle stratégie choisir pour mon installation ?
→ Lire **[guide_utilisateur_strategies.md](guide_utilisateur_strategies.md)** section 2 "Arbre de décision"

### Puis-je créer ma propre stratégie ?
Oui ! Ajouter une fonction `getAllocationOrder()` dans `src/core/strategy.ts`

### Pourquoi 10 stratégies et pas une seule optimale ?
Le Mode Laboratoire est **pédagogique** : il montre l'impact de chaque choix.
Pour l'optimisation automatique → voir **Mode Coach Prédictif**

### Comment sont calculés les KPIs ?
→ Voir [04-technique/metrics_and_tests.md](../04-technique/metrics_and_tests.md)

### Les stratégies sont-elles déterministes ?
Oui ! Même scénario + même stratégie = mêmes résultats (tests golden)

---

## 🎯 Prochaines Évolutions

Le Mode Laboratoire v2.0 est **stable et complet**. Les évolutions futures se concentrent sur :
- **Mode Coach Prédictif** (S6 Phase 6 en cours) : Stratégies anticipatives
- **Mode 2 Optimisation** (futur S7+) : Optimisation multi-objectifs avec scores pondérés

---

**Auteurs** : Rodolphe + Claude (Anthropic)
**Licence** : Open Source
**Contact** : [GitHub Issues](https://github.com/rodjac-lab/EnerFlux/issues)
