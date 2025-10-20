# Product Vision — EnerFlux

**Version** : 2.0 (Mode Laboratoire Pédagogique)
**Dernière mise à jour** : 20 octobre 2025
**Version précédente** : v1.0 (Juillet 2025) → Archivée dans [archive/product_vision_v1_pre_refactoring.md](./archive/product_vision_v1_pre_refactoring.md)

---

## 📝 Changelog v2.0 (Octobre 2025)

### Changements majeurs

**✅ Vision réalisée** : EnerFlux est maintenant un vrai "laboratoire de stratégies"
- Les stratégies contrôlent **l'ordre complet** d'allocation du surplus PV (plus seulement le surplus restant)
- Comparaison A vs B montre vraiment l'impact de mettre ECS avant batterie (ou vice-versa)
- Noms cohérents : `ecs_first` met **vraiment** l'ECS en premier

**🔄 Refactoring technique** :
- Waterfall fixe → Waterfall configurable par stratégie
- Nouvelle interface `Strategy.getAllocationOrder()`
- 6 stratégies pré-paramétrées avec ordres différents

**➕ Nouveaux modes** :
- **Mode 1 - Laboratoire Pédagogique** : Stratégies avec ordre fixe (en cours)
- **Mode 2 - Optimisation Optimale** : Stratégies dynamiques (vision future)

**📖 Détails** :
- Plan complet : [refactoring_plan_mode_laboratoire.md](./refactoring_plan_mode_laboratoire.md)
- Mode 2 : [vision_mode2_optimisation_optimale.md](./vision_mode2_optimisation_optimale.md)
- Waterfall expliqué : [waterfall_allocation.md](./waterfall_allocation.md)

---

## Vision

Construire un **laboratoire de stratégies** pour maximiser l'autoconsommation, en comparant différentes politiques d'allocation du surplus PV entre équipements pilotables : Batterie, Ballon ECS (Eau Chaude Sanitaire), Chauffage, Piscine, VE.

### Deux Modes Complémentaires

#### **Mode 1 : Laboratoire Pédagogique** 🎓 (Actuel)
- **Objectif** : Comprendre et visualiser l'impact de différents ordres d'allocation
- **Approche** : Stratégies avec waterfall **configurable** (ordre fixe par stratégie)
- **Public** : Débutant, curieux, décideur
- **Question** : "Vaut-il mieux charger l'ECS avant la batterie ?"
- **Exemple** :
  - Stratégie A : `ECS Prioritaire` → Ordre : Baseload → **ECS** → Battery → Heating
  - Stratégie B : `Batterie Prioritaire` → Ordre : Baseload → **Battery** → ECS → Heating
  - Comparaison : Voir impact sur coût, confort, cycles batterie

#### **Mode 2 : Optimisation Optimale** 🤖 (Vision future)
- **Objectif** : Trouver la **meilleure** allocation possible à chaque instant
- **Approche** : Waterfall **dynamique** (priorités recalculées selon contexte)
- **Public** : Expert, chercheur, installation réelle
- **Question** : "Quelle est la meilleure décision maintenant ?"
- **Exemple** : À 10h ballon chaud → priorité batterie / À 20h ballon froid + deadline → priorité ECS

---

## Objectifs

### Mode 1 (Laboratoire Pédagogique)
- ✅ Explorer et comparer des **stratégies avec ordres différents**
- ✅ Décider de règles robustes : "ECS d'abord si…", "Batterie d'abord si…"
- ✅ Mesurer les impacts réels de changer l'ordre d'allocation
- ✅ Comprendre les trade-offs : confort vs économie vs durabilité

### Mode 2 (Optimisation Optimale - Futur)
- 🔮 Optimiser dynamiquement selon contexte (température, SOC, heure, tarifs)
- 🔮 Anticiper besoins (deadline ECS, pointe soirée, météo)
- 🔮 S'approcher de l'optimum théorique (approche HEMS état de l'art)
- 🔮 Expliquer chaque décision (interprétabilité)

---

## KPIs Principaux

### Énergétiques
- **Taux d'autoconsommation**
  $$AC = \frac{E_{pv\_used}}{E_{conso}}$$

- **Taux d'autoproduction**
  $$AP = \frac{E_{pv\_used}}{E_{pv\_total}}$$

### Économiques
- **Coût net**
  $$Coût = E_{import} \cdot p_{import} - E_{export} \cdot p_{export}$$
  - Positif = dépense
  - Négatif = gain

### Confort
- **Uptime ECS ≥ T cible (%)**
  - Pourcentage de temps où ballon est à température consigne

- **Confort chauffage**
  - Pourcentage de temps dans plage de consigne

### Durabilité
- **Cycles batterie (proxy)**
  $$cycles \approx \frac{1}{2 E_{cap}} \sum_{t=1}^{N} |\Delta E_t|$$
  - Indicateur de vieillissement batterie

---

## Stratégies Disponibles (Mode 1)

### 1. ECS Prioritaire
- **Ordre** : Baseload → **ECS** → Battery → Heating → Pool → EV
- **Description** : Garantit confort eau chaude en priorité
- **Cas d'usage** : Famille nombreuse, hiver, deadline stricte

### 2. Batterie Prioritaire
- **Ordre** : Baseload → **Battery** → ECS → Heating → Pool → EV
- **Description** : Maximise réserve pour soirée
- **Cas d'usage** : Tarif HP/HC élevé, pointe soirée

### 3. Thermique Prioritaire
- **Ordre** : Baseload → **ECS** → **Heating** → Battery → Pool → EV
- **Description** : Stockage thermique avant électrique (rendement 100%)
- **Cas d'usage** : Hiver froid, inertie thermique

### 4. Confort Prioritaire
- **Ordre** : Baseload → **Heating** → **ECS** → **EV** → Battery → Pool
- **Description** : Confort avant économie
- **Cas d'usage** : Personnes âgées, télétravail

### 5. Flexibilité Maximale
- **Ordre** : Baseload → **Battery** → **EV** → ECS → Heating → Pool
- **Description** : Flexibilité horaire maximale
- **Cas d'usage** : Tarifs variables, export bien rémunéré

### 6. Sans Pilotage (Baseline)
- **Ordre** : Baseload → Heating → Pool → EV → ECS → Battery (tout exporté)
- **Description** : Référence pour mesurer gains du pilotage
- **Cas d'usage** : Installation classique, mesure ROI

---

## Portée

### MVP Mode 1 (Octobre 2025)
- ✅ 6 stratégies pré-paramétrées avec ordres différents
- ✅ Comparaison A vs B avec ordres visibles
- ✅ KPIs : coût, autoconsommation, confort, cycles batterie
- ✅ Équipements : Baseload, ECS, Battery, Heating, Pool, EV
- ✅ 7 scénarios types (été, hiver, matin froid, etc.)

### Extensions futures
- 🔲 Mode Avancé : Création stratégies perso (drag & drop)
- 🔮 Mode 2 : Optimisation dynamique (scores contextuels)
- 🔮 Prédictions météo / tarifs dynamiques
- 🔮 API connexion installations réelles (Home Assistant, Victron)

---

## Public

### Mode 1
- Toi (PO) et toute personne voulant comprendre les stratégies d'autoconsommation
- Particuliers envisageant installation PV + batterie
- Installateurs conseillant leurs clients
- Étudiants / enseignants (cas pédagogique)

### Mode 2 (futur)
- Experts en énergie
- Chercheurs HEMS
- Gestionnaires d'installations réelles
- Optimisation temps réel

---

## Roadmap

### ✅ Complété
- S1-S4 : Physique devices (Battery, ECS, Heating, Pool, EV)
- S1-S4 : Stratégies de base (ecs_first, battery_first, etc.)
- S1-S4 : UI comparateur A/B
- S4 : EnergyFlowDiagram animé
- S4 : Modèle ECS réaliste (puisage, ON/OFF)
- S4 : Stratégies no-control (baseline)

### 🚧 En cours (S5)
- **LOT 1-8 : Refactoring Mode Laboratoire**
  - Waterfall configurable par stratégie
  - 6 stratégies pré-paramétrées
  - UI avec ordres visibles
  - Documentation complète
  - Validation E2E

### 🔮 Futur
- **LOT 9 : Mode Avancé** (optionnel)
  - Création stratégies custom
  - Sauvegarde stratégies perso
- **Mode 2 : Optimisation Optimale**
  - Priorités dynamiques
  - Interface Autopilot
  - Explications décisions
- **Validation scientifique**
  - Benchmark vs PVSyst / EMHASS
  - Validation terrain
  - Publication méthodologie

---

## Références

### Documentation Projet
- [refactoring_plan_mode_laboratoire.md](./refactoring_plan_mode_laboratoire.md) : Plan détaillé Mode 1
- [vision_mode2_optimisation_optimale.md](./vision_mode2_optimisation_optimale.md) : Vision Mode 2
- [waterfall_allocation.md](./waterfall_allocation.md) : Explication allocation PV
- [etat_de_lart_optimisation_pv.md](./etat_de_lart_optimisation_pv.md) : Bonnes pratiques HEMS
- [status.md](./status.md) : Historique projet

### État de l'Art
- EMHASS : https://github.com/davidusb-geek/emhass
- OpenEMS : https://github.com/OpenEMS/openems
- Papers IEEE HEMS : Optimisation multi-objectif

---

**Auteur** : Rodolphe + Claude (Anthropic)
**Version** : 2.0
**Date** : 20 octobre 2025
