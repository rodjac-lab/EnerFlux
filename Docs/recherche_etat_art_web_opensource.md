# Recherche État de l'Art : Web et Open Source

**Date** : 20 octobre 2025
**Sources** : Recherche web (articles académiques 2024-2025) + projets open source GitHub

Ce document complète [etat_de_lart_optimisation_pv.md](./etat_de_lart_optimisation_pv.md) avec des données récentes provenant d'Internet et de code open source.

---

## 1. État de l'Art Académique (2024-2025)

### 1.1 Tendances Principales

**Algorithmes dominants** :
- **Deep Learning + Reinforcement Learning** (tendance 2024-2025)
  - CNN + LSTM pour prédiction de charge
  - Double DQN, Dueling DQN, Rainbow, PPO pour optimisation batterie
  - Objectif : minimiser coût électricité + maximiser autoconsommation PV

- **Optimisation multi-objectif**
  - Tri-objective : coût + équilibre pic/vallée + satisfaction utilisateur
  - Utilisation de coefficients de pondération ajustables
  - Permet trade-offs explicites (confort vs économie vs durée de vie)

- **Model Predictive Control (MPC)**
  - Horizon prédictif 24-48h avec météo
  - Linear Programming (LP) pour résolution optimale
  - Recalcul périodique (toutes les heures ou toutes les 6h)

### 1.2 Marché et Adoption

**Chiffres 2024-2025** :
- Marché mondial HEMS : **USD 5.8-6 milliards** (2024)
- Croissance : **CAGR 13-15%** jusqu'en 2034
- Drivers : prix électricité élevés, coupures fréquentes, politiques renouvelables
- Europe : économies potentielles **20-30%** sur facture avec HEMS

**Adoption** :
- Pays à prix élevés (Allemagne, UK) : adoption rapide
- Intégration VE et maisons connectées
- Réduction empreinte carbone : **20-30%** potentiel d'ici 2030

### 1.3 Technologies Émergentes

- **Blockchain** pour échange P2P (peer-to-peer) d'énergie
- **V2G (Vehicle-to-Grid)** : VE comme batterie mobile
- **IA prédictive** : apprentissage des patterns de consommation
- **Intégration cloud** : pilotage distant + données temps réel

---

## 2. Projets Open Source (GitHub)

### 2.1 EMHASS (Energy Management for Home Assistant)

**Lien** : https://github.com/davidusb-geek/emhass
**Popularité** : Projet le plus utilisé pour Home Assistant
**Langage** : Python

**Approche** :
- **Linear Programming (LP)** pour optimisation
- **MPC (Model Predictive Control)** introduit en v0.3.0
- Horizon glissant : optimisation journée complète, recalcul périodique

**Fonctions de coût** :
1. Maximiser profit : revenus vente PV - coût achat réseau
2. Maximiser autoconsommation PV
3. Minimiser coût électricité

**Paramètres MPC** :
- `prediction_horizon` : au moins 5× pas d'optimisation
- `soc_init` : SOC batterie initial pour itération actuelle
- `soc_final` : SOC batterie cible en fin d'itération
- Recalcul : 6h, 12h, 18h (horizon réduit progressivement)

**Priorités d'allocation** :
- ❌ Pas de waterfall fixe documenté
- ✅ Optimisation LP globale : le solver décide automatiquement
- ✅ Contraintes sur SOC, puissances min/max, tarifs

**Enseignement pour EnerFlux** :
> EMHASS ne utilise **pas** de waterfall prédéfini. Le solveur LP trouve la solution optimale en respectant les contraintes. Cela permet d'éviter les biais d'un ordre fixe.

### 2.2 OpenEMS (Open Energy Management System)

**Lien** : https://github.com/OpenEMS/openems
**Type** : Plateforme complète pour applications industrielles/résidentielles
**Langage** : Java

**Architecture** :
- Modèle **IPO (Input-Process-Output)**
  1. **Input** : Collecte données (puissance grid, SOC batterie, etc.)
  2. **Process** : Exécution séquentielle des contrôleurs selon priorité
  3. **Output** : Envoi consignes aux équipements

**Gestion des priorités** :
- **Scheduler** : Exécute les contrôleurs dans un ordre configuré
- ✅ **Priorités configurables** (non fixes dans le code)
- Exécution **séquentielle** (pas parallèle)

**Contrôleurs disponibles** :
- Self-consumption optimization
- Peak shaving
- Balancing
- Load management

**Gestion batterie (ESS Power)** :
- Composant `Ess.Power` dédié
- Système d'équations linéaires pour contraintes
- Gère triphasé + monophasé, actif + réactif
- Optimise distribution si plusieurs ESS

**Enseignement pour EnerFlux** :
> OpenEMS utilise une approche **modulaire** avec priorités configurables. Les contrôleurs s'exécutent séquentiellement (comme un waterfall), mais l'ordre est défini par l'utilisateur, pas codé en dur.

### 2.3 optim-pv-battery (DrivenData Challenge)

**Lien** : https://github.com/alabatie/optim-pv-battery
**Type** : Challenge d'optimisation PV + batterie
**Algorithmes** : DQN (Deep Q-Networks), policy networks

**Objectif** :
- Minimiser coût électricité
- Minimiser demande sur le réseau (peak-shaving)
- Utiliser efficacement surplus PV

**Approche** :
- Reinforcement Learning (apprentissage par renforcement)
- Agent apprend la politique optimale par essais/erreurs
- Pas de waterfall explicite : l'agent décide dynamiquement

**Enseignement pour EnerFlux** :
> Les approches RL modernes n'ont **aucun waterfall**. L'agent apprend à décider action par action (charger batterie vs chauffer ECS vs exporter).

### 2.4 REopt by NREL

**Organisation** : National Renewable Energy Laboratory (USA)
**Type** : Outil web + API + repo GitHub
**Langage** : Python

**Description** :
- Outil professionnel pour dimensionnement batterie/PV
- Optimisation économique + technique
- Utilisé par professionnels du secteur

**Enseignement pour EnerFlux** :
> REopt est la référence académique/industrielle. Validation croisée avec REopt serait un gage de crédibilité scientifique.

---

## 3. Approches d'Allocation du Surplus PV (Synthèse)

### 3.1 Ce que font les projets open source et académiques

| Projet/Approche | Méthode d'allocation | Waterfall fixe ? | Priorités |
|-----------------|----------------------|------------------|-----------|
| **EMHASS** | Linear Programming (LP) | ❌ Non | Solveur LP décide automatiquement selon contraintes + coût |
| **OpenEMS** | Contrôleurs séquentiels | ⚠️ Configurable | Ordre défini par l'utilisateur (scheduler) |
| **optim-pv-battery** | Reinforcement Learning | ❌ Non | Agent apprend dynamiquement |
| **Papers MPC 2024** | Model Predictive Control | ❌ Non | Optimisation horizon glissant |
| **Papers multi-objectif** | Optimisation pondérée | ❌ Non | Coefficients ajustables (coût/confort/durée de vie) |
| **EnerFlux (actuel)** | Heuristiques + waterfall | ✅ **Oui (fixe)** | Baseload → Heating → Pool → EV → ECS → Battery → Grid |

### 3.2 Consensus : Pas de waterfall universel

**Constat** :
- ❌ **Aucun** projet moderne n'utilise de waterfall fixe codé en dur
- ✅ Tous utilisent soit :
  - **Optimisation globale** (LP, MPC) : le solver décide
  - **Priorités configurables** (OpenEMS) : l'utilisateur choisit
  - **Apprentissage** (RL) : l'agent apprend

**Pourquoi pas de waterfall fixe ?**
1. **Contexte variable** : L'ordre optimal dépend de l'heure, tarifs, météo, SOC, température
2. **Trade-offs** : Parfois économie > confort, parfois l'inverse
3. **Adaptabilité** : Un système figé ne peut pas s'adapter aux préférences utilisateur

### 3.3 Approches par type de contrainte

**Charges incompressibles** :
- Baseload (frigo, lumières) → **Toujours prioritaire** (consensus universel)
- Justification : Non pilotable, besoin immédiat

**Confort critique** :
- Chauffage si T < T_min + marge sécurité → **Priorité absolue**
- ECS si deadline proche (< 1-2h) ET T < seuil → **Priorité absolue**
- Justification : Santé, hygiène, sécurité

**Stockage** (batterie vs thermique) :
- ⚠️ **Pas de consensus** dans la littérature !
- Approche 1 : Batterie d'abord (flexibilité maximale)
- Approche 2 : Thermique d'abord (rendement 100%, inertie)
- Approche 3 : Selon contexte (MPC/RL décident dynamiquement)

**Charges différables** :
- Piscine, lave-linge → **Dernière priorité** (consensus)
- Justification : Peuvent attendre heures creuses ou surplus PV

---

## 4. Recommandations pour EnerFlux

### 4.1 Court Terme : Améliorer le Waterfall Actuel

**Option 1 : Waterfall configurable (inspiré OpenEMS)**
```typescript
// Au lieu de l'ordre fixe dans engine.ts,
// permettre à l'utilisateur de configurer l'ordre

interface WaterfallConfig {
  order: ('baseload' | 'heating' | 'pool' | 'ev' | 'ecs' | 'battery')[];
}

// L'utilisateur choisit : ['baseload', 'ecs', 'battery', 'heating', ...]
// Le moteur applique cet ordre
```

**Avantage** :
- Simple à implémenter
- Permet à l'utilisateur de tester différents ordres
- Conserve la simplicité des heuristiques

**Inconvénient** :
- Toujours un ordre fixe (pas adaptatif au contexte)

**Option 2 : Priorités dynamiques (inspiré MPC simplifié)**
```typescript
// Chaque équipement a un score calculé dynamiquement
function calculatePriority(device: Device, context: Context): number {
  if (device.type === 'ecs') {
    const urgency = (targetTemp - currentTemp) / targetTemp;
    const deadline = Math.max(0, 1 - (hourUntilDeadline / 4));
    return urgency * 0.5 + deadline * 0.5;
  }
  // etc. pour chaque type
}

// Puis allocation par score décroissant
const sorted = devices.sort((a, b) =>
  calculatePriority(b, context) - calculatePriority(a, context)
);
```

**Avantage** :
- Adaptatif au contexte (température, heure, SOC)
- Plus proche de l'état de l'art
- Garde l'interprétabilité (pas de boîte noire)

**Inconvénient** :
- Plus complexe à implémenter
- Nécessite tuning des coefficients

### 4.2 Moyen Terme : Ajouter MPC Simple

**Implémenter un solveur LP basique** (inspiré EMHASS) :
```python
# Pseudo-code (inspiration EMHASS)
minimize: sum(grid_import[t] * price_import[t] - grid_export[t] * price_export[t])

subject to:
  # Conservation énergie
  pv[t] + grid_import[t] + battery_discharge[t] =
    baseload[t] + ecs[t] + heating[t] + battery_charge[t] + grid_export[t]

  # Contraintes batterie
  soc[t+1] = soc[t] + battery_charge[t] - battery_discharge[t]
  soc_min <= soc[t] <= soc_max

  # Contraintes ECS
  temp_ecs[t+1] = temp_ecs[t] + heating_from_ecs[t] - losses[t]
  temp_ecs[deadline] >= target_temp
```

**Avantage** :
- Solution **optimale** mathématiquement
- Anticipe les besoins (horizon 24h)
- Validable scientifiquement

**Inconvénient** :
- Nécessite bibliothèque LP (scipy, GLPK)
- Plus lourd computationnellement
- Moins interprétable

### 4.3 Long Terme : Validation Scientifique

**Étapes recommandées** :
1. Benchmark avec **EMHASS** sur mêmes profils PV/conso
2. Comparer résultats avec **REopt (NREL)**
3. Valider sur données réelles (si installation disponible)
4. Publier méthodologie + résultats (paper ou blog technique)

---

## 5. Conclusion : Que Faire pour EnerFlux ?

### 5.1 Constat Principal

Le **waterfall fixe actuel d'EnerFlux est obsolète** par rapport à l'état de l'art 2024-2025.

Tous les projets modernes utilisent :
- Optimisation globale (LP, MPC)
- Priorités configurables
- Apprentissage dynamique

### 5.2 Recommandation Immédiate

**Passer à l'Option 2 : Priorités dynamiques**

Raisons :
1. ✅ Aligné avec état de l'art (score-based allocation)
2. ✅ Garde simplicité + rapidité (pas de solveur LP)
3. ✅ Interprétable (utilisateur comprend pourquoi X avant Y)
4. ✅ Adaptable au contexte (heure, température, SOC)
5. ✅ Conserve l'esprit EnerFlux ("laboratoire de stratégies")

**Ne PAS implémenter** :
- ❌ Waterfall configurable (Option 1) : toujours trop rigide
- ❌ MPC complet : trop complexe pour projet éducatif
- ❌ Reinforcement Learning : boîte noire, pas interprétable

### 5.3 Feuille de Route Suggérée

**Phase 1 : Priorités dynamiques (2-3 semaines)**
```
1. Créer fonction `calculatePriority()` pour chaque type d'équipement
2. Remplacer waterfall fixe par tri dynamique
3. Ajouter tests validant le comportement
4. Documenter les formules de calcul de priorité
```

**Phase 2 : Validation (1-2 semaines)**
```
1. Comparer résultats avec stratégies actuelles
2. Vérifier conservation énergie
3. Tester sur tous les scénarios
4. Ajuster coefficients si nécessaire
```

**Phase 3 : Documentation (1 semaine)**
```
1. Expliquer le changement dans waterfall_allocation.md
2. Créer guide utilisateur : "Comment les priorités sont calculées"
3. Ajouter visualisation dans l'UI (pourquoi cet équipement a été servi)
```

---

## Références

### Articles Académiques (2024-2025)
- **Multi-objective optimization strategy for home energy management system including PV and battery energy storage** (ScienceDirect, 2022-2024)
- **Deep learning based optimal energy management for photovoltaic and battery energy storage integrated home micro-grid system** (Nature Scientific Reports, 2022)
- **Optimization of a photovoltaic-battery system using deep reinforcement learning and load forecasting** (ScienceDirect, 2024)
- **Future of Energy Management Models in Smart Homes: A Systematic Literature Review** (Springer, 2025)

### Projets Open Source
- **EMHASS** : https://github.com/davidusb-geek/emhass (Python, Home Assistant)
- **OpenEMS** : https://github.com/OpenEMS/openems (Java, plateforme industrielle)
- **optim-pv-battery** : https://github.com/alabatie/optim-pv-battery (DQN, challenge)
- **REopt (NREL)** : https://reopt.nrel.gov/ (référence académique)

### Documentation Technique
- **EMHASS Docs** : https://emhass.readthedocs.io/en/latest/lpems.html
- **OpenEMS Docs** : https://openems.github.io/openems.io/
- **IEEE HEMS Papers** : IEEE Transactions on Smart Grid
