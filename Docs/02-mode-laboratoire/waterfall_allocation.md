# Waterfall d'allocation du surplus PV — EnerFlux

**Date de création** : 20 octobre 2025
**Dernière mise à jour** : 21 octobre 2025 (Refacto Mode Laboratoire)

Ce document explique comment EnerFlux alloue la production photovoltaïque en **cascade** (waterfall) pour satisfaire les besoins énergétiques.

> ⚠️ **Note importante** : Ce document décrit à la fois l'**ancien système** (waterfall fixe) et le **nouveau système** (waterfall configurable par stratégie). Voir la section "[Après refactoring](#après-refactoring--waterfall-configurable)" pour le système actuel.

## Vue d'ensemble

La production PV est allouée dans un ordre strict de priorité :

```
Production PV
    ↓
1. Charge de base (baseload) → toujours prioritaire
    ↓ (reste disponible = pvRemainder)
2. Chauffage (heating) → selon consommation instantanée
    ↓ (reste disponible = pvRemainder)
3. Piscine (pool) → selon consommation instantanée
    ↓ (reste disponible = pvRemainder)
4. Véhicule électrique (EV) → selon consommation instantanée
    ↓ (reste disponible = pvRemainder)
5. Chauffe-eau (ECS) → selon consommation instantanée
    ↓ (reste disponible = pvRemainder)
6. Batterie (charge) → selon stratégie d'allocation
    ↓ (reste disponible = pvRemainder)
7. Export réseau (grid) → tout le reste
```

## Implémentation

### Code source : `src/core/engine.ts:462-474`

```typescript
// 1. D'abord, satisfaire la charge de base
const pvToLoad_kW = Math.min(pv_kW, baseLoad_kW);
let pvRemainder_kW = Math.max(pv_kW - pvToLoad_kW, 0);

// 2. Puis le chauffage
const pvToHeat_kW = Math.min(heatingConsumption_kW, pvRemainder_kW);
pvRemainder_kW -= pvToHeat_kW;

// 3. Puis la piscine
const pvToPool_kW = Math.min(poolConsumption_kW, pvRemainder_kW);
pvRemainder_kW -= pvToPool_kW;

// 4. Puis le véhicule électrique
const pvToEv_kW = Math.min(evConsumption_kW, pvRemainder_kW);
pvRemainder_kW -= pvToEv_kW;

// 5. Puis le chauffe-eau
const pvToEcs_kW = Math.min(ecsConsumption_kW, pvRemainder_kW);
pvRemainder_kW -= pvToEcs_kW;

// 6. Puis la batterie
const pvToBatt_kW = Math.min(batteryCharge_kW, pvRemainder_kW);
pvRemainder_kW -= pvToBatt_kW;

// 7. Enfin, export réseau
const pvToGrid_kW = pvRemainder_kW;
```

## Principes de conception

### 1. Charge de base toujours prioritaire

La charge de base (appareils domestiques : frigo, lumières, ordinateurs, etc.) est **toujours** satisfaite en premier par le PV disponible. C'est la consommation incompressible de la maison.

**Justification** : Ces charges ne sont pas pilotables et doivent être alimentées immédiatement. Mieux vaut utiliser le PV gratuit que d'importer du réseau.

### 2. Ordre des équipements pilotables

L'ordre actuel est :
- Chauffage > Piscine > VE > ECS > Batterie

**Note importante** : Cet ordre est **indépendant des stratégies** ! Les stratégies (`ecs_first`, `battery_first`, etc.) ne contrôlent que l'allocation du **surplus** (étape 6).

**Problème potentiel** : Si le chauffage demande beaucoup de puissance, il peut "consommer" tout le PV avant que la stratégie n'ait son mot à dire.

### 3. Stratégie d'allocation = Étape 6 uniquement

Les stratégies comme `ecs_first` ou `battery_first` ne contrôlent que l'étape 6 :

```
pvRemainder après (baseload + heating + pool + EV + ECS)
    ↓
Stratégie décide : ECS ? Batterie ? Autre ?
```

**Confusion fréquente** : Le nom `ecs_first` suggère que l'ECS est prioritaire, mais en réalité :
- L'ECS passe **après** chauffage/piscine/VE dans le waterfall physique
- La stratégie `ecs_first` alloue le surplus restant en priorité à l'ECS

### 4. Gestion du déficit (après allocation PV)

Si le PV ne suffit pas à couvrir une charge, le déficit est calculé :

```typescript
const loadDeficitAfterPV_kW = Math.max(baseLoad_kW - pvToLoad_kW, 0);
const heatingDeficitAfterPV_kW = Math.max(heatingConsumption_kW - pvToHeat_kW, 0);
// etc.
```

Ces déficits sont ensuite couverts par la **batterie** (si disponible) puis le **réseau** (import).

## Exemple concret

### Scénario : Matin ensoleillé

**Conditions** :
- Production PV : 5.0 kW
- Charge de base : 0.8 kW
- Chauffage : 1.2 kW
- Piscine : 0 kW (hors saison)
- VE : 0 kW (pas de charge)
- ECS demande : 2.6 kW (thermostat ON)
- Batterie peut accepter : 3.0 kW

**Allocation cascade** :

```
PV disponible : 5.0 kW
↓
1. Baseload : min(5.0, 0.8) = 0.8 kW → Reste 4.2 kW
2. Heating : min(4.2, 1.2) = 1.2 kW → Reste 3.0 kW
3. Pool : min(3.0, 0) = 0 kW → Reste 3.0 kW
4. EV : min(3.0, 0) = 0 kW → Reste 3.0 kW
5. ECS : min(3.0, 2.6) = 2.6 kW → Reste 0.4 kW
6. Batterie : min(0.4, 3.0) = 0.4 kW → Reste 0 kW
7. Export : 0 kW
```

**Résultat** :
- ✅ Baseload couverte (0.8 kW PV)
- ✅ Chauffage couvert (1.2 kW PV)
- ✅ ECS couverte (2.6 kW PV)
- ✅ Batterie légèrement chargée (0.4 kW PV)
- ✅ Autoconsommation = 100% (rien exporté)

### Scénario : Production PV insuffisante

**Conditions** :
- Production PV : 2.0 kW
- Charge de base : 0.8 kW
- Chauffage : 1.5 kW
- ECS demande : 2.6 kW
- Batterie SOC : 40% (peut décharger 2.0 kW)

**Allocation cascade** :

```
PV disponible : 2.0 kW
↓
1. Baseload : min(2.0, 0.8) = 0.8 kW → Reste 1.2 kW
   Déficit baseload : 0 kW
2. Heating : min(1.2, 1.5) = 1.2 kW → Reste 0 kW
   Déficit heating : 1.5 - 1.2 = 0.3 kW
3. Pool : 0 kW
4. EV : 0 kW
5. ECS : min(0, 2.6) = 0 kW → Reste 0 kW
   Déficit ECS : 2.6 - 0 = 2.6 kW
6. Batterie : 0 kW (pas de surplus)
7. Export : 0 kW
```

**Couverture des déficits par la batterie** :

```
Batterie disponible : 2.0 kW
↓
1. Baseload : min(2.0, 0) = 0 kW → Reste 2.0 kW
2. Heating : min(2.0, 0.3) = 0.3 kW → Reste 1.7 kW
3. Pool : 0 kW
4. EV : 0 kW
5. ECS : min(1.7, 2.6) = 1.7 kW → Reste 0 kW
```

**Déficits restants (import réseau)** :

```
ECS : 2.6 - 1.7 = 0.9 kW → Import réseau
```

**Résultat** :
- ✅ Baseload : 0.8 kW PV
- ✅ Chauffage : 1.2 kW PV + 0.3 kW batterie
- ⚠️ ECS : 1.7 kW batterie + 0.9 kW réseau (partiellement couverte)
- ❌ Batterie : décharge 2.0 kW (SOC diminue)
- ❌ Import réseau : 0.9 kW

## Questions fréquentes

### Q1 : Pourquoi l'ECS passe après le chauffage dans le waterfall ?

**Réponse** : C'est un choix d'implémentation actuel. Le waterfall physique reflète l'ordre de consommation "naturelle" : chauffage thermique > charges électriques > stockage.

**Attention** : Cela peut être contre-intuitif avec la stratégie `ecs_first` qui suggère que l'ECS est prioritaire. En réalité, `ecs_first` ne contrôle que l'allocation du surplus **après** le waterfall.

### Q2 : Peut-on modifier l'ordre du waterfall ?

**Réponse** : Oui, mais c'est un changement structurel dans `engine.ts`. Il faudrait déplacer les lignes 462-474 pour changer l'ordre.

**Exemple** : Pour vraiment faire passer l'ECS en premier :

```typescript
const pvToEcs_kW = Math.min(ecsConsumption_kW, pvRemainder_kW);
pvRemainder_kW -= pvToEcs_kW;
const pvToHeat_kW = Math.min(heatingConsumption_kW, pvRemainder_kW);
pvRemainder_kW -= pvToHeat_kW;
// etc.
```

### Q3 : Quelle est la différence entre le waterfall et les stratégies ?

**Réponse** :
- **Waterfall** (engine.ts) : Ordre **physique** d'allocation du PV aux consommations déclarées
- **Stratégies** (strategy.ts) : Décisions **intelligentes** pour allouer le surplus PV restant aux équipements pilotables

**Exemple** :
- Le waterfall dit : "Le chauffage demande 1.5 kW, je lui donne en priorité"
- La stratégie dit : "Il me reste 2 kW de surplus, je vais charger l'ECS ou la batterie ?"

### Q4 : Pourquoi la batterie est à l'étape 6 (presque dernière) ?

**Réponse** : Parce que les consommations **immédiates** (chauffage, ECS, VE) sont prioritaires dans le waterfall. La batterie est un **stockage différable** : on peut la charger plus tard.

Les stratégies permettent de modifier cette logique :
- `battery_first` : alloue le surplus (étape 6) en priorité à la batterie
- `ecs_first` : alloue le surplus en priorité à l'ECS

Mais dans les deux cas, le **waterfall physique** (étapes 1-5) reste identique.

## Améliorations potentielles

### 1. Rendre le waterfall configurable

Permettre à l'utilisateur de définir l'ordre de priorité :

```typescript
const waterfall = config.priorityOrder; // ['baseload', 'ecs', 'heating', 'battery', ...]
```

### 2. Fusionner waterfall et stratégies

Actuellement, il y a deux niveaux de priorité :
- Waterfall physique (étapes 1-5)
- Stratégies (étape 6)

On pourrait unifier en un seul système de priorité dynamique où les stratégies contrôlent **tout** l'ordre d'allocation.

### 3. Documenter la confusion `ecs_first`

Le nom `ecs_first` est trompeur car l'ECS n'est **pas** first dans le waterfall physique. Envisager :
- Renommer en `ecs_priority_surplus` (plus explicite)
- Ou modifier le waterfall pour vraiment mettre l'ECS en premier

---

## Après refactoring : waterfall configurable

**Date** : 21 octobre 2025 (LOTs 1-5 du refactoring Mode Laboratoire)

Le système d'allocation a été refactoré pour permettre aux **stratégies de contrôler l'ordre complet d'allocation**, rendant le waterfall dynamique et configurable.

### Nouvelle architecture

#### 1. Fonction centrale : `allocateByPriority()`

**Emplacement** : [src/core/allocation.ts](../src/core/allocation.ts)

Cette fonction remplace l'ancien waterfall fixe. Elle accepte un **ordre de priorité** en paramètre et alloue le surplus PV selon cet ordre.

**Signature** :
```typescript
function allocateByPriority(
  pvRemainder_kW: number,
  allocationOrder: readonly DeviceType[],
  devices: Map<DeviceType, Device>,
  dt_s: number,
  ctx: EnvContext
): AllocationResult
```

**Principe** :
```typescript
for (const deviceType of allocationOrder) {
  const device = devices.get(deviceType);
  if (!device || pvRemainder_kW <= 0) continue;

  const plan = device.plan(dt_s, ctx);
  const powerToAllocate = Math.min(plan.request?.maxAccept_kW ?? 0, pvRemainder_kW);

  device.apply(powerToAllocate, dt_s, ctx);
  pvRemainder_kW -= powerToAllocate;

  // Tracking...
}
```

**Avantages** :
- ✅ Ordre d'allocation **dynamique** (différent par stratégie)
- ✅ Élimination du code dupliqué (ancien waterfall de 100+ lignes → fonction générique)
- ✅ Testabilité accrue (ordre injectable)
- ✅ Base pour Mode Laboratoire pédagogique

#### 2. Fonction de mapping : `getAllocationOrder()`

**Emplacement** : [src/core/strategy.ts](../src/core/strategy.ts)

Cette fonction retourne l'ordre d'allocation spécifique à chaque stratégie.

**Signature** :
```typescript
export function getAllocationOrder(strategyId: StrategyId): readonly DeviceType[]
```

**Exemples d'ordres** :

```typescript
// Stratégie 'ecs_first' : ECS prioritaire
getAllocationOrder('ecs_first')
// → ['baseload', 'ecs', 'battery', 'heating', 'pool', 'ev']

// Stratégie 'battery_first' : Batterie prioritaire
getAllocationOrder('battery_first')
// → ['baseload', 'battery', 'ecs', 'heating', 'pool', 'ev']

// Stratégie 'reserve_evening' : Batterie avant ECS
getAllocationOrder('reserve_evening')
// → ['baseload', 'battery', 'ecs', 'heating', 'pool', 'ev']

// Stratégie 'no_control_offpeak' : Pas de pilotage actif ECS
getAllocationOrder('no_control_offpeak')
// → ['baseload', 'battery', 'heating', 'pool', 'ev', 'ecs']
```

**Note importante** : Bien que le projet ait 10 stratégies, il n'existe que **4 ordres distincts** :
1. **baseload → ecs → battery → ...** (ecs_first, ecs_hysteresis, deadline_helper)
2. **baseload → battery → ecs → ...** (battery_first, mix_soc_threshold, reserve_evening)
3. **baseload → battery → heating → pool → ev → ecs** (no_control_offpeak, no_control_hysteresis)
4. **baseload → battery → ev → ecs → ...** (ev_departure_guard)

Les stratégies se différencient aussi par leur **logique de décision** (hystérésis, deadline, seuils SOC) et non seulement par l'ordre.

#### 3. Intégration dans le moteur

**Emplacement** : [src/core/engine.ts](../src/core/engine.ts)

L'ancien waterfall fixe a été remplacé par un appel à `allocateByPriority()` :

```typescript
// Ancien code (supprimé) :
// const pvToLoad_kW = Math.min(pv_kW, baseLoad_kW);
// let pvRemainder_kW = pv_kW - pvToLoad_kW;
// const pvToHeat_kW = Math.min(heatingConsumption_kW, pvRemainder_kW);
// pvRemainder_kW -= pvToHeat_kW;
// ... (100+ lignes de code répétitif)

// Nouveau code :
const allocationOrder = getAllocationOrder(strategyId);
const allocationResult = allocateByPriority(
  pvRemainder_kW,
  allocationOrder,
  devices,
  dt_s,
  ctx
);
```

### Comparaison ancien vs nouveau

| Aspect | Ancien système | Nouveau système |
|--------|---------------|-----------------|
| **Ordre d'allocation** | Fixe dans le code | Configurable par stratégie |
| **Contrôle stratégies** | Étape 6 uniquement (surplus final) | Ordre complet |
| **Lisibilité** | Waterfall implicite (100+ lignes) | Ordre explicite (tableau) |
| **Testabilité** | Difficile (logique enfouie) | Facile (ordre injectable) |
| **Pédagogie** | Ordre caché pour l'utilisateur | **Ordre affiché dans UI** |
| **Extensibilité** | Modifier engine.ts | Ajouter un ordre dans strategy.ts |

### Exemple concret : Matin ensoleillé

**Conditions** :
- Production PV : 5.0 kW
- Charge de base : 0.8 kW
- ECS demande : 2.6 kW (température basse)
- Batterie peut accepter : 3.0 kW (SOC 40%)

#### Stratégie A : `ecs_first`

**Ordre** : baseload → **ecs** → battery

```
PV disponible : 5.0 kW
↓
1. Baseload : 0.8 kW → Reste 4.2 kW
2. ECS : 2.6 kW → Reste 1.6 kW
3. Batterie : 1.6 kW → Reste 0 kW
```

**Résultat** :
- ✅ ECS chauffe rapidement (2.6 kW PV)
- ✅ Batterie charge partiellement (1.6 kW PV)
- 📊 Autoconsommation = 100%

#### Stratégie B : `battery_first`

**Ordre** : baseload → **battery** → ecs

```
PV disponible : 5.0 kW
↓
1. Baseload : 0.8 kW → Reste 4.2 kW
2. Batterie : 3.0 kW (maximum accepté) → Reste 1.2 kW
3. ECS : 1.2 kW → Reste 0 kW
```

**Résultat** :
- ✅ Batterie charge à pleine puissance (3.0 kW PV)
- ⚠️ ECS chauffe lentement (1.2 kW PV seulement)
- 📊 Autoconsommation = 100%

**Différence clé** : L'ordre d'allocation change complètement la répartition de la même production PV !

### Affichage UI (Mode Laboratoire)

Dans [src/ui/panels/StrategyPanel.tsx](../src/ui/panels/StrategyPanel.tsx), l'ordre est maintenant **visible** pour l'utilisateur :

```
Stratégie A : ECS prioritaire (brut)
Ordre: Base → ECS → Batterie → Chauffage → Piscine → VE

Stratégie B : Batterie prioritaire
Ordre: Base → Batterie → ECS → Chauffage → Piscine → VE
```

Cet affichage permet à l'utilisateur de :
- Comprendre pourquoi les KPIs diffèrent entre stratégies
- Comparer visuellement les priorités
- Apprendre les impacts de l'ordre d'allocation

### Questions fréquentes (nouveau système)

#### Q1 : Toutes les stratégies ont-elles un ordre différent ?

**Réponse** : Non. Sur 10 stratégies, il n'existe que **4 ordres distincts**. Les stratégies se différencient aussi par :
- Logique d'hystérésis (ecs_hysteresis)
- Gestion des deadlines (deadline_helper)
- Seuils de SOC (mix_soc_threshold)
- Helpers de réserve (reserve_evening)

#### Q2 : Peut-on créer un ordre personnalisé ?

**Réponse** : Oui ! Il suffit d'ajouter une nouvelle stratégie dans `getAllocationOrder()` :

```typescript
case 'my_custom_strategy':
  return ['baseload', 'heating', 'ecs', 'battery', 'pool', 'ev'] as const;
```

#### Q3 : Le baseload est-il toujours en premier ?

**Réponse** : Oui, par design. La charge de base (frigo, lumières, ordinateurs) est **incompressible** et doit être satisfaite immédiatement. Toutes les stratégies commencent par `baseload`.

#### Q4 : Comment tester une nouvelle stratégie ?

**Réponse** :
1. Ajouter l'ordre dans `getAllocationOrder()`
2. Ajouter la logique de décision dans `applyStrategy()`
3. Ajouter l'entrée dans [src/ui/panels/StrategyPanel.tsx](../src/ui/panels/StrategyPanel.tsx)
4. Lancer une simulation en Mode Laboratoire

### Objectifs pédagogiques atteints

Le refactoring Mode Laboratoire permet maintenant de :

- ✅ **Comparer visuellement** deux stratégies côte à côte (A vs B)
- ✅ **Voir l'ordre d'allocation** de chaque stratégie dans l'UI
- ✅ **Comprendre l'impact** de l'ordre sur les KPIs (autoconsommation, coûts, confort)
- ✅ **Tester rapidement** différentes configurations (7 scénarios × 10 stratégies)
- ✅ **Apprendre par l'expérimentation** (mode bac à sable pédagogique)

## Références

- Code source waterfall original : [src/core/engine.ts:462-474](../src/core/engine.ts#L462-L474) (supprimé)
- Code source nouveau système : [src/core/allocation.ts](../src/core/allocation.ts)
- Mapping des stratégies : [src/core/strategy.ts](../src/core/strategy.ts)
- Affichage UI : [src/ui/panels/StrategyPanel.tsx](../src/ui/panels/StrategyPanel.tsx)
- Plan de refactoring : [Docs/refactoring_plan_mode_laboratoire.md](./refactoring_plan_mode_laboratoire.md)
- Audit scientifique : [Docs/scientific_coherence_audit.md](./scientific_coherence_audit.md#L25)
- Stratégies : [Docs/algorithms_playbook.md](./algorithms_playbook.md)
