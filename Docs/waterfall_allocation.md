# Waterfall d'allocation du surplus PV — EnerFlux

**Date de création** : 20 octobre 2025
**Dernière mise à jour** : 20 octobre 2025

Ce document explique comment EnerFlux alloue la production photovoltaïque en **cascade** (waterfall) pour satisfaire les besoins énergétiques.

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

## Références

- Code source : [src/core/engine.ts:462-474](../src/core/engine.ts#L462-L474)
- Audit scientifique : [Docs/scientific_coherence_audit.md](./scientific_coherence_audit.md#L25)
- Stratégies : [Docs/algorithms_playbook.md](./algorithms_playbook.md)
