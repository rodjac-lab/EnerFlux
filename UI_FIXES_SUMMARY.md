# Correctifs UI - Unification des Charts

**Date :** 2025-10-17
**Contexte :** Résolution des problèmes introduits lors de l'unification du thème des charts (PRs #44 et #45)

---

## 🎯 Objectifs

Corriger les inconsistances visuelles et structurelles dans les composants de charts après l'unification du thème, notamment :
- Hauteurs de charts incohérentes
- ChartFrame non utilisé partout
- Formatters dupliqués
- Double ResponsiveContainer

---

## ✅ Modifications Réalisées

### 1. **ChartFrame.tsx** - Système de hauteur flexible

**Fichier :** `src/ui/ChartFrame.tsx`

**Changements :**
- Ajout d'une prop `minHeight?: number` pour contraintes minimales
- Modification de `height` pour accepter `number | string`
- ResponsiveContainer utilise maintenant `height={height ?? '100%'}` au lieu d'une valeur fixe
- Ajout d'un style conditionnel pour `minHeight` sur le conteneur

**Impact :** Les charts s'adaptent maintenant correctement à leur conteneur parent tout en respectant une hauteur minimale.

---

### 2. **DhwPanel.tsx** - Migration vers ChartFrame

**Fichier :** `src/ui/charts/DhwPanel.tsx`

**Changements :**
- ✅ Wrapping avec `ChartFrame` au lieu de `<div className="h-56">`
- ✅ Ajout de titre et sous-titre : "ECS — stratégie {variant}" / "Température et puissance"
- ✅ Suppression de la fonction `formatHour` locale → utilisation de `fmt.time` de `chartTheme.ts`
- ✅ Refonte du tooltip `DhwTooltip` pour utiliser le style unifié (même apparence que `DefaultTooltip`)
- ✅ Application de la palette de couleurs unifiée (`metricColorMap.dhw`, `metricColorMap.battery`)
- ✅ Ajout de la police et tailles standardisées (`chartFont`)
- ✅ Suppression du `ResponsiveContainer` local (géré par ChartFrame)
- ✅ Standardisation des axes avec stroke colors cohérents

**Impact :** DhwPanel a maintenant une apparence cohérente avec les autres charts.

---

### 3. **DecisionsTimeline.tsx** - Migration vers ChartFrame

**Fichier :** `src/ui/charts/DecisionsTimeline.tsx`

**Changements :**
- ✅ Wrapping avec `ChartFrame` au lieu de `<div className="h-40">`
- ✅ Ajout de titre et sous-titre : "Timeline décisions — stratégie {variant}" / "Événements majeurs de la simulation"
- ✅ Suppression de la fonction `formatHour` locale → utilisation de `fmt.time`
- ✅ Refonte du tooltip `DecisionTooltip` avec style unifié
- ✅ Application de `metricColorMap.grid` pour la référence hover
- ✅ Ajout de styles de police pour les labels de ReferenceLine
- ✅ Suppression du `ResponsiveContainer` local
- ✅ Suppression des éléments `sr-only` redondants (decision-count, deadline-hour) devenus inutiles

**Impact :** DecisionsTimeline s'intègre visuellement avec les autres charts de la layout A/B.

---

### 4. **Standardisation des hauteurs**

**Fichiers modifiés :**
- `src/ui/charts/BatterySocChart.tsx` : `height={260}` → `minHeight={240}`
- `src/ui/charts/EnergyFlowsChart.tsx` : `height={320}` → `minHeight={280}`
- `src/ui/charts/PVLoadChart.tsx` : `height={320}` → `minHeight={280}`
- `src/ui/charts/DhwPanel.tsx` : `minHeight={240}`
- `src/ui/charts/DecisionsTimeline.tsx` : `minHeight={180}`

**Rationale :**
- Utilisation de `minHeight` au lieu de `height` fixe pour permettre une adaptation flexible
- Harmonisation des hauteurs par type de chart (principaux: 240-280px, timeline: 180px)
- Les charts peuvent maintenant grandir si l'espace parent le permet

**Impact :** Alignement visuel cohérent dans la comparaison A/B, meilleure utilisation de l'espace.

---

## 📊 Résultats

### Build
✅ **Build réussi** sans erreurs ni warnings TypeScript
```bash
npm run build
✓ 871 modules transformed.
✓ built in 7.46s
```

### Compatibilité
✅ **Rétrocompatibilité maintenue** : Tous les charts existants continuent de fonctionner
✅ **Pas de breaking changes** dans les APIs publiques

### Performance
- Suppression des doubles `ResponsiveContainer` → réduction overhead de rendu
- Memoization existante préservée dans tous les composants

---

## 🎨 Cohérence Visuelle

Tous les charts utilisent maintenant :

| Élément | Valeur |
|---------|--------|
| Police | `Inter, ui-sans-serif, system-ui` |
| Taille titre | 16px |
| Taille axes | 12px |
| Taille ticks | 11px |
| Couleur grid | `#E2E8F0` |
| Couleur axes | `#CBD5F5` |
| Couleur texte | `#475569` |
| Border tooltip | `border-slate-200` |
| Background tooltip | `bg-white/95` |

---

## 📝 Recommandations Futures

### Court terme
1. **Documenter le pattern** : Ajouter une section dans `Docs/tech_guidelines.md` expliquant comment créer un nouveau chart
2. **Tests visuels** : Ajouter des snapshots pour valider l'alignement des charts dans `tests/ui_meta_alignment_ab.test.tsx`

### Moyen terme
3. **Optimisation** : Considérer le lazy loading des charts non visibles dans ABCompareLayout
4. **Refactoring tooltips** : Unifier complètement tous les tooltips pour utiliser `DefaultTooltip` avec un système de render props

### Long terme
5. **Thème dynamique** : Préparer le terrain pour un système de thème dark/light
6. **Responsive breakpoints** : Ajuster les hauteurs minimales en fonction des breakpoints Tailwind

---

## 🔗 Fichiers Modifiés

- `src/ui/ChartFrame.tsx` (système de hauteur flexible)
- `src/ui/charts/DhwPanel.tsx` (migration complète)
- `src/ui/charts/DecisionsTimeline.tsx` (migration complète)
- `src/ui/charts/BatterySocChart.tsx` (standardisation hauteur)
- `src/ui/charts/EnergyFlowsChart.tsx` (standardisation hauteur)
- `src/ui/charts/PVLoadChart.tsx` (standardisation hauteur)

---

## 🚀 Déploiement

Les modifications sont prêtes pour :
- ✅ Merge vers `main`
- ✅ Déploiement sur GitHub Pages
- ✅ Utilisation immédiate

**Commande de test local :**
```bash
npm run dev
# Ouvrir http://localhost:5173/EnerFlux/
```

**Commande de build production :**
```bash
npm run build
```

---

## 💡 Notes Techniques

### Pourquoi `minHeight` au lieu de `height` ?
- Permet aux charts de grandir si l'espace parent est plus grand
- Garantit une hauteur minimale lisible
- Compatible avec les layouts flexbox/grid de Tailwind

### Pourquoi supprimer les `formatHour` locales ?
- Évite la duplication de code
- Garantit un formatage cohérent dans toute l'application
- Facilite la maintenance (1 seul endroit à modifier)

### Pourquoi refondre les tooltips ?
- Cohérence visuelle entre tous les charts
- Accessibilité : utilisation de `fontFamily` explicite
- Meilleure lisibilité avec `tabular-nums` pour les valeurs numériques

---

**Auteur :** Claude (Audit et corrections UI)
**Review :** À faire par l'équipe produit
