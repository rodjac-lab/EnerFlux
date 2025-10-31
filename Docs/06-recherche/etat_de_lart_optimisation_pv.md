# État de l'art : Optimisation de l'autoconsommation PV

**Date de création** : 20 octobre 2025
**Dernière mise à jour** : 20 octobre 2025
**Sources** : Documentation EnerFlux + connaissances générales sur HEMS

Ce document synthétise les **bonnes pratiques** et les **approches académiques/industrielles** pour optimiser l'utilisation de l'électricité photovoltaïque dans un contexte résidentiel.

## 1. Approches d'optimisation dans la littérature

### 1.1 Home Energy Management Systems (HEMS)

**Définition** : Systèmes intelligents de gestion énergétique résidentielle qui optimisent la consommation en fonction de la production PV, des tarifs, et du confort.

**Références académiques** :
- IEEE papers sur "Home Energy Management Systems" (HEMS)
- IEC 61968 : Standards Smart Grid et demand-response

### 1.2 Typologie des approches

| Approche | Description | Avantages | Inconvénients | Maturité |
|----------|-------------|-----------|---------------|----------|
| **Règles heuristiques** | Logique si-alors simple ("Si SOC < 50% → charger batterie") | Rapide, interprétable, pas de prédiction nécessaire | Sous-optimal, ne prévoit pas | ✅ Production |
| **Optimisation à seuils** | Décisions basées sur franchissement de seuils (SOC, température, heure) | Simple, robuste, peu de paramètres | Tuning manuel, pas adaptatif | ✅ Production |
| **Programmation dynamique** | Algorithme de Bellman pour minimiser coût sur horizon glissant | Optimum mathématique garanti (si modèle parfait) | Complexité computationnelle, modèle requis | 🟡 Recherche |
| **MPC (Model Predictive Control)** | Contrôle prédictif avec horizon 24-48h, recalculé périodiquement | Anticipe météo/tarifs, optimise globalement | Prédictions météo requises, calcul intensif | 🟡 Pilotes industriels |
| **Apprentissage par renforcement** | Agent IA qui apprend la stratégie optimale par essais/erreurs | S'adapte aux habitudes, pas de modèle explicite | Temps d'apprentissage, boîte noire | 🔴 Recherche |

**Position d'EnerFlux** : Approche **heuristique avec seuils** (règles simples, rapide, interprétable).

## 2. Principes d'allocation du surplus PV

### 2.1 Consensus industriel : Priorités de base

La littérature HEMS converge sur cette hiérarchie **physique** :

```
1. Charges incompressibles (baseload) → Toujours en priorité
2. Confort critique (chauffage si call_for_heat urgent) → Santé/sécurité
3. Stockage thermique (ECS, chauffage préventif) → Inertie élevée
4. Stockage électrique (batterie) → Flexible, rendement élevé
5. Charges différables (piscine, lave-linge) → Peuvent attendre
6. Export réseau → En dernier recours
```

**Justification** :
- **Confort avant économie** : Un ballon froid le soir est inacceptable, même si économiquement sous-optimal
- **Inertie thermique** : Chauffer l'eau maintenant = "stocker" de l'énergie gratuitement (pas de perte de rendement batterie)
- **Flexibilité batterie** : Peut être chargée plus tard, contrairement au chauffage qui suit la météo

### 2.2 Débat : ECS avant ou après batterie ?

**École "Thermal-first"** (majoritaire) :
- ✅ **Argument** : L'eau chaude a une inertie thermique élevée → stocker chaleur = gratuit
- ✅ **Argument** : Pas de cycles batterie → durée de vie prolongée
- ✅ **Argument** : Rendement 100% (résistance) vs ~85% (batterie charge/décharge)
- ⚠️ **Limite** : Si surplus PV irrégulier, batterie vide le soir → import réseau

**École "Battery-first"** (minoritaire) :
- ✅ **Argument** : Batterie = flexibilité maximale (peut servir ECS **et** autres charges)
- ✅ **Argument** : Avec tarifs HP/HC, mieux vaut stocker électricité et chauffer ECS en HC
- ⚠️ **Limite** : Cycles batterie augmentés → vieillissement accéléré
- ⚠️ **Limite** : Rendement batterie ~85% → perte 15% de l'énergie PV

**Consensus actuel** (littérature + retours terrain) :
```
Priorité ECS SI :
  - Température ballon < seuil confort (ex: < 50°C)
  - OU deadline proche (ex: 21h pour confort soirée)
Sinon :
  - Priorité batterie SI SOC < réserve soirée (ex: 60%)
  - Sinon priorité ECS (stockage thermique)
```

→ C'est exactement ce que fait la stratégie `reserve_evening` d'EnerFlux !

### 2.3 Cas particuliers : Multi-équipements

Quand plusieurs équipements se disputent le surplus PV :

**Règle générale** : Ordre de criticité décroissant
1. **Confort immédiat** : Chauffage si T < consigne - ΔT_critique
2. **Deadlines proches** : VE départ < 2h, ECS deadline < 1h
3. **Réserve énergétique** : Batterie si SOC < seuil_sécurité
4. **Efficacité énergétique** : ECS/chauffage (rendement 100%)
5. **Flexibilité maximale** : Batterie (si SOC OK)
6. **Charges différables** : Piscine, lave-linge, etc.

**Source** : Stratégie `multi_equipment_priority` d'EnerFlux suit ce principe (inspiré de IEEE HEMS).

## 3. Outils de référence (benchmarks)

### 3.1 Simulateurs professionnels

| Outil | Type | Forces | Faiblesses | Usage |
|-------|------|--------|-----------|-------|
| **PVSyst** | Commercial | Standard industrie, validation terrain, base de données météo | Cher (~1500€), focus dimensionnement PV | Conception installations pro |
| **SAM (NREL)** | Gratuit | Complet, open-source, validé scientifiquement | Complexe, courbe d'apprentissage | Recherche, dimensionnement |
| **TRNSYS** | Commercial | Simulation thermique détaillée (bâtiment + HVAC) | Très cher, expertise requise | Bureaux d'études thermiques |
| **Homer Energy** | Commercial | Optimisation microgrid, analyse économique | Focus hors-réseau, moins résidentiel | Systèmes isolés, îles |
| **EnerFlux** | Gratuit | Rapide, navigateur, comparaison stratégies | Pas de dimensionnement, pas de météo annuelle | Décision stratégique, éducation |

**Positionnement d'EnerFlux** :
- Complément aux outils pros (pas un remplacement)
- **Avant** PVSyst : Tester des stratégies de pilotage
- **Après** installation : Comparer différentes logiques de contrôle

### 3.2 Validation scientifique recommandée

Pour qu'EnerFlux soit crédible scientifiquement :

1. **Benchmark avec PVSyst/SAM** :
   - Comparer bilans énergétiques sur mêmes profils PV/conso
   - Tolérance acceptable : ±5% sur énergie totale

2. **Validation terrain** :
   - Collecter données réelles (installation existante)
   - Comparer prédictions EnerFlux vs mesures
   - Calibrer paramètres (rendements, pertes)

3. **Comparaison stratégies** :
   - Implémenter stratégie "MPC simple" comme référence optimale
   - Mesurer écart heuristiques vs optimal → quantifier perte

**Statut EnerFlux** :
- ✅ Physique validée (conservation énergie, tests unitaires)
- ✅ Formules KPI conformes (littérature technique)
- ⚠️ Pas encore de benchmark externe (PVSyst, terrain)

## 4. Bonnes pratiques d'optimisation PV

### 4.1 Principes généraux

1. **Autoconsommation maximale ≠ économie maximale**
   - Avec export bien rémunéré (0.10€/kWh), exporter peut être rentable
   - Avec batterie chère, amortissement peut prendre 10-15 ans
   - **Règle d'or** : Optimiser le **coût net**, pas juste l'autoconsommation

2. **Inertie thermique = stockage gratuit**
   - Ballon ECS 300L = ~15 kWh stockés (équivalent grosse batterie)
   - Chauffer l'eau en journée PV = 100% de rendement
   - Batterie Li-ion = ~85% rendement round-trip

3. **Cycles batterie = vieillissement**
   - 1 cycle/jour = ~300 cycles/an → durée de vie 10 ans (3000 cycles @ 80% DOD)
   - Stratégie "ECS-first" réduit cycles → prolonge durée de vie
   - **Trade-off** : Moins de cycles = moins d'autoconsommation soirée

4. **Deadlines et confort avant €**
   - Ballon froid à 21h = échec, même si économie 0.50€
   - VE non chargé pour départ 7h = problème majeur
   - **Design** : Contraintes confort = hard constraints, coût = fonction objectif

### 4.2 Erreurs fréquentes à éviter

❌ **"Je charge toujours la batterie en premier"**
- Problème : ECS peut se retrouver froide le soir
- Correction : Prioriser ECS si deadline proche ou T < seuil confort

❌ **"Je maximise l'autoconsommation à tout prix"**
- Problème : Si export bien rémunéré, exporter peut être plus rentable
- Correction : Comparer (€ évité import) vs (€ perdu export)

❌ **"J'ignore les pertes thermiques du ballon"**
- Problème : Chauffer l'ECS à 10h pour usage 21h → pertes 11h
- Correction : Chauffer au plus tard acceptable (ex: 18h pour deadline 21h)

❌ **"Je ne teste qu'un scénario"**
- Problème : Stratégie optimale varie selon saison/météo/profil
- Correction : Tester été ensoleillé, hiver nuageux, mi-saison

### 4.3 Recommandations EnerFlux

Pour une utilisation optimale d'EnerFlux :

1. **Tester plusieurs stratégies sur plusieurs scénarios**
   ```
   Scénarios à tester :
   - Été ensoleillé + ballon chaud
   - Hiver nuageux + ballon froid
   - Mi-saison + batterie vide
   - Soirée VE actif
   ```

2. **Comparer KPIs multiples, pas juste autoconsommation**
   ```
   KPIs critiques :
   - Coût net (€) → Objectif principal
   - Confort ECS (%) → Contrainte
   - Cycles batterie → Durée de vie
   - Autoconsommation → Indicateur
   ```

3. **Ajuster tarifs à votre contrat réel**
   ```
   Tarifs France 2025 (typiques) :
   - Import HP : 0.27 €/kWh
   - Import HC : 0.21 €/kWh
   - Export OA : 0.10-0.13 €/kWh
   ```

4. **Valider avec baseline "no-control"**
   ```
   Comparer gains vs stratégies sans pilotage :
   - no_control_offpeak : Heures creuses classique
   - no_control_hysteresis : Thermostat simple
   → Mesurer ROI du pilotage intelligent
   ```

## 5. Évolutions futures (état de l'art)

### 5.1 Tendances recherche académique

**MPC (Model Predictive Control)** :
- Horizon prédictif 24-48h avec météo
- Recalcul toutes les heures
- Optimisation MILP (Mixed Integer Linear Programming)
- **Défi** : Qualité prédictions météo/consommation

**Apprentissage par renforcement (RL)** :
- Agent IA entraîné sur historique
- S'adapte automatiquement aux habitudes
- **Défi** : Temps d'apprentissage, explicabilité

**Optimisation multi-objectif** :
- Pareto optimal (coût vs confort vs usure)
- Permet trade-offs explicites
- **Défi** : Préférences utilisateur difficiles à capturer

### 5.2 Tendances industrie

**Intégration cloud** :
- Connexion installations réelles (Victron, Fronius, etc.)
- Données temps réel
- Pilotage distant

**Prévisions améliorées** :
- Météo hyperlocale (Solcast API)
- Prédiction consommation (ML sur historique)
- Tarifs dynamiques (future EU regulation)

**Communautés énergétiques** :
- Partage surplus entre voisins
- Optimisation collective
- Blockchain pour transactions P2P

### 5.3 Roadmap suggérée pour EnerFlux

**Court terme** (consolider l'existant) :
1. ✅ Valider conservation énergie (fait)
2. ✅ Ajouter stratégies baseline no-control (fait)
3. 🔲 Benchmark avec PVSyst sur cas type
4. 🔲 Export CSV pour analyse externe

**Moyen terme** (approfondir) :
1. 🔲 Mode multi-jours (semaine/mois)
2. 🔲 Analyse sensibilité (tarifs, dimensionnement)
3. 🔲 Stratégie MPC simple comme référence optimale
4. 🔲 Tests automatisés sur tous scénarios

**Long terme** (impact réel) :
1. 🔲 API connexion systèmes réels (Home Assistant)
2. 🔲 Mode "Sizing optimizer" (quelle capacité batterie/PV?)
3. 🔲 Publication scientifique + validation terrain
4. 🔲 Communauté de partage de stratégies

## 6. Réponse à la question du waterfall

### 6.1 Ce que dit la littérature

**Consensus HEMS** : Il n'existe **pas** de waterfall universel fixe.

Les approches modernes (MPC, RL) **recalculent les priorités à chaque pas** en fonction de :
- État du système (SOC, température, etc.)
- Prédictions (météo, consommation)
- Contraintes (deadlines, confort)
- Fonction objectif (coût, autoconsommation, durée de vie)

**Heuristiques simples** (comme EnerFlux actuellement) utilisent un waterfall fixe par simplicité, mais avec **basculements conditionnels** :
```
SI (température_ECS < seuil_critique) ALORS
  Priorité ECS absolue
SINON SI (SOC_batterie < réserve_soirée) ALORS
  Priorité batterie
SINON
  Selon stratégie configurée
```

### 6.2 Recommandation pour EnerFlux

**Option A : Waterfall dynamique (simple à implémenter)**
```typescript
// Au lieu du waterfall fixe dans engine.ts,
// chaque stratégie décide de l'ORDRE complet d'allocation

interface AllocationOrder {
  priority: number;
  device: Device;
  reason: string;
}

// La stratégie retourne l'ordre complet, pas juste batterie vs ECS
const allocations = strategy.getAllocationOrder(context);
// Puis le moteur applique cet ordre
```

**Option B : Système de priorités pondérées**
```typescript
// Chaque équipement a un score dynamique
const scores = {
  ecs: calculateEcsUrgency(temp, deadline),
  battery: calculateBatteryNeed(soc, hour),
  heating: calculateHeatingNeed(indoor_temp, outdoor_temp),
  // etc.
};

// Allocation par score décroissant
const sorted = Object.entries(scores).sort((a,b) => b[1] - a[1]);
```

**Avantage Option A** : Plus fidèle à l'approche HEMS moderne
**Avantage Option B** : Plus flexible, plus facile à debugger

**Ma recommandation** : **Option A** (waterfall dynamique)
- Permet aux stratégies de vraiment contrôler tout
- Plus cohérent avec le nom "ecs_first" (vraiment first!)
- Prépare l'évolution vers MPC ultérieurement

## Références

- **IEEE HEMS** : IEEE Transactions on Smart Grid (papers sur Home Energy Management)
- **IEC 61968** : Standard Smart Grid et demand-response
- **PVSyst** : https://www.pvsyst.com/ (référence industrie)
- **SAM (NREL)** : https://sam.nrel.gov/ (simulation PV gratuite)
- **Homer Energy** : https://www.homerenergy.com/ (microgrids)
- **Scientific coherence audit** : [Docs/scientific_coherence_audit.md](./scientific_coherence_audit.md)
- **Strategy comparison** : [Docs/strategy_comparison_reliability.md](./strategy_comparison_reliability.md)
