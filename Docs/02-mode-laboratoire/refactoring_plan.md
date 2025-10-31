# Plan de Refactoring : Mode Laboratoire Pédagogique

**Date de création** : 20 octobre 2025
**Objectif** : Transformer EnerFlux en vrai "laboratoire de stratégies" où les stratégies contrôlent l'ordre complet d'allocation du surplus PV

---

## Vision

Actuellement, les stratégies (`ecs_first`, `battery_first`) ne contrôlent que le surplus restant après un waterfall fixe. Cela ne permet pas de comparer réellement l'impact de mettre l'ECS avant la batterie (ou vice-versa).

**Après ce refactoring** :
- ✅ Chaque stratégie définit son propre ordre d'allocation
- ✅ Les noms sont cohérents : `ecs_first` met vraiment l'ECS en premier
- ✅ L'utilisateur peut comparer visuellement l'impact des différents ordres
- ✅ Vision initiale du projet respectée (product_vision.md)

---

## Architecture Cible

### Avant (waterfall fixe)
```typescript
// engine.ts - lignes 462-474
const pvToLoad_kW = Math.min(pv_kW, baseLoad_kW);
let pvRemainder_kW = pv_kW - pvToLoad_kW;
const pvToHeat_kW = Math.min(heatingConsumption_kW, pvRemainder_kW);
pvRemainder_kW -= pvToHeat_kW;
const pvToPool_kW = Math.min(poolConsumption_kW, pvRemainder_kW);
// ... ordre FIXE codé en dur
```

### Après (waterfall configurable)
```typescript
// strategy.ts
interface Strategy {
  id: string;
  label: string;
  description: string;
  getAllocationOrder(context: StrategyContext): DeviceType[];
  useCases: string[];
}

// engine.ts
const order = strategy.getAllocationOrder(context);
const pvAllocation = allocateByPriority(pv_kW, demands, order);
```

---

## Lots de Travail

### **LOT 1 : Backend - Fonction d'Allocation Générique** ⚙️
**Durée estimée** : 2-3 heures
**Objectif** : Créer la fonction réutilisable pour allouer une ressource selon un ordre de priorité

#### Tâches
- [ ] 1.1 Créer fonction `allocateByPriority()` dans `src/core/engine.ts`
  ```typescript
  function allocateByPriority(
    available_kW: number,
    demands: Map<string, number>,
    order: string[]
  ): Map<string, number>
  ```
- [ ] 1.2 Écrire tests unitaires pour `allocateByPriority()`
  - Test : allocation complète (disponible > demandes)
  - Test : allocation partielle (disponible < demandes)
  - Test : ordre respecté
  - Test : edge case (0 disponible, demandes vides)
- [ ] 1.3 Valider conservation énergie

**Fichiers modifiés** :
- `src/core/engine.ts` (+20 lignes)
- `tests/allocation.test.ts` (nouveau fichier, +50 lignes)

**Critère de succès** : Tests passent, fonction validée isolément

---

### **LOT 2 : Backend - Refactoring du Moteur** 🔧
**Durée estimée** : 3-4 heures
**Objectif** : Remplacer le waterfall fixe par l'utilisation de `allocateByPriority()`

#### Tâches
- [ ] 2.1 Modifier `engine.ts` pour utiliser `allocateByPriority()` dans allocation PV
  - Remplacer lignes 462-474 (waterfall PV)
  - Utiliser ordre venant de la stratégie
- [ ] 2.2 Modifier allocation batterie (déficits)
  - Remplacer lignes 482-491 (waterfall batterie)
  - Même ordre que PV
- [ ] 2.3 Tester sur un scénario simple
  - Vérifier conservation énergie
  - Comparer résultats avant/après (doivent être identiques avec ordre par défaut)
- [ ] 2.4 Valider tous les tests existants passent
  - `energy_balance.test.ts`
  - `engine_minimal.test.ts`
  - `strategies_divergence.test.ts`

**Fichiers modifiés** :
- `src/core/engine.ts` (-40 lignes, +30 lignes)

**Critère de succès** : Tous les tests existants passent, conservation énergie validée

---

### **LOT 3 : Backend - Nouvelle Interface Strategy** 📋
**Durée estimée** : 2-3 heures
**Objectif** : Ajouter méthode `getAllocationOrder()` à l'interface Strategy

#### Tâches
- [ ] 3.1 Modifier interface `Strategy` dans `src/core/strategy.ts`
  ```typescript
  export interface Strategy {
    id: string;
    label: string;
    description: string;
    useCases: string[];
    getAllocationOrder(context: StrategyContext): DeviceType[];
  }
  ```
- [ ] 3.2 Définir type `DeviceType`
  ```typescript
  export type DeviceType =
    | 'baseload'
    | 'heating'
    | 'pool'
    | 'ev'
    | 'ecs'
    | 'battery';
  ```
- [ ] 3.3 Créer `StrategyContext` (infos disponibles pour décider)
  ```typescript
  export interface StrategyContext {
    hour: number;
    soc_percent?: number;
    ecs_temp_C?: number;
    heating_temp_C?: number;
    // ... autres contextes
  }
  ```

**Fichiers modifiés** :
- `src/core/strategy.ts` (+30 lignes)

**Critère de succès** : Interface définie, TypeScript compile

---

### **LOT 4 : Backend - Stratégies Pré-paramétrées** 🎯
**Durée estimée** : 3-4 heures
**Objectif** : Créer 6 stratégies avec ordres différents pour le Mode Simple

#### Tâches
- [ ] 4.1 Implémenter `ecsFirstStrategy`
  - Ordre : `['baseload', 'ecs', 'battery', 'heating', 'pool', 'ev']`
  - Description, cas d'usage
- [ ] 4.2 Implémenter `batteryFirstStrategy`
  - Ordre : `['baseload', 'battery', 'ecs', 'heating', 'pool', 'ev']`
- [ ] 4.3 Implémenter `thermalFirstStrategy` (nouveau)
  - Ordre : `['baseload', 'ecs', 'heating', 'battery', 'pool', 'ev']`
  - Description : "Stockage thermique prioritaire (rendement 100%)"
- [ ] 4.4 Implémenter `comfortFirstStrategy` (nouveau)
  - Ordre : `['baseload', 'heating', 'ecs', 'ev', 'battery', 'pool']`
  - Description : "Confort avant économie"
- [ ] 4.5 Implémenter `flexibilityFirstStrategy` (nouveau)
  - Ordre : `['baseload', 'battery', 'ev', 'ecs', 'heating', 'pool']`
  - Description : "Flexibilité horaire maximale"
- [ ] 4.6 Implémenter `noControlStrategy` (baseline)
  - Ordre : `['baseload', 'heating', 'pool', 'ev', 'ecs', 'battery']`
  - Description : "Sans pilotage - Baseline de référence"
- [ ] 4.7 Créer registre des stratégies
  ```typescript
  export const PRESET_STRATEGIES: Strategy[] = [
    ecsFirstStrategy,
    batteryFirstStrategy,
    thermalFirstStrategy,
    comfortFirstStrategy,
    flexibilityFirstStrategy,
    noControlStrategy
  ];
  ```
- [ ] 4.8 Tester chaque stratégie sur scénario `summerDefaults`
  - Vérifier ordre appliqué
  - Vérifier KPIs cohérents

**Fichiers modifiés** :
- `src/core/strategy.ts` (+120 lignes)
- `tests/strategies_preset.test.ts` (nouveau, +80 lignes)

**Critère de succès** : 6 stratégies fonctionnelles, tests passent

---

### **LOT 5 : UI - Mode Simple** 🎨
**Durée estimée** : 3-4 heures
**Objectif** : Adapter l'UI pour afficher les nouvelles stratégies avec descriptions et ordres

#### Tâches
- [ ] 5.1 Modifier `StrategyPanel.tsx`
  - Remplacer liste actuelle par `PRESET_STRATEGIES`
  - Afficher label + description
- [ ] 5.2 Créer composant `StrategyCard` pour afficher détails
  ```tsx
  <StrategyCard strategy={selectedStrategy}>
    <h4>{strategy.label}</h4>
    <p className="text-sm">{strategy.description}</p>
    <p className="text-xs">Ordre: {strategy.order.join(' → ')}</p>
    <p className="text-xs">Cas d'usage: {strategy.useCases.join(', ')}</p>
  </StrategyCard>
  ```
- [ ] 5.3 Adapter comparateur A/B
  - Afficher stratégie A et stratégie B côte à côte
  - Montrer les ordres différents visuellement
- [ ] 5.4 Tester UI dans navigateur
  - Sélectionner différentes stratégies
  - Vérifier descriptions affichées
  - Lancer simulation et voir résultats

**Fichiers modifiés** :
- `src/ui/panels/StrategyPanel.tsx` (~30 lignes modifiées)
- `src/ui/components/StrategyCard.tsx` (nouveau, +40 lignes)

**Critère de succès** : UI fonctionnelle, stratégies sélectionnables, descriptions visibles

---

### **LOT 6 : Documentation** 📚 ✅ **COMPLÉTÉ**
**Durée estimée** : 2 heures → **Durée réelle** : 1h30
**Objectif** : Documenter le changement et mettre à jour les guides

#### Tâches
- [x] 6.1 Mettre à jour `waterfall_allocation.md`
  - Section "Après refactoring : waterfall configurable" ajoutée (+230 lignes)
  - Exemples comparatifs ecs_first vs battery_first
  - Documentation getAllocationOrder() et allocateByPriority()
  - Tableau comparaison ancien vs nouveau système
- [x] 6.2 Mettre à jour `README.md`
  - Section "Mode Laboratoire" ajoutée avec fonctionnalités
  - Cas d'usage pédagogiques (apprentissage, expérimentation, benchmark)
  - Lien vers waterfall_allocation.md
- [x] 6.3 Mettre à jour `product_vision.md`
  - MVP Mode 1 marqué comme "✅ Complété - 21 octobre 2025"
  - Roadmap mise à jour avec LOTs 1-6 complétés
  - 10 stratégies documentées
- [x] 6.4 Créer guide utilisateur : "Comment choisir sa stratégie ?"
  - Nouveau fichier `guide_utilisateur_strategies.md` (+500 lignes)
  - Description détaillée des 10 stratégies
  - Matrice de décision par profil utilisateur
  - 3 exemples concrets de comparaisons A/B
  - FAQ (9 questions)
- [x] 6.5 Mettre à jour `status.md`
  - Historique refactoring LOTs 1-6 ajouté
  - Prochain focus LOTs 7-8
- [x] 6.6 Mettre à jour `Docs/README.md`
  - Guide utilisateur ajouté à l'index
  - Section Quick Start enrichie
  - FAQ mise à jour

**Fichiers modifiés** :
- `Docs/waterfall_allocation.md` (+234 lignes) ✅
- `README.md` (+18 lignes) ✅
- `Docs/product_vision.md` (+9 lignes modifications) ✅
- `Docs/guide_utilisateur_strategies.md` (nouveau, +510 lignes) ✅
- `Docs/status.md` (+12 lignes) ✅
- `Docs/README.md` (+14 lignes) ✅

**Critère de succès** : ✅ Documentation complète, utilisateur peut comprendre le système et choisir sa stratégie

---

### **LOT 7 : Validation et Tests E2E** ✅
**Durée estimée** : 2-3 heures
**Objectif** : Valider le système complet sur tous les scénarios

#### Tâches
- [ ] 7.1 Tester les 6 stratégies sur les 7 scénarios (42 combinaisons)
  - `summerDefaults`
  - `winterDefaults`
  - `coldMorningDefaults`
  - `emptyBatteryDefaults`
  - `comfortEveningDefaults`
  - `evEveningDefaults`
  - `multiStressDefaults`
- [ ] 7.2 Comparer résultats avant/après refactoring
  - `ecs_first` (ancien) vs `ecsFirstStrategy` (nouveau) → doivent donner résultats cohérents
  - `battery_first` (ancien) vs `batteryFirstStrategy` (nouveau) → idem
- [ ] 7.3 Créer matrice de comparaison
  - Tableau : Stratégie × Scénario → KPIs (coût, autoconso, confort)
  - Identifier quelle stratégie gagne dans quel contexte
- [ ] 7.4 Vérifier conservation énergie sur toutes simulations
- [ ] 7.5 Tester UI avec toutes combinaisons A vs B
  - Vérifier graphiques cohérents
  - Vérifier KPIs calculés correctement

**Fichiers créés** :
- `tests/e2e_strategies_scenarios.test.ts` (nouveau, +100 lignes)
- `Docs/matrice_strategies_scenarios.md` (nouveau, tableau comparatif)

**Critère de succès** : Tous tests passent, matrice validée, pas de régression

---

### **LOT 8 : Nettoyage et Publication** 🚀
**Durée estimée** : 1 heure
**Objectif** : Finaliser, commit, push

#### Tâches
- [ ] 8.1 Supprimer ancien code mort
  - Anciennes méthodes de stratégies si obsolètes
  - Commentaires obsolètes
- [ ] 8.2 Vérifier tous les imports
- [ ] 8.3 Linter + formatter
  - `npm run lint`
  - Corriger warnings
- [ ] 8.4 Build final
  - `npm run build`
  - Vérifier aucune erreur
- [ ] 8.5 Commit et push
  - Messages de commit clairs
  - Référencer ce plan de refactoring
- [ ] 8.6 Tag version
  - `git tag v2.0.0-lab-mode`
  - "Mode Laboratoire Pédagogique activé"

**Critère de succès** : Code propre, build passe, code sur GitHub

---

## **LOT 9 : Mode Avancé (OPTIONNEL)** ⚙️🔬
**Durée estimée** : 6-8 heures
**Objectif** : Permettre à l'utilisateur de créer ses propres stratégies avec ordre personnalisé

### Pré-requis
- Lots 1-8 complétés et validés
- Retour utilisateur positif sur Mode Simple

### Tâches
- [ ] 9.1 Backend - Stratégie Custom
  ```typescript
  export interface CustomStrategy extends Strategy {
    type: 'custom';
    customOrder: DeviceType[];
    userLabel: string;
  }
  ```
- [ ] 9.2 UI - Builder de Stratégie
  - Drag & drop pour réorganiser ordre
  - Ou boutons ↑↓ pour monter/descendre
  - Nommer stratégie perso
  - Sauvegarder dans localStorage
- [ ] 9.3 UI - Mode Toggle Simple/Avancé
  - Bouton "Mode Avancé ⚙️"
  - Panel dépliable avec builder
- [ ] 9.4 Gestion des stratégies perso sauvegardées
  - Liste des stratégies custom
  - Éditer/Supprimer
  - Export/Import JSON
- [ ] 9.5 Tests UI Mode Avancé
  - Créer stratégie custom
  - Réorganiser ordre
  - Sauvegarder et recharger
  - Utiliser dans comparaison A vs B
- [ ] 9.6 Documentation Mode Avancé
  - Guide : "Créer sa propre stratégie"
  - Exemples de stratégies custom utiles

**Fichiers** :
- `src/core/strategy.ts` (+40 lignes)
- `src/ui/components/StrategyBuilder.tsx` (nouveau, +150 lignes)
- `src/ui/panels/StrategyPanel.tsx` (+80 lignes)
- `Docs/guide_mode_avance.md` (nouveau)

**Critère de succès** : Utilisateur peut créer, sauvegarder et utiliser ses stratégies perso

---

## Récapitulatif

### Timeline Estimée

| Lot | Description | Durée | Cumul |
|-----|-------------|-------|-------|
| 1 | Fonction allocation générique | 2-3h | 3h |
| 2 | Refactoring moteur | 3-4h | 7h |
| 3 | Interface Strategy | 2-3h | 10h |
| 4 | Stratégies pré-paramétrées | 3-4h | 14h |
| 5 | UI Mode Simple | 3-4h | 18h |
| 6 | Documentation | 2h | 20h |
| 7 | Validation E2E | 2-3h | 23h |
| 8 | Nettoyage & Publication | 1h | **24h** |
| **9** | **Mode Avancé (optionnel)** | **6-8h** | **32h** |

### Découpage en Jours de Travail

**Option 1 : Sprint de 3 jours** (8h/jour)
- Jour 1 : Lots 1-3 (Backend complet)
- Jour 2 : Lots 4-5 (Stratégies + UI)
- Jour 3 : Lots 6-8 (Doc + Validation + Publication)

**Option 2 : Étalé sur 2 semaines** (2-3h/jour)
- Semaine 1 : Lots 1-4 (Backend)
- Semaine 2 : Lots 5-8 (UI + Doc + Tests)

**Option 3 : Progressive** (flexible)
- Faire lot par lot quand disponible
- Chaque lot est autonome et testable
- Peut s'arrêter à tout moment sans casser le projet

---

## Risques et Mitigation

### Risques Identifiés

1. **Conservation énergie cassée** ⚠️
   - **Impact** : Tests échouent, résultats invalides
   - **Probabilité** : Moyenne
   - **Mitigation** : Tests unitaires sur `allocateByPriority()`, validation à chaque lot

2. **Régression sur stratégies existantes** ⚠️
   - **Impact** : Résultats différents avant/après
   - **Probabilité** : Faible (ordre sera identique)
   - **Mitigation** : Tests de comparaison avant/après (Lot 7.2)

3. **UI cassée** ⚠️
   - **Impact** : Utilisateur ne peut plus sélectionner stratégies
   - **Probabilité** : Faible
   - **Mitigation** : Tests manuels UI à chaque lot frontend

4. **Complexité pour l'utilisateur** ⚠️
   - **Impact** : Confusion, abandon outil
   - **Probabilité** : Faible (Mode Simple garde simplicité)
   - **Mitigation** : Documentation claire, descriptions explicites

5. **Scope creep** (déviation objectifs) ⚠️
   - **Impact** : Projet s'éternise, fatigue
   - **Probabilité** : Moyenne
   - **Mitigation** : Découpage strict en lots, Mode Avancé optionnel à la fin

---

## Critères de Succès Globaux

✅ **Technique** :
- Tous les tests passent (conservation énergie validée)
- Aucune régression sur scénarios existants
- Build réussit sans warnings

✅ **Fonctionnel** :
- 6 stratégies différentes disponibles
- Comparaison A vs B fonctionne avec ordres différents
- KPIs cohérents et interprétables

✅ **UX** :
- L'utilisateur comprend quelle stratégie fait quoi
- Ordre d'allocation visible et clair
- Descriptions aident à choisir

✅ **Documentation** :
- Waterfall expliqué clairement
- Guide utilisateur créé
- Vision produit respectée

---

## Décisions à Prendre Avant de Commencer

### Questions ouvertes

1. **Ordre par défaut pour stratégies existantes ?**
   - `ecs_first` actuel → devient `['baseload', 'ecs', 'battery', 'heating', 'pool', 'ev']` ?
   - Valider que c'est cohérent avec l'intention initiale

2. **Baseload toujours en premier ?**
   - Consensus : Oui (charge incompressible)
   - Doit-on permettre de le modifier en Mode Avancé ?
   - Recommandation : Non, toujours fixe

3. **Nombre de stratégies pré-paramétrées ?**
   - 6 proposées dans LOT 4
   - Trop ? Pas assez ?
   - Recommandation : Commencer avec 6, ajouter si besoin

4. **Compatibilité avec anciens exports JSON ?**
   - Les JSON exportés avant refactoring seront-ils lisibles ?
   - Recommandation : Oui, ajouter migration si nécessaire

5. **Mode Avancé vraiment nécessaire ?**
   - À décider après Lot 8
   - Attendre retour utilisateur sur Mode Simple

---

## Annexes

### A. Exemple de Stratégie (Code Complet)

```typescript
export const ecsFirstStrategy: Strategy = {
  id: 'ecs_first',
  label: 'ECS Prioritaire',
  description: 'Chauffe l\'ECS en priorité avant la batterie. Garantit confort eau chaude.',
  useCases: [
    'Famille nombreuse',
    'Hiver avec gros besoins ECS',
    'Deadline stricte (21h)'
  ],
  getAllocationOrder: (context: StrategyContext): DeviceType[] => {
    return ['baseload', 'ecs', 'battery', 'heating', 'pool', 'ev'];
  }
};
```

### B. Exemple de Tests

```typescript
describe('allocateByPriority', () => {
  it('should allocate respecting order', () => {
    const available = 10; // kW
    const demands = new Map([
      ['ecs', 5],
      ['battery', 8],
      ['heating', 3]
    ]);
    const order = ['ecs', 'battery', 'heating'];

    const result = allocateByPriority(available, demands, order);

    expect(result.get('ecs')).toBe(5); // Servi en premier
    expect(result.get('battery')).toBe(5); // Reste 5 kW
    expect(result.get('heating')).toBe(0); // Plus rien
  });
});
```

### C. Exemple UI StrategyCard

```tsx
const StrategyCard: React.FC<{ strategy: Strategy }> = ({ strategy }) => (
  <div className="rounded border border-slate-200 bg-slate-50 p-3 space-y-2">
    <h4 className="font-semibold text-slate-900">{strategy.label}</h4>
    <p className="text-sm text-slate-700">{strategy.description}</p>
    <div className="text-xs text-slate-600">
      <strong>Ordre :</strong>{' '}
      {strategy.getAllocationOrder({}).map((d, i) => (
        <span key={d}>
          {i > 0 && ' → '}
          <span className="capitalize">{d}</span>
        </span>
      ))}
    </div>
    <div className="text-xs text-slate-500">
      <strong>Cas d'usage :</strong> {strategy.useCases.join(', ')}
    </div>
  </div>
);
```

---

## Changelog

| Date | Auteur | Modifications |
|------|--------|---------------|
| 2025-10-20 | Claude | Création du plan initial |

---

**Prêt à commencer ?** 🚀
