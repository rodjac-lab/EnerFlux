# Mode Coach Prédictif — Documentation

**Version** : 1.0 (Phase 5 complétée)
**Statut** : 🎯 83% complet (Phase 6 en cours)
**Date** : Octobre 2025

---

## 📖 Vue d'Ensemble

Le **Mode Coach Prédictif** est un système de pilotage énergétique intelligent qui **anticipe** la semaine à venir pour optimiser l'autoconsommation PV en fonction de :

- 🌤️ **Prévisions météo** (ensoleillement, production PV)
- 💰 **Tarifs dynamiques** (Tempo BLEU/BLANC/ROUGE, heures pleines/creuses)
- 🏠 **Besoins du foyer** (deadlines ECS, sessions VE, confort chauffage)

**Gains attendus** : 20-35% d'économies vs stratégies réactives (Mode Laboratoire)

---

## 🎯 Pour Qui ?

### 👤 Utilisateurs Finaux
→ **[guide_utilisateur.md](guide_utilisateur.md)** *(À créer Phase 6)*
Guide complet pour comprendre et utiliser le Mode Coach

### 👨‍💻 Contributeurs Techniques
→ **[architecture.md](architecture.md)**
Architecture technique complète du système MPC

### 🎨 Product Owners
→ **[vision.md](vision.md)**
Vision produit, personas, cas d'usage

---

## 📚 Documentation par Thème

### Vision Produit
- **[vision.md](vision.md)** : Vision complète, problèmes résolus, objectifs

### Architecture Technique
- **[architecture.md](architecture.md)** :
  - Système MPC (Model Predictive Control)
  - 4 heuristiques d'optimisation
  - Intégration APIs météo/tarifs
  - Narrateur IA (6 analyseurs d'insights)
  - Architecture complète 1594 lignes

### Implémentation par Phase

| Phase | Document | Contenu |
|-------|----------|---------|
| **Phase 1-2** | [implementation/phase1_2_implementation_summary.md](implementation/phase1_2_implementation_summary.md) | MVP MPC avec presets (218 lignes) |
| **Phase 3** | [implementation/phase3_implementation_summary.md](implementation/phase3_implementation_summary.md) | Narrateur IA (370 lignes) |
| **Phase 4** | [implementation/phase4_implementation_summary.md](implementation/phase4_implementation_summary.md) | Intégration APIs réelles (435 lignes) |
| **Phase 5** | [implementation/phase5_implementation_summary.md](implementation/phase5_implementation_summary.md) | UI complète (370 lignes) |
| **Phase 5 UI** | [implementation/phase5_ui_design.md](implementation/phase5_ui_design.md) | Spécifications UI détaillées (961 lignes) |

---

## 🚀 Quick Start

### Je veux comprendre le Mode Coach
1. Lire **[vision.md](vision.md)** (20 min) - Comprendre le problème et la solution
2. Tester dans l'UI : Onglet **"Coach Prédictif"** sur [GitHub Pages](https://rodjac-lab.github.io/EnerFlux/)
3. Lire **[guide_utilisateur.md](guide_utilisateur.md)** *(Phase 6)* - Guide d'utilisation complet

### Je veux contribuer au développement
1. Lire **[architecture.md](architecture.md)** (1h) - Architecture technique complète
2. Explorer le code : `src/core/mpc.ts`, `src/ui/coach/`
3. Consulter les résumés d'implémentation : `implementation/phase*.md`

### Je veux comprendre les choix techniques
1. Lire **[architecture.md](architecture.md)** sections :
   - "Heuristiques MPC" (4 règles d'optimisation)
   - "Narrateur IA" (6 analyseurs d'insights)
   - "Providers APIs" (météo + tarifs)
2. Voir les tests : `tests/mpc_weekly_simulation.test.ts`

---

## 📊 Progression Phase 6

**Statut actuel** : Phase 5/6 complétée (83%)

**Restant Phase 6** :
- [ ] Guide utilisateur Mode Coach
- [ ] Export JSON simulation semaine
- [ ] Cache prévisions (localStorage, TTL 1h)
- [ ] Exemples cas d'usage (3 personas)
- [ ] Tests E2E complets
- [ ] Optimisations performance (< 5s pour 7 jours)

---

## 🔗 Liens Utiles

**Code source** :
- [src/core/mpc.ts](../../src/core/mpc.ts) - API publique MPC
- [src/core/aiNarrative.ts](../../src/core/aiNarrative.ts) - Narrateur IA
- [src/ui/coach/](../../src/ui/coach/) - Composants UI Mode Coach
- [src/data/providers/](../../src/data/providers/) - Providers météo/tarifs

**Documentation connexe** :
- [01-vision/development_plan.md](../01-vision/development_plan.md) - Plan S6 complet
- [02-mode-laboratoire/](../02-mode-laboratoire/) - Mode Laboratoire (stratégies réactives)
- [04-technique/](../04-technique/) - Guidelines techniques

**Démo live** :
- [GitHub Pages](https://rodjac-lab.github.io/EnerFlux/) - Onglet "Coach Prédictif"

---

## 💡 Concepts Clés

### Model Predictive Control (MPC)
Système d'optimisation qui **regarde en avant** (24-48h) pour prendre des décisions optimales, contrairement aux stratégies réactives qui décident uniquement sur l'instant présent.

### 4 Heuristiques MPC
1. **Tempo Guard** : Réserver batterie si jour ROUGE/BLANC à venir
2. **Weather Anticipation** : Différer charge ECS si journée ensoleillée demain
3. **EV Deadline** : Sécuriser charge VE avant départ
4. **Night Charge** : Charger batterie en HC si jour cher demain

### Narrateur IA
Système d'analyse post-simulation qui génère des **insights pédagogiques** expliquant les décisions MPC :
- 💰 Opportunités (économies réalisées)
- ⚠️ Alertes (risques évités)
- 🏆 Réussites (objectifs atteints)
- 💡 Conseils (optimisations possibles)

---

## ❓ FAQ

### Quelle différence avec Mode Laboratoire ?
**Mode Laboratoire** : Compare 10 stratégies **réactives** (décisions sur instant présent)
**Mode Coach** : Stratégie **prédictive** (anticipe 24-48h, gains +20-35%)

### Le MPC fonctionne-t-il avec mes données réelles ?
Oui ! Phase 4 intègre :
- **OpenWeather** : Prévisions météo 15 jours (API payante)
- **PVGIS** : Données solaires historiques (API gratuite EU)
- **RTE Tempo** : Couleurs Tempo officielles J+1 (API gratuite)

Avec fallback automatique vers presets si APIs indisponibles.

### Comment sont générés les insights IA ?
6 analyseurs détectent automatiquement :
- Économies Tempo (jours ROUGE évités)
- Anticipations météo (PV prévu utilisé)
- Charges nocturnes stratégiques
- Deadline ECS/VE respectées
- Exports PV évités
- Self-consumption optimisé

### Puis-je tester sans API keys ?
Oui ! Mode Mock avec 3 presets hebdo (ensoleillé, nuageux, mixte).

---

**Auteurs** : Rodolphe + Claude (Anthropic)
**Licence** : Open Source
**Contact** : [GitHub Issues](https://github.com/rodjac-lab/EnerFlux/issues)
