# Guidelines de test pour EnerFlux

**Date de création** : 25 octobre 2025
**Objectif** : Éviter les pièges courants lors de l'écriture et de la validation des tests scientifiques

---

## ⚠️ Le piège n°1 : Ajuster les tolérances pour faire passer les tests

### 🔴 Symptôme

```typescript
// Test échoue avec tolérance 0.10
expect(balance).toBeLessThan(pvProduction * 0.10); // ❌ Échoue

// On augmente jusqu'à ce que ça passe
expect(balance).toBeLessThan(pvProduction * 0.16); // ✅ Passe maintenant
```

### 🎯 Pourquoi c'est dangereux

1. **Masque les bugs réels** : Un vrai problème dans le simulateur peut passer inaperçu
2. **Perte de confiance** : Les tests ne garantissent plus la justesse scientifique
3. **Dérive progressive** : Les tolérances augmentent au fil du temps sans raison valable
4. **Tests inutiles** : Un test qui accepte n'importe quoi ne teste rien

### ✅ La bonne démarche

**TOUJOURS suivre ce workflow strict :**

```
1. Test échoue (Red)
   ↓
2. STOP ! Comprendre POURQUOI
   ↓
3. Afficher les valeurs intermédiaires (console.log)
   ↓
4. Identifier la cause racine :
   - Bug dans le code ? → Corriger le code
   - Bug dans le test ? → Corriger le test
   - Attente irréaliste ? → Ajuster avec justification
   ↓
5. Documenter la décision
   ↓
6. Test passe (Green) avec confiance
```

---

## 📋 Checklist avant d'accepter qu'un test passe

Avant de commiter un test qui passe, vérifier **TOUTES** ces conditions :

- [ ] **Je comprends pourquoi** le test échouait initialement
- [ ] **J'ai vérifié les valeurs intermédiaires** avec console.log ou debugger
- [ ] **Toutes les formes d'énergie** sont comptabilisées (électrique, thermique, cinétique...)
- [ ] **La tolérance est justifiée physiquement** (pas un nombre arbitraire)
- [ ] **J'ai documenté** la raison de la tolérance dans un commentaire
- [ ] **Le test échouerait** si le code était vraiment bugué (test sensible)
- [ ] **Les valeurs mesurées matchent** les calculs théoriques (±marge raisonnable)

Si **une seule** case est décochée → **CREUSER DAVANTAGE**

---

## 🛡️ Bonnes pratiques concrètes

### 1. Toujours afficher les valeurs pendant le debug

```typescript
it('Bilan énergétique global', () => {
  const result = runSimulation(...);

  // ✅ BON : Afficher TOUTES les valeurs clés
  console.log('\n=== BILAN ÉNERGÉTIQUE ===');
  console.log(`Input:    ${totalInput.toFixed(2)} kWh`);
  console.log(`Output:   ${totalOutput.toFixed(2)} kWh`);
  console.log(`Storage:  ${totalStorage.toFixed(2)} kWh`);
  console.log(`Losses:   ${balance.toFixed(2)} kWh`);
  console.log(`Expected: ${expectedLosses.toFixed(2)} kWh`);
  console.log(`Diff:     ${Math.abs(balance - expectedLosses).toFixed(2)} kWh`);
  console.log('========================\n');

  expect(balance).toBeCloseTo(expectedLosses, 0);
});
```

**Pourquoi ?** Les chiffres révèlent les problèmes conceptuels que l'intuition ne voit pas.

### 2. Documenter CHAQUE tolérance avec sa justification

```typescript
// ❌ MAUVAIS : Tolérance mystère
expect(losses).toBeLessThan(11.52);

// ✅ BON : Justification claire
// Pertes théoriques :
// - Thermiques ECS : 1.7 kWh (2.0 W/K × 35K × 24h, classe C ErP)
// - Batterie : 0.78 kWh (5 kWh stockés × 5% pertes charge/décharge, η=0.95)
// - Total : 2.48 kWh
// Tolérance : ±2.5 kWh pour arrondis numériques (dt_s=900s)
const expectedLosses_kWh = 2.48;
const tolerance_kWh = 2.5;
expect(Math.abs(losses_kWh - expectedLosses_kWh)).toBeLessThan(tolerance_kWh);
```

### 3. Décomposer les tests complexes en assertions intermédiaires

```typescript
it('Conservation énergie : bilan complet', () => {
  const result = runSimulation(...);

  // Étape 1 : Vérifier les entrées
  const totalInput = pvProduction + gridImport;
  expect(totalInput).toBeGreaterThan(0); // Sanity check

  // Étape 2 : Vérifier les sorties
  const totalOutput = baseLoadConsumption + gridExport;
  expect(totalOutput).toBeLessThan(totalInput); // Physiquement impossible sinon

  // Étape 3 : Vérifier le stockage (CRUCIAL !)
  const batteryStorage = socFinal - socInitial;
  const thermalStorage = calcThermalStorage(tempInitial, tempFinal, volume);
  expect(thermalStorage).toBeGreaterThan(0); // Ballon chauffé

  // Étape 4 : Bilan final
  const balance = totalInput - totalOutput - batteryStorage - thermalStorage;
  // Si ça échoue ici, on sait exactement quelle étape a un problème
  expect(Math.abs(balance)).toBeLessThan(expectedLosses + tolerance);
});
```

**Avantage** : Si le test échoue, le message indique **exactement** quelle assertion a raté.

### 4. Tester à plusieurs niveaux de granularité

```typescript
// Niveau 1 : Tests unitaires (fonctions pures)
describe('Calculs thermiques', () => {
  it('Capacité thermique eau = 1.163 Wh/(L·K)', () => {
    expect(WATER_HEAT_CAPACITY_WH_PER_L_PER_K).toBe(1.163);
  });

  it('Énergie pour chauffer 200L de 40°C à 55°C = 3.49 kWh', () => {
    const energy = calcThermalEnergy(200, 40, 55);
    expect(energy).toBeCloseTo(3.49, 2);
  });
});

// Niveau 2 : Tests de composants (DHWTank, Battery)
describe('DHWTank - Pertes thermiques', () => {
  it('Classe C ErP : pertes = 1.68 kWh/24h @ ΔT=35K', () => {
    const tank = new DHWTank({lossCoeff_W_per_K: 2.0, ...});
    const losses = simulateLosses(tank, 24 * 3600);
    expect(losses).toBeCloseTo(1.68, 1);
  });
});

// Niveau 3 : Tests d'intégration (système complet)
describe('Simulation complète - Cas limites', () => {
  it('Bilan énergétique global conservé', () => {
    // Teste TOUT le système ensemble
  });
});
```

**Avantage** : Un test unitaire qui échoue localise le bug instantanément.

### 5. Utiliser des valeurs symboliques, pas magiques

```typescript
// ❌ MAUVAIS : Magic numbers
const tank = new DHWTank({
  lossCoeff_W_per_K: 2.0,  // Pourquoi 2.0 ?
  volume_L: 200,            // Pourquoi 200 ?
  targetTemp_C: 55          // Pourquoi 55 ?
});

// ✅ BON : Constantes nommées et documentées
// Ballon ECS standard français (classe C ErP)
const TYPICAL_TANK_VOLUME_L = 200;  // Foyer 4 personnes
const TYPICAL_DHW_TARGET_C = 55;     // Norme sanitaire anti-légionelle
const ERP_CLASS_C_LOSS_COEFF = 2.0; // 85.6 W @ ΔT=40K selon ErP

const tank = new DHWTank({
  lossCoeff_W_per_K: ERP_CLASS_C_LOSS_COEFF,
  volume_L: TYPICAL_TANK_VOLUME_L,
  targetTemp_C: TYPICAL_DHW_TARGET_C
});
```

### 6. Pattern : "Arrange, Act, Assert, Analyze"

```typescript
it('Test description', () => {
  // === ARRANGE : Préparer les données ===
  const pvSeries_kW = Array(96).fill(3);
  const baseLoadSeries_kW = Array(96).fill(2);
  const expectedProduction = 3 * 24; // 72 kWh

  // === ACT : Exécuter l'action testée ===
  const result = runSimulation({
    dt_s: 900,
    pvSeries_kW,
    baseLoadSeries_kW,
    devices: [battery, tank],
    strategy: ecsFirstStrategy
  });

  // === ANALYZE : Comprendre le résultat (OPTIONNEL en debug) ===
  console.log('Production:', result.totals.pvProduction_kWh);
  console.log('Consumption:', result.totals.consumption_kWh);

  // === ASSERT : Vérifier les attentes ===
  expect(result.totals.pvProduction_kWh).toBeCloseTo(expectedProduction, 1);
});
```

---

## 🔬 Cas d'étude : Le bug du test 5

### ❌ Version initiale (incorrecte)

```typescript
it('Bilan global', () => {
  // ...simulation avec ballon qui chauffe de 40°C → 55°C...

  const balance = totalInput - baseLoadConsumption - gridExport - batteryDelta;

  expect(Math.abs(balance)).toBeLessThan(pvProduction * 0.10); // ❌ Échoue : 13.2 kWh
});
```

**Problème** : On a oublié de compter l'énergie stockée dans l'eau chaude !

### 🤔 Première tentation (dangereuse)

```typescript
// MAUVAISE solution : Augmenter la tolérance
expect(Math.abs(balance)).toBeLessThan(pvProduction * 0.16); // ✅ Passe maintenant
```

**Pourquoi c'est dangereux ?**
- On ne comprend toujours pas les 13 kWh
- Un vrai bug de conservation d'énergie passerait inaperçu
- Le test ne valide plus rien scientifiquement

### ✅ Bonne solution (investiguer)

```typescript
// 1. AFFICHER les valeurs
console.log('Balance:', balance);  // 13.2 kWh
console.log('Expected losses:', 1.7); // Pertes thermiques théoriques

// 2. ANALYSER : Différence de 11.5 kWh inexpliquée !
// 3. HYPOTHÈSE : Énergie stockée dans le ballon ?

// 4. CALCULER
const thermalStorage = 200 L × 1.163 Wh/(L·K) × (55 - 40) K = 3.49 kWh
const remainingGap = 13.2 - 3.5 = 9.7 kWh  // Encore trop !

// 5. RÉALISER l'erreur : Le bilan ne compte pas le stockage thermique !

// 6. CORRIGER le test
const thermalStorageDelta_kWh =
  (WATER_HEAT_CAPACITY_WH_PER_L_PER_K * volume_L * (tempFinal - tempInitial)) / 1000;

const balance = totalInput
              - baseLoadConsumption
              - gridExport
              - batteryDelta
              - thermalStorageDelta_kWh;  // ← AJOUT CRUCIAL

console.log('New balance:', balance);  // 2.48 kWh ← Cohérent avec pertes !

// 7. VALIDER
// Pertes attendues : 1.7 kWh (thermique) + 0.78 kWh (batterie) = 2.48 kWh ✓
expect(Math.abs(balance)).toBeLessThan(2.5 + 2.0);  // Tolérance justifiée
```

**Leçon** : Le problème n'était PAS la tolérance, mais une **erreur conceptuelle** dans le test.

---

## 🎯 Principes directeurs

### 1. **Un test qui passe doit donner confiance**

Si vous n'êtes pas sûr que le test détecterait un bug, c'est un mauvais test.

### 2. **La tolérance n'est jamais arbitraire**

Chaque tolérance doit avoir une justification physique ou numérique documentée.

### 3. **Comprendre > Faire passer**

Il vaut mieux passer du temps à comprendre un échec qu'à le masquer rapidement.

### 4. **Les nombres racontent une histoire**

Si les valeurs mesurées sont étranges, elles révèlent probablement un problème conceptuel.

### 5. **Tester = Prouver scientifiquement**

Un test scientifique n'est pas un test unitaire classique. Il doit prouver la justesse physique du modèle.

---

## 📊 Exemples de tolérances justifiées

### Tolérance numérique (arrondis)

```typescript
// Pas de dt_s = 900s (15 min), erreur d'intégration numérique ≈ 0.1%
const numericalTolerance = totalEnergy * 0.001; // 0.1%
expect(balance).toBeLessThan(numericalTolerance);
```

### Tolérance physique (pertes)

```typescript
// Pertes thermiques ECS classe C : 2.0 W/K × 35K × 24h = 1.68 kWh
// Tolérance : ±1 kWh pour cycles de régulation thermique
const thermalLosses_kWh = 1.68;
const regulationMargin_kWh = 1.0;
expect(measuredLosses).toBeCloseTo(thermalLosses_kWh, -1); // ±1.5 kWh
```

### Tolérance de modèle (simplifications)

```typescript
// Modèle simplifié : température uniforme dans le ballon
// Réalité : stratification thermique → écart ≈ 5%
const modelUncertainty = 0.05;
expect(measuredTemp).toBeCloseTo(expectedTemp, expectedTemp * modelUncertainty);
```

---

## ✅ Workflow recommandé pour chaque nouveau test

1. **Écrire le test** avec des attentes strictes (tolérance minimale)
2. **Lancer le test** → Il échoue (Red)
3. **Afficher TOUTES les valeurs intermédiaires** (console.log)
4. **Analyser l'écart** : Bug code ? Bug test ? Attente irréaliste ?
5. **Corriger la vraie cause** (pas la tolérance d'abord !)
6. **Documenter la décision** dans un commentaire
7. **Relancer** → Test passe (Green)
8. **Nettoyer** console.log si nécessaire (Refactor)
9. **Commit avec message explicite** : "fix: ..." ou "test: ..."

---

## 🚫 Anti-patterns à éviter absolument

### ❌ 1. La tolérance croissante

```typescript
// Version 1
expect(balance).toBeLessThan(7.2);  // ❌ Échoue

// Version 2
expect(balance).toBeLessThan(10.8); // ❌ Échoue encore

// Version 3
expect(balance).toBeLessThan(11.52); // ✅ Passe enfin !
```

**Problème** : On ne sait toujours pas pourquoi il y a 11.52 kWh d'écart.

### ❌ 2. La tolérance "qui devrait marcher"

```typescript
// "En théorie c'est 2 kWh, donc je mets 5 pour être sûr"
expect(losses).toBeLessThan(5);  // 2.5× trop lâche sans raison
```

**Problème** : Un bug qui cause 4 kWh de pertes passera inaperçu.

### ❌ 3. Le commentaire vague

```typescript
// On met 10% de tolérance pour les arrondis
expect(balance).toBeLessThan(total * 0.10);
```

**Problème** : "arrondis" ne justifie pas 10% ! Les arrondis numériques sont ~0.1%.

### ❌ 4. Le test "au cas où"

```typescript
it('Test vague sans attente précise', () => {
  const result = runSimulation(...);
  expect(result.totals.pvProduction_kWh).toBeGreaterThan(0); // Test inutile
});
```

**Problème** : Ce test ne détectera jamais de bug réel.

---

## 📚 Ressources complémentaires

### Documents liés
- **[Docs/scientific_paper_benchmark_plan.md](./scientific_paper_benchmark_plan.md)** : Validation avec normes ErP
- **[tests/edge_cases_validation.test.ts](../tests/edge_cases_validation.test.ts)** : Exemples de tests bien documentés

### Principes scientifiques
- Conservation de l'énergie : Input = Output + Storage + Losses
- Formes d'énergie à comptabiliser :
  - Électrique (PV, réseau, batterie)
  - Thermique (ballon ECS, pertes)
  - Pertes (rendements, isolation)

### Formules de référence
- Capacité thermique eau : **1.163 Wh/(L·K)**
- Pertes thermiques : **P = U × ΔT** (W)
- Stockage thermique : **E = m × c × ΔT** (Wh)
- Rendement batterie : **η = 0.90-0.95** (typique)

---

## 🎓 Conclusion

> **"Un test qui passe sans qu'on comprenne pourquoi est aussi dangereux qu'un test qui échoue."**

Les tests scientifiques sont différents des tests logiciels classiques :
- Ils **prouvent** la justesse physique, pas juste l'absence de crash
- Chaque tolérance doit avoir une **justification physique**
- Comprendre un échec est **plus important** que le faire passer rapidement

**En cas de doute** : Afficher les valeurs, analyser, comprendre, documenter, PUIS corriger.

---

**Dernière mise à jour** : 25 octobre 2025
**Auteur** : EnerFlux Team
**Version** : 1.0
