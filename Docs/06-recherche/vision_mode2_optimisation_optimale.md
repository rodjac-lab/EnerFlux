# Vision : Mode 2 - Optimisation Optimale

**Date de création** : 20 octobre 2025
**Statut** : 🔮 Vision future (non implémenté)
**Pré-requis** : Mode 1 (Laboratoire Pédagogique) complété et validé

---

## Contexte : Deux Modes Complémentaires

EnerFlux est conçu pour servir **deux objectifs différents** avec **deux approches différentes** :

### **Mode 1 : Laboratoire Pédagogique** 🎓
- **Objectif** : Comprendre et visualiser l'impact de différents ordres d'allocation
- **Approche** : Stratégies avec waterfall **configurable** (ordre fixe par stratégie)
- **Public** : Débutant, curieux, décideur
- **Question** : "Vaut-il mieux charger l'ECS avant la batterie ?"
- **Statut** : ✅ En cours d'implémentation (voir [refactoring_plan_mode_laboratoire.md](./refactoring_plan_mode_laboratoire.md))

### **Mode 2 : Optimisation Optimale** 🤖
- **Objectif** : Trouver la **meilleure** allocation possible à chaque instant
- **Approche** : Waterfall **dynamique** (priorités recalculées selon contexte)
- **Public** : Expert, chercheur, installation réelle
- **Question** : "Quelle est la meilleure décision maintenant ?"
- **Statut** : 🔮 Vision future (ce document)

---

## Vision du Mode 2

### Principe : Priorités Contextuelles

Au lieu d'un ordre fixe, chaque équipement a un **score d'urgence** calculé dynamiquement selon :
- État actuel (température, SOC, heure)
- Contraintes (deadline, confort, tarifs)
- Prédictions (météo si disponible, habitudes)

**Exemple** :
```
À 10h, ballon ECS à 52°C, batterie SOC 40% :
  → Score ECS = 0.3 (température OK, pas urgent)
  → Score Batterie = 0.8 (SOC faible, pointe soirée à 18h)
  → Décision : Charger batterie en priorité

À 20h, ballon ECS à 48°C (deadline 21h), batterie SOC 60% :
  → Score ECS = 0.95 (deadline proche, température limite)
  → Score Batterie = 0.5 (SOC correct)
  → Décision : Charger ECS en priorité
```

---

## Architecture Technique

### Interface Strategy (Extension du Mode 1)

```typescript
// Mode 1 : Ordre fixe
interface FixedStrategy {
  type: 'fixed';
  getAllocationOrder(context: StrategyContext): DeviceType[];
}

// Mode 2 : Priorités dynamiques
interface DynamicStrategy {
  type: 'dynamic';
  calculatePriorities(context: StrategyContext): Map<DeviceType, number>;
}

// Union type
export type Strategy = FixedStrategy | DynamicStrategy;
```

### Fonction de Calcul de Priorité

```typescript
// Exemple pour ECS
function calculateEcsPriority(context: StrategyContext): number {
  const { ecs_temp_C, targetTemp_C, hour, deadlineHour } = context;

  // 1. Urgence température (0-1)
  const tempDeficit = Math.max(0, targetTemp_C - ecs_temp_C);
  const tempUrgency = tempDeficit / targetTemp_C;

  // 2. Urgence deadline (0-1)
  const hoursUntilDeadline = deadlineHour - hour;
  const deadlineUrgency = hoursUntilDeadline < 0
    ? 1.0
    : Math.max(0, 1 - hoursUntilDeadline / 4);

  // 3. Score final (moyenne pondérée)
  const score = tempUrgency * 0.4 + deadlineUrgency * 0.6;

  return score;
}

// Exemple pour Batterie
function calculateBatteryPriority(context: StrategyContext): number {
  const { soc_percent, hour, tariff } = context;

  // 1. Besoin de réserve (0-1)
  const reserveNeed = hour < 18 && soc_percent < 60
    ? (60 - soc_percent) / 60
    : 0.2;

  // 2. Opportunité tarifaire (0-1)
  const tariffOpportunity = tariff === 'offpeak' ? 0.8 : 0.3;

  // 3. Score final
  const score = reserveNeed * 0.7 + tariffOpportunity * 0.3;

  return score;
}

// Exemple pour Chauffage
function calculateHeatingPriority(context: StrategyContext): number {
  const { indoor_temp_C, target_temp_C, outdoor_temp_C } = context;

  // 1. Déficit de température (0-1)
  const deficit = Math.max(0, target_temp_C - indoor_temp_C);
  const urgency = deficit > 2.0 ? 1.0 : deficit / 2.0;

  // 2. Sévérité météo (bonus si très froid)
  const weatherBonus = outdoor_temp_C < 0 ? 0.2 : 0;

  // 3. Score final
  const score = Math.min(1.0, urgency + weatherBonus);

  return score;
}
```

### Stratégie "Smart Dynamic"

```typescript
export const smartDynamicStrategy: DynamicStrategy = {
  type: 'dynamic',
  id: 'smart_dynamic',
  label: 'Optimisation Intelligente',
  description: 'Décisions contextuelles adaptées à chaque instant. Anticipe besoins et contraintes.',

  calculatePriorities: (context: StrategyContext): Map<DeviceType, number> => {
    return new Map([
      ['baseload', 1.0], // Toujours prioritaire
      ['ecs', calculateEcsPriority(context)],
      ['battery', calculateBatteryPriority(context)],
      ['heating', calculateHeatingPriority(context)],
      ['pool', calculatePoolPriority(context)],
      ['ev', calculateEvPriority(context)]
    ]);
  }
};
```

### Allocation Dynamique dans Engine

```typescript
// Dans engine.ts
function allocateDynamic(
  available_kW: number,
  demands: Map<DeviceType, number>,
  priorities: Map<DeviceType, number>
): Map<DeviceType, number> {

  // Trier par priorité décroissante
  const sorted = Array.from(demands.entries())
    .sort((a, b) => (priorities.get(b[0]) ?? 0) - (priorities.get(a[0]) ?? 0));

  // Allouer selon l'ordre dynamique
  const allocated = new Map<DeviceType, number>();
  let remaining = available_kW;

  for (const [device, demand] of sorted) {
    const allocation = Math.min(demand, remaining);
    allocated.set(device, allocation);
    remaining -= allocation;
  }

  return allocated;
}
```

---

## Fonctionnalités du Mode 2

### 1. Autopilot UI

Interface simplifiée avec **une seule stratégie** : "Optimisation Intelligente"

```
┌──────────────────────────────────────────┐
│ Mode Optimisation Intelligente          │
├──────────────────────────────────────────┤
│                                          │
│ ✅ Autopilot activé                      │
│                                          │
│ Décisions en temps réel :                │
│                                          │
│ 14h00 : ECS prioritaire                  │
│   Raison : Temp 48°C, deadline 21h       │
│   Score : 0.85                           │
│                                          │
│ 16h00 : Batterie prioritaire             │
│   Raison : SOC 45%, pointe à 18h         │
│   Score : 0.78                           │
│                                          │
│ 18h30 : Chauffage prioritaire            │
│   Raison : T intérieure 18°C (cible 20°) │
│   Score : 0.92                           │
│                                          │
│ [📊 Voir détails des scores]             │
└──────────────────────────────────────────┘
```

### 2. Explications des Décisions

Pour chaque pas de temps, afficher **pourquoi** cette décision a été prise :

```typescript
interface DecisionExplanation {
  timestamp: number;
  winner: DeviceType;
  scores: Map<DeviceType, number>;
  reason: string;
  factors: {
    name: string;
    value: number;
    weight: number;
  }[];
}

// Exemple
const explanation = {
  timestamp: 72000, // 20h
  winner: 'ecs',
  scores: new Map([
    ['ecs', 0.95],
    ['battery', 0.50],
    ['heating', 0.30]
  ]),
  reason: 'ECS prioritaire : deadline imminente (1h restante) + température limite (48°C)',
  factors: [
    { name: 'Déficit température', value: 0.4, weight: 0.4 },
    { name: 'Urgence deadline', value: 0.95, weight: 0.6 }
  ]
};
```

### 3. Graphique Timeline des Scores

Visualiser l'évolution des priorités au fil du temps :

```
Scores de Priorité (0-1)
1.0 │          ╭─ECS──╮
    │         ╱        ╲
0.8 │ ╭Batt─╮╱          ╲╭─Batt──
    │╱      ╲            ╲
0.6 │        ╲            ╲
    │         ╲─────Heating──╮
0.4 │                        ╰──
    │
0.0 └──────────────────────────────
    6h    10h    14h    18h    22h
```

### 4. Mode Comparaison : Fixe vs Dynamique

Comparer stratégie fixe (Mode 1) vs dynamique (Mode 2) :

```
┌────────────────────────────────────────────┐
│ Comparaison Fixe vs Dynamique              │
├────────────────────────────────────────────┤
│                                            │
│ Stratégie A : ECS Prioritaire (fixe)       │
│ Stratégie B : Smart Dynamic                │
│                                            │
│ Résultats :                                │
│                                            │
│ Coût net :                                 │
│   A : €1.07                                │
│   B : €0.85  ✅ (21% mieux)                │
│                                            │
│ Autoconsommation :                         │
│   A : 68%                                  │
│   B : 72%  ✅                              │
│                                            │
│ Confort ECS :                              │
│   A : 96%                                  │
│   B : 94%  ⚠️ (légère baisse)             │
│                                            │
└────────────────────────────────────────────┘
```

---

## Avantages du Mode 2

### Par rapport au Mode 1 (Fixe)

1. **Adaptatif** : S'ajuste au contexte (heure, température, SOC)
2. **Optimal** : Minimise coût/maximise confort selon situation
3. **Intelligent** : Anticipe besoins (deadline ECS, pointe soirée)
4. **Aligné état de l'art** : Approche similaire à EMHASS, OpenEMS

### Par rapport aux approches académiques (MPC, RL)

| Critère | Mode 2 (Scores) | MPC (Linear Prog) | RL (Deep Learning) |
|---------|-----------------|-------------------|--------------------|
| **Complexité calcul** | Faible | Moyenne | Élevée |
| **Interprétabilité** | ✅ Élevée | ⚠️ Moyenne | ❌ Faible |
| **Prédictions requises** | Non | Oui (météo) | Oui (apprentissage) |
| **Temps calcul** | < 1ms | ~100ms | ~500ms |
| **Optimalité** | ⚠️ Heuristique | ✅ Optimale | ✅ Optimale (convergence) |
| **Implémentation** | Simple | Complexe (solveur LP) | Très complexe |

**Positionnement** : Mode 2 offre un **bon compromis** entre simplicité et performance.

---

## Paramètres Ajustables

Pour rendre le Mode 2 flexible, les **coefficients** doivent être configurables :

```typescript
interface DynamicStrategyConfig {
  ecs: {
    tempWeight: number;      // Poids du déficit température (défaut: 0.4)
    deadlineWeight: number;  // Poids de l'urgence deadline (défaut: 0.6)
  };
  battery: {
    reserveWeight: number;   // Poids du besoin de réserve (défaut: 0.7)
    tariffWeight: number;    // Poids de l'opportunité tarifaire (défaut: 0.3)
    reserveThreshold: number; // SOC cible réserve (défaut: 60%)
  };
  heating: {
    deficitThreshold: number; // Déficit critique (défaut: 2.0°C)
    weatherBonus: boolean;    // Bonus si froid extrême (défaut: true)
  };
}

// UI : Panneau "Réglages Avancés"
const config: DynamicStrategyConfig = {
  ecs: { tempWeight: 0.4, deadlineWeight: 0.6 },
  battery: { reserveWeight: 0.7, tariffWeight: 0.3, reserveThreshold: 60 },
  heating: { deficitThreshold: 2.0, weatherBonus: true }
};
```

---

## Plan d'Implémentation Futur

### Pré-requis

- ✅ Mode 1 (Laboratoire) complété et validé
- ✅ Retour utilisateur positif sur Mode 1
- ✅ Besoin identifié pour optimisation dynamique

### Lots de Travail (Estimation)

#### **LOT A : Backend - Fonctions de Calcul de Priorité** (4-6h)
- Implémenter `calculateEcsPriority()`
- Implémenter `calculateBatteryPriority()`
- Implémenter `calculateHeatingPriority()`
- Implémenter `calculatePoolPriority()`
- Implémenter `calculateEvPriority()`
- Tests unitaires sur chaque fonction

#### **LOT B : Backend - Stratégie Smart Dynamic** (3-4h)
- Créer `smartDynamicStrategy`
- Intégrer dans `allocateDynamic()` (engine.ts)
- Tests : Comparer avec stratégies fixes
- Valider conservation énergie

#### **LOT C : UI - Mode Autopilot** (4-5h)
- Interface simplifiée "Optimisation Intelligente"
- Affichage décisions en temps réel
- Timeline des scores
- Explications textuelles

#### **LOT D : UI - Graphique Scores** (3-4h)
- Chart Recharts pour visualiser évolution scores
- Hover pour détails à chaque instant
- Légende interactive

#### **LOT E : Configuration Avancée** (2-3h)
- Panneau réglages coefficients
- Sliders pour ajuster poids
- Sauvegarder config perso

#### **LOT F : Comparaison Fixe vs Dynamique** (2-3h)
- Adapter comparateur A/B
- Permettre "Stratégie fixe" vs "Smart Dynamic"
- KPIs côte à côte

#### **LOT G : Documentation** (2-3h)
- Guide utilisateur Mode 2
- Explication calculs de priorité
- Quand utiliser Mode 1 vs Mode 2

**Total estimé** : **20-28 heures**

---

## Quand Implémenter le Mode 2 ?

### Critères de Déclenchement

Implémenter Mode 2 **SI** :
1. ✅ Mode 1 complété et utilisé avec succès
2. ✅ Utilisateur demande "Comment faire mieux ?"
3. ✅ Besoin identifié : optimisation temps réel sur installation réelle
4. ✅ Ressources disponibles (~3-4 jours de dev)

### Ne PAS Implémenter Mode 2 si :
- ❌ Mode 1 non finalisé
- ❌ Utilisateur satisfait des stratégies fixes
- ❌ Pas de cas d'usage concret identifié
- ❌ Complexité perçue comme inutile

**Recommandation** : Attendre au moins **1 mois d'utilisation du Mode 1** avant de décider.

---

## Alternatives au Mode 2

Si besoin d'optimisation sans implémenter Mode 2 complet :

### **Option A : Stratégies Hybrides (Mode 1.5)**

Stratégies fixes mais avec **basculements conditionnels** :

```typescript
export const smartEcsFirstStrategy: Strategy = {
  type: 'fixed',
  getAllocationOrder: (context) => {
    // Si ECS urgente (deadline < 2h ET temp < 50°C)
    if (context.hoursUntilDeadline < 2 && context.ecs_temp_C < 50) {
      return ['baseload', 'ecs', 'heating', 'battery', 'pool', 'ev'];
    }

    // Si batterie très faible (SOC < 30% ET heure < 16h)
    if (context.soc_percent < 30 && context.hour < 16) {
      return ['baseload', 'battery', 'ecs', 'heating', 'pool', 'ev'];
    }

    // Sinon ordre standard
    return ['baseload', 'ecs', 'battery', 'heating', 'pool', 'ev'];
  }
};
```

**Avantage** : Plus simple que scores dynamiques, mais déjà adaptatif.

### **Option B : Intégration EMHASS**

Utiliser EMHASS (projet open source) comme backend d'optimisation :

```bash
# API EMHASS
POST /api/optimization
{
  "pv_forecast": [...],
  "load_forecast": [...],
  "battery_soc": 45,
  "tariffs": {...}
}

# Réponse : planning optimal 24h
{
  "battery_power": [0, 2.5, 3.0, -2.0, ...],
  "dhw_power": [0, 0, 2.6, 0, ...]
}
```

**Avantage** : Solution éprouvée, optimisation LP.
**Inconvénient** : Dépendance externe, complexité d'intégration.

---

## Questions Ouvertes

### Design

1. **Nombre de stratégies dynamiques ?**
   - Une seule "Smart Dynamic" suffit ?
   - Ou plusieurs variantes (coût, confort, durabilité) ?

2. **Affichage des scores dans l'UI ?**
   - Timeline permanente ou panel dépliable ?
   - Graphique Recharts ou visualisation custom ?

3. **Paramètres par défaut des coefficients ?**
   - Comment les calibrer ?
   - Faut-il une phase d'apprentissage ?

### Technique

1. **Fréquence de recalcul des priorités ?**
   - À chaque pas de temps (300s) ?
   - Seulement si contexte change significativement ?

2. **Gestion des contraintes hard ?**
   - Deadline ECS absolue (doit être satisfaite) ?
   - Comment forcer une priorité à 1.0 ?

3. **Intégration avec Mode 1 ?**
   - Comparaison directe Fixe vs Dynamique ?
   - Même UI ou interface séparée ?

---

## Références

### Inspirations

- **EMHASS** : https://github.com/davidusb-geek/emhass (scores MPC)
- **OpenEMS** : https://github.com/OpenEMS/openems (priorités configurables)
- **Papers IEEE HEMS** : Optimisation multi-objectif avec scores pondérés

### Documentation EnerFlux Liée

- [refactoring_plan_mode_laboratoire.md](./refactoring_plan_mode_laboratoire.md) : Plan Mode 1
- [etat_de_lart_optimisation_pv.md](./etat_de_lart_optimisation_pv.md) : État de l'art HEMS
- [recherche_etat_art_web_opensource.md](./recherche_etat_art_web_opensource.md) : Projets open source
- [waterfall_allocation.md](./waterfall_allocation.md) : Waterfall actuel

---

## Conclusion

Le **Mode 2 - Optimisation Optimale** est une **vision à long terme** qui complète le Mode 1 (Laboratoire Pédagogique).

**Mode 1** répond à la question : "Comment comparer différentes stratégies ?"
**Mode 2** répond à la question : "Quelle est la meilleure décision maintenant ?"

Les deux modes sont **complémentaires** et servent des publics différents :
- Mode 1 : Apprentissage, exploration, validation de principes
- Mode 2 : Production, installation réelle, optimisation maximale

**Prochaine étape** : Compléter Mode 1, puis réévaluer le besoin pour Mode 2.

---

**Auteur** : Claude (Anthropic)
**Date** : 20 octobre 2025
**Statut** : 🔮 Vision future - Document de référence
