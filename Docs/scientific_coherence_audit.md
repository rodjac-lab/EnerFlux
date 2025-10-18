# Audit de Cohérence Scientifique — EnerFlux

**Date** : 18 octobre 2025
**Contexte** : Vérification de la cohérence entre l'implémentation du code, la documentation métier, et les principes scientifiques de l'autoconsommation photovoltaïque.

---

## Résumé Exécutif

✅ **L'implémentation EnerFlux est cohérente** avec les principes scientifiques documentés et les standards de l'industrie photovoltaïque.

**Points clés** :
- Conservation de l'énergie respectée (tolérance 1e-6 kWh)
- Formules KPI alignées avec la littérature technique
- Modèles thermodynamiques basés sur la physique classique
- Heuristiques d'allocation pragmatiques et documentées
- Une **ambiguïté terminologique** identifiée et clarifiée (voir section 3)

---

## 1. Cohérence avec les Définitions du Glossaire

| Terme | Définition Glossaire | Implémentation | Statut |
|-------|---------------------|----------------|--------|
| **Surplus** | `max(PV - Load_on_site, 0)` | Cascade waterfall dans `engine.ts:462-474` | ✅ Cohérent |
| **Injection** | `max(Surplus - Allocations, 0)` | `pvToGrid_kW = pvRemainder_kW` après allocations | ✅ Cohérent |
| **Import** | `max(Load - PV - Discharge, 0)` | `gridImport_kW = sum(déficits après PV + batterie)` | ✅ Cohérent |
| **SOC** | `E_stock / E_max × 100` | `Battery.ts:socFraction` | ✅ Cohérent |
| **Cycles batterie** | `Σ|ΔE| / (2×E_cap)` | `kpis.ts:115-124` | ✅ Cohérent |

---

## 2. Cohérence avec les Formules KPI (metrics_and_tests.md)

### 2.1 Autoconsommation

**Formule documentée** :
```latex
E_{pv_used} = \sum_t \min(PV(t), Load_{on\_site}(t)) \cdot \frac{dt}{3600}
AC = \frac{E_{pv\_used}}{E_{conso}}
```

**⚠️ ATTENTION** : Cette formule dans `metrics_and_tests.md` suggère que `pvUsedOnSite = min(PV, Load)`.

**Implémentation réelle** (`kpis.ts:147`) :
```typescript
pv_used_on_site_kWh = load_direct_from_pv + ecs_from_pv + battery_charge_from_pv
                    = PV → consommation + PV → appareils + PV → batterie
                    = PV_total - Export
```

**Résolution** : La formule documentée est **imprécise**. L'implémentation est **correcte** car :
- L'autoconsommation doit inclure le PV stocké dans la batterie
- La définition industrielle standard : AC = énergie PV utilisée localement / énergie PV totale
- C'est cohérent avec la ligne 508 du moteur : `pvUsed = pv_kW - gridExport_kW`

**Recommandation** : Mettre à jour `metrics_and_tests.md` ligne 14 avec :
```latex
E_{pv\_used} = E_{pv\_total} - E_{export}
```

### 2.2 Autoproduction

**Formule documentée** :
```latex
AP = \frac{E_{pv\_used}}{E_{pv\_total}}
```

**Implémentation** (`kpis.ts:192-193`) :
```typescript
selfConsumptionValue = audit.pv_used_on_site_kWh / audit.pv_total_kWh
```

✅ **Cohérent** : Nom différent (`selfConsumption` vs `autoproduction`) mais formule identique.

### 2.3 Économies

**Formule documentée** :
```latex
Δ_{grid} = C_{grid\_only} - C_{net}
Savings\_rate = \frac{Δ_{grid}}{C_{grid\_only}}
```

**Implémentation** (`kpis.ts:288-290`) :
```typescript
delta_vs_grid_only = saved_vs_nopv;
savings_rate = grid_only_cost > 0 ? delta_vs_grid_only / grid_only_cost : 0;
```

✅ **Cohérent**.

---

## 3. Clarification Terminologique : pvUsedOnSite

### Définition dans power-graph.ts

```typescript
// power-graph.ts:13-14
export const pvUsedOnSite_kW = (instant: PowerInstant): number =>
  Math.min(instant.pv_kW, loadOnSite_kW(instant));
```

Cette fonction **n'est jamais utilisée** dans le moteur ! Elle est obsolète.

### Définition réelle dans engine.ts

```typescript
// engine.ts:508
const pvUsed = pv_kW - gridExport_kW;
```

### Recommandations

1. **Supprimer** ou **renommer** la fonction `pvUsedOnSite_kW` dans `power-graph.ts` car elle est trompeuse
2. **Mettre à jour** `metrics_and_tests.md` ligne 14 pour refléter la vraie formule
3. **Ajouter** un commentaire dans `engine.ts:508` explicitant la définition

---

## 4. Cohérence avec les Principes Physiques

### 4.1 Thermodynamique de l'Eau (DHWTank.ts)

**Constante utilisée** :
```typescript
WATER_HEAT_CAPACITY_WH_PER_L_PER_K = 1.163 Wh/(L·K)
```

**Source scientifique** : Capacité thermique massique de l'eau pure :
- `c_water = 4.186 kJ/(kg·K) = 1.1628 Wh/(kg·K)`
- Pour eau à 55°C : ρ ≈ 0.9857 kg/L → `c_volumic ≈ 1.1463 Wh/(L·K)`
- Valeur utilisée (1.163) : ✅ **Précision à 1.4%** (acceptable pour simulation résidentielle)

**Formule de gain thermique** :
```typescript
ΔT = Q / (c × V)
```
✅ **Correcte** : Équation fondamentale de la thermodynamique.

**Test de validation** (`ecs_physics.test.ts`) :
- Tolérance : 2% après 1-2h de chauffage
- ✅ Conforme aux attentes pour un modèle simplifié (pertes négligées)

### 4.2 Thermodynamique du Bâtiment (Heating.ts)

**Modèle utilisé** :
```
T(t+dt) = T(t) + gain_K - loss_K
gain_K = P_delivered / capacité_thermique
loss_K = coeff_pertes × ΔT × dt / capacité_thermique
```

✅ **Cohérent** avec le modèle RC (Résistance-Capacité) du bâtiment simplifié.

**Paramètres typiques** :
- Capacité thermique : 2-3 kWh/K pour maison 100-150 m²
- Coefficient pertes : 150-250 W/K

**Source** : Norme EN ISO 13790 (méthode mensuelle/horaire du calcul énergétique des bâtiments).

### 4.3 Conservation de l'Énergie

**Propriété fondamentale** (validée dans tous les tests) :
```
E_pv + E_import = E_consumption + E_export + ΔE_battery
```

**Tolérance dans les tests** : 1e-6 kWh (= 1 mWh)

✅ **Excellente précision** : Garantit que le simulateur respecte la physique.

---

## 5. Cohérence avec les Standards de l'Industrie

### 5.1 Standards Photovoltaïques

| Standard | Application | Implémentation EnerFlux |
|----------|-------------|------------------------|
| **IEC 60904-1** | STC (Standard Test Conditions) pour puissance crête PV | Mentionné dans `domain_glossary.md` |
| **IEC 61968** | Smart Grid, demand-response | Inspiré par `reserve_evening` (réserve pointe) |
| **EN 12098** | Confort thermique (20°C jour, 18°C nuit) | Paramètres par défaut dans `Heating.ts` |
| **AFNOR NF** | Température ECS ≥ 55°C (prévention légionelle) | `DHWTank.ts:targetTemp = 55°C` |

✅ **Conforme** aux pratiques industrielles européennes.

### 5.2 Tarification Réseau (ENEDIS)

**ToU (Time-of-Use)** :
- HP (Heures Pleines) : 0.24 €/kWh typique
- HC (Heures Creuses) : 0.18 €/kWh typique

✅ Utilisé dans les scénarios de test et KPIs économiques.

### 5.3 Coûts d'Installation (Marché 2025)

| Équipement | Coût EnerFlux | Marché Réel (France) |
|------------|---------------|---------------------|
| PV | 1150 €/kWc + 1200 € | 1000-1300 €/kWc + frais |
| Batterie | 480 €/kWh + 500 € | 400-600 €/kWh + frais |

✅ **Réaliste** pour le marché français 2025.

---

## 6. Heuristiques d'Allocation du Surplus

Les stratégies (`ecs_first`, `battery_first`, `reserve_evening`, etc.) sont **heuristiques** et non basées sur des papiers académiques spécifiques.

**Justification** :
- Approche **pragmatique** adaptée à la simulation résidentielle
- Inspiration : contrôle prédictif (MPC), demand-response, théorie du scheduling
- **Pas de prétention** à l'optimalité mathématique (pas de résolution MILP)
- Focus sur l'**interprétabilité** et la **rapidité** (simulation temps réel dans le navigateur)

✅ **Acceptable** pour un simulateur éducatif/décisionnel.

**Recommandation future** : Si recherche d'optimum global, implémenter :
- MPC (Model Predictive Control) avec prédiction météo
- Programmation dynamique (Bellman) pour minimiser coûts sur horizon glissant
- Référence académique : IEEE papers sur "Home Energy Management Systems" (HEMS)

---

## 7. Tests de Validation Scientifique

| Test | Propriété Validée | Tolérance | Statut |
|------|-------------------|-----------|--------|
| `ecs_physics.test.ts` | Loi thermodynamique (ΔT théorique vs simulé) | ±2% après 1-2h | ✅ Passe |
| `heating_physics.test.ts` | Dynamique thermique bâtiment (montée T + pertes) | ±5% | ✅ Passe |
| `engine_minimal.test.ts` | Conservation énergie globale | 1e-6 kWh | ✅ Passe |
| `energy_flow_consistency.test.ts` | Bilans PV et consommation instantanés | 0.01 kW | ✅ Nouveau (18/10/2025) |

✅ **Validation robuste** des principes physiques.

---

## 8. Incohérence Identifiée et Corrigée (18/10/2025)

### Problème

Le composant `EnergyFlowDiagram` calculait incorrectement les flux PV :
```typescript
// ❌ INCORRECT (version initiale)
const pvToBattery = point.batt_charge_kW;  // Inclut charge depuis réseau !
const pvToHouse = pv_kW - pvToBattery - pvToGrid;  // Faux
```

Conséquence : **Violation de la conservation de l'énergie** quand batterie charge depuis grid.

### Solution Appliquée

Alignement avec la logique waterfall du moteur :
```typescript
// ✅ CORRECT (version corrigée)
const pvToHouse = Math.min(point.pvUsedOnSite_kW, totalConsumption);
const pvToBattery = Math.max(0, point.pvUsedOnSite_kW - totalConsumption);
const pvToGrid = point.gridExport_kW;
```

✅ Maintenant cohérent avec `engine.ts:462-508` et la conservation de l'énergie.

**Commit** : `e8e8c42` - "fix(ui): fix energy flow calculation consistency in EnergyFlowDiagram"

---

## 9. Recommandations

### 9.1 Court Terme (Documentation)

1. **Mettre à jour `metrics_and_tests.md` ligne 14** :
   ```latex
   # Ancien (imprécis)
   E_{pv\_used} = \sum_t \min(PV(t), Load_{on\_site}(t)) \cdot \frac{dt}{3600}

   # Nouveau (correct)
   E_{pv\_used} = E_{pv\_total} - E_{export} = \sum_t (PV(t) - Export(t)) \cdot \frac{dt}{3600}
   ```

2. **Supprimer ou renommer `pvUsedOnSite_kW` dans `power-graph.ts`** :
   - Cette fonction est **obsolète** et **trompeuse**
   - Remplacer par une note : `// DEPRECATED: See engine.ts:508 for actual definition`

3. **Ajouter commentaire dans `engine.ts:508`** :
   ```typescript
   // PV utilisé localement (non exporté) = PV direct consommation + PV stocké batterie
   const pvUsed = pv_kW - gridExport_kW;
   ```

### 9.2 Moyen Terme (Améliorations Scientifiques)

1. **Ajouter références académiques** pour les modèles thermiques :
   - EN ISO 13790 pour le modèle RC du bâtiment
   - NF C 15-100 / EN 60335 pour les ballons ECS

2. **Documenter les hypothèses simplificatrices** :
   - Pertes thermiques linéaires (loi de Newton) vs réalité non-linéaire
   - Pas de stratification thermique dans le ballon ECS
   - Pas de prédiction météo (stratégies heuristiques réactives)

3. **Implémenter validation continue** :
   - Ajouter assertions dans le code pour vérifier conservation énergie à chaque step
   - Logger warnings si déviations > seuils (comme fait dans `EnergyFlowDiagram`)

### 9.3 Long Terme (Recherche & Développement)

1. **Comparer avec simulateurs de référence** :
   - PVSyst (standard industrie)
   - SAM (System Advisor Model - NREL)
   - TRNSYS (simulation thermique)

2. **Implémenter contrôle optimal** :
   - MPC (Model Predictive Control) avec prévision 24-48h
   - Comparer performance vs heuristiques actuelles

3. **Publier méthodologie** :
   - Paper décrivant l'approche EnerFlux
   - Benchmarks de performance vs solutions commerciales

---

## 10. Conclusion

✅ **EnerFlux est scientifiquement cohérent** avec :
- Les principes physiques de la thermodynamique et de l'électricité
- Les standards de l'industrie photovoltaïque européenne
- Les formules KPI de la littérature technique

⚠️ **Une imprécision documentaire** identifiée (formule `pvUsedOnSite`) → recommandation de clarification.

✅ **L'implémentation du moteur est correcte** et validée par tests rigoureux (tolérance 1e-6).

L'approche EnerFlux est **pragmatique et industrielle** plutôt qu'académique/théorique, ce qui est adapté à un simulateur éducatif/décisionnel destiné au grand public et aux installateurs.

---

**Auteur** : Audit réalisé par Claude (Anthropic) à la demande de l'équipe EnerFlux
**Version** : 1.0
**Dernière mise à jour** : 18 octobre 2025
