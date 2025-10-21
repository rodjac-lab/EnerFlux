# Guide Utilisateur — Stratégies d'Allocation EnerFlux

**Version** : 1.0
**Date** : 21 octobre 2025
**Audience** : Utilisateurs du Mode Laboratoire Pédagogique

---

## Introduction

Ce guide vous aide à **choisir et comparer** les stratégies d'allocation du surplus photovoltaïque dans EnerFlux.

### Qu'est-ce qu'une stratégie ?

Une stratégie définit **l'ordre de priorité** pour distribuer votre production PV entre vos équipements :
- Chauffe-eau (ECS)
- Batterie
- Chauffage
- Piscine
- Véhicule électrique (VE)

**Exemple** :
- Stratégie A : "Base → **ECS** → Batterie" ⇒ Le chauffe-eau est servi en priorité
- Stratégie B : "Base → **Batterie** → ECS" ⇒ La batterie est chargée en premier

### Pourquoi comparer ?

Changer l'ordre d'allocation peut avoir un **impact majeur** sur :
- 💰 Vos coûts énergétiques (autoconsommation vs import réseau)
- 🌡️ Votre confort (disponibilité eau chaude, température maison)
- 🔋 La durée de vie de votre batterie (nombre de cycles)
- ♻️ Votre autonomie énergétique

---

## Les 10 Stratégies Disponibles

### 1. Sans pilotage (heures creuses) — `no_control_offpeak`

**Ordre** : Base → Batterie → Chauffage → Piscine → VE → ECS

**Description** : Chauffe-eau classique heures creuses (2h-6h). Le surplus PV est exporté ou stocké dans la batterie, mais **ne chauffe jamais l'ECS**.

**Cas d'usage** :
- Installation existante sans pilotage intelligent
- Baseline de référence pour mesurer les gains d'optimisation
- Tarif heures creuses très attractif (< 0.10 €/kWh)

**Résultats attendus** :
- ❌ Autoconsommation PV faible (surplus exporté)
- ❌ Import réseau la nuit pour chauffer l'ECS
- ✅ Simple et fiable (pas de logique complexe)

**Exemple** : Maison équipée en 2015 avec chauffe-eau HC classique, avant ajout du PV.

---

### 2. Sans pilotage (thermostat) — `no_control_hysteresis`

**Ordre** : Base → Batterie → Chauffage → Piscine → VE → ECS

**Description** : Thermostat simple ON/OFF (démarre à 48°C, arrête à 60°C). Pas d'optimisation du surplus PV.

**Cas d'usage** :
- Installation basique avec thermostat mécanique
- Comparaison avant/après installation PV
- Baseline pour mesurer ROI du pilotage intelligent

**Résultats attendus** :
- ⚠️ Autoconsommation aléatoire (thermostat indépendant du PV)
- ❌ Import réseau possible même avec surplus PV disponible
- ⚠️ Yo-yo thermique (cycles ON/OFF fréquents)

**Exemple** : Chauffe-eau installé en 2010, thermostat réglé à 55°C, sans pilotage connecté.

---

### 3. ECS prioritaire (brut) — `ecs_first`

**Ordre** : Base → **ECS** → Batterie → Chauffage → Piscine → VE

**Description** : Le chauffe-eau reçoit **tout le surplus PV disponible en priorité**, avant la batterie.

**Cas d'usage** :
- Famille nombreuse (4+ personnes, puisage important)
- Hiver rigoureux (ballon refroidit vite, besoin de réchauffer souvent)
- Deadline stricte (douches le soir à 19h-20h)
- Batterie petite ou déjà chargée

**Résultats attendus** :
- ✅ Confort ECS maximal (température toujours élevée)
- ✅ Réduction import réseau pour ECS
- ⚠️ Batterie moins chargée (moins de réserve pour la soirée)
- ⚠️ Cycles ON/OFF fréquents si PV variable (nuages)

**Exemple** : Famille de 5 personnes, ballon 300L, douches le soir. Besoin d'eau chaude garanti.

---

### 4. ECS + hystérésis — `ecs_hysteresis`

**Ordre** : Base → **ECS** → Batterie → Chauffage → Piscine → VE

**Description** : Comme `ecs_first`, mais avec **hystérésis** pour éviter les yo-yo thermiques. Laisse le ballon refroidir de 5-8°C avant de relancer.

**Cas d'usage** :
- Même profil que `ecs_first`, mais PV variable (passages nuageux)
- Besoin de limiter les cycles ON/OFF (durée de vie résistance)
- Ballon avec bonne isolation (perd < 1°C/h)

**Résultats attendus** :
- ✅ Confort ECS élevé
- ✅ Moins de cycles ON/OFF (meilleure pour la résistance)
- ⚠️ Température peut descendre de quelques °C avant relance
- ✅ Meilleure utilisation du surplus PV (attend une fenêtre stable)

**Exemple** : Famille de 4, ballon bien isolé, PV sur toit avec ombrage partiel l'après-midi.

---

### 5. ECS + préchauffe deadline — `deadline_helper`

**Ordre** : Base → **ECS** → Batterie → Chauffage → Piscine → VE

**Description** : Ajoute une **préchauffe intelligente avant deadline** (ex: 2h avant les douches du soir). Combine hystérésis + anticipation.

**Cas d'usage** :
- Horaires de douche réguliers (18h-20h)
- Production PV forte le matin/midi, faible l'après-midi
- Besoin de garantie température au moment clé

**Résultats attendus** :
- ✅ Confort garanti à la deadline (eau chaude disponible)
- ✅ Utilisation optimale du surplus PV en journée
- ✅ Moins d'import réseau en soirée (ballon déjà chaud)
- ⚠️ Peut importer du réseau 1-2h avant deadline si ballon trop froid

**Exemple** : Famille avec douches entre 19h-20h, PV orienté sud-est (pic à 10h-14h).

---

### 6. Batterie prioritaire — `battery_first`

**Ordre** : Base → **Batterie** → ECS → Chauffage → Piscine → VE

**Description** : La batterie est chargée **en priorité absolue**, l'ECS reçoit le surplus restant.

**Cas d'usage** :
- Tarif heures pleines très élevé (> 0.25 €/kWh)
- Pointe de consommation importante le soir (cuisine, TV, etc.)
- Batterie grande capacité (> 10 kWh)
- Ballon ECS bien dimensionné (peut attendre quelques heures)

**Résultats attendus** :
- ✅ Réserve batterie maximale pour la soirée
- ✅ Réduction forte de l'import réseau en heures pleines
- ⚠️ Confort ECS réduit (chauffe plus lentement)
- ⚠️ Peut nécessiter import réseau pour ECS en fin d'après-midi

**Exemple** : Maison avec batterie 15 kWh, tarif HP/HC (0.30 €/0.15 €), pointe soirée 3-4 kW.

---

### 7. Mix (seuil SOC) — `mix_soc_threshold`

**Ordre** : Base → **Batterie OU ECS** (selon SOC) → ...

**Description** : Aiguillage dynamique selon le niveau de charge de la batterie :
- SOC < seuil (ex: 50%) ⇒ Priorité batterie
- SOC ≥ seuil ⇒ Priorité ECS

**Cas d'usage** :
- Compromis batterie/confort
- Production PV variable (mi-saison)
- Besoin de flexibilité selon conditions

**Résultats attendus** :
- ✅ Équilibre batterie/ECS
- ✅ Adaptabilité selon production PV
- ⚠️ Réglage du seuil critique (40%, 50%, 60%?)
- ✅ Bon compromis général

**Exemple** : Printemps/automne, production PV moyenne, besoin d'équilibre coût/confort.

---

### 8. Réserve soirée — `reserve_evening`

**Ordre** : Base → **Batterie** → ECS → Chauffage → Piscine → VE

**Description** : Constitue une **réserve batterie avant 18h**, puis bascule vers ECS prioritaire.

**Cas d'usage** :
- Pointe de consommation soirée (18h-22h)
- Production PV nulle après 18h (hiver)
- Besoin de réserve minimale (ex: 5 kWh pour la soirée)

**Résultats attendus** :
- ✅ Réserve garantie pour la pointe soirée
- ✅ ECS chauffe en priorité après 18h si surplus
- ⚠️ Confort ECS réduit en journée (attente)
- ✅ Autonomie soirée maximale

**Exemple** : Hiver, famille avec pointe 18h-21h (cuisine, éclairage, TV), PV nul après 17h.

---

### 9. VE départ sécurisé — `ev_departure_guard`

**Ordre** : Base → Batterie → **VE** → ECS → Chauffage → Piscine

**Description** : Préserve une marge batterie avant la fenêtre de charge VE, puis accélère la charge VE avant le départ (ex: 7h).

**Cas d'usage** :
- Véhicule électrique avec départ matinal régulier
- Besoin de charge complète pour trajet
- Production PV insuffisante le matin

**Résultats attendus** :
- ✅ Charge VE garantie au départ
- ✅ Préserve réserve batterie pour nuit
- ⚠️ ECS et chauffage sacrifiés si nécessaire
- ✅ Planification départ fiable

**Exemple** : VE utilisé quotidiennement, départ 7h30, trajet 80 km aller, besoin de 20 kWh.

---

### 10. Priorité multi-équipements — `multi_equipment_priority`

**Ordre** : Base → **Dynamique** (selon urgence confort)

**Description** : Arbitre entre ECS, chauffage, VE et piscine selon leur **urgence confort** respective (température, deadline, etc.).

**Cas d'usage** :
- Installation complexe (tous les équipements présents)
- Besoin d'optimisation fine
- Utilisateur expert

**Résultats attendus** :
- ✅ Optimisation multi-critères
- ✅ Adaptabilité maximale
- ⚠️ Complexité élevée (difficile à prédire)
- ✅ Performance théorique élevée

**Exemple** : Maison équipée PV, batterie, ECS, chauffage, piscine ET VE.

---

## Comment Choisir Sa Stratégie ?

### Étape 1 : Définir vos priorités

**Posez-vous ces questions** :
1. Quel est mon besoin principal ? (confort vs économie)
2. Quelle est ma consommation soirée ? (baseload 18h-22h)
3. Ai-je des horaires fixes ? (douches, départ VE)
4. Mon tarif est-il HP/HC ou flat ?
5. Ma batterie est-elle grande ou petite ?

### Étape 2 : Matrice de décision rapide

| Profil | Stratégie recommandée | Pourquoi |
|--------|----------------------|----------|
| Famille nombreuse, douches 19h | `deadline_helper` | Confort ECS garanti |
| Tarif HP/HC élevé, pointe soirée | `battery_first` ou `reserve_evening` | Autonomie soirée |
| VE quotidien, départ 7h | `ev_departure_guard` | Charge VE fiable |
| Installation simple, découverte | `ecs_first` | Simple et efficace |
| Compromis équilibré | `mix_soc_threshold` | Flexibilité |
| Baseline de référence | `no_control_offpeak` | Mesure gains |

### Étape 3 : Comparer deux stratégies

**Mode Laboratoire** : Lancez une comparaison A vs B

1. Choisissez un **scénario** représentatif de votre situation :
   - "Hiver rigoureux" si vous êtes au nord
   - "Été ensoleillé" si vous êtes au sud
   - "Matin froid" pour une journée type hiver

2. Sélectionnez **Stratégie A** (ex: `ecs_first`)

3. Sélectionnez **Stratégie B** (ex: `battery_first`)

4. Cliquez **Simuler** et observez :
   - **Ordre d'allocation** : Qui est servi en premier ?
   - **KPIs** : Coûts, autoconsommation, confort
   - **Graphiques** : Flux énergétiques, SOC batterie, température ECS

### Étape 4 : Interpréter les résultats

#### Indicateurs clés :

**Autoconsommation** (%):
- > 80% ⇒ Excellent (peu d'export, peu d'import)
- 60-80% ⇒ Bon
- < 60% ⇒ Surplus mal utilisé ou production insuffisante

**Coût net** (€):
- Négatif ⇒ Vous gagnez de l'argent (export > import)
- Proche de 0 ⇒ Équilibre
- Positif ⇒ Vous payez (import > export)

**Confort ECS** (% temps > Tcible):
- > 90% ⇒ Excellent
- 70-90% ⇒ Acceptable
- < 70% ⇒ Risque d'inconfort (eau tiède)

**Cycles batterie** (nombre):
- < 0.5 cycle/jour ⇒ Excellent (durée de vie préservée)
- 0.5-1 cycle/jour ⇒ Normal
- > 1 cycle/jour ⇒ Usure accélérée

---

## Exemples de Comparaisons

### Exemple 1 : ECS vs Batterie — Hiver rigoureux

**Contexte** :
- Scénario : "Hiver rigoureux (grande conso chauffage)"
- Production PV : Faible (3-4 kWh/jour)
- Consommation : Élevée (chauffage 8 kWh + ECS 4 kWh + base 12 kWh)

**Stratégie A : `ecs_first`**
- Ordre : Base → **ECS** → Batterie → Chauffage
- Résultats :
  - Autoconsommation : 65%
  - Coût : +3.20 €
  - Confort ECS : 85%
  - Cycles batterie : 0.8

**Stratégie B : `battery_first`**
- Ordre : Base → **Batterie** → ECS → Chauffage
- Résultats :
  - Autoconsommation : 62%
  - Coût : +3.45 €
  - Confort ECS : 70%
  - Cycles batterie : 0.9

**Conclusion** : En hiver rigoureux, `ecs_first` est meilleure :
- ✅ Coût réduit (-0.25 €/jour)
- ✅ Confort ECS supérieur (+15%)
- ✅ Production PV trop faible pour charger batterie ET ECS

---

### Exemple 2 : Réserve soirée — Été ensoleillé

**Contexte** :
- Scénario : "Été ensoleillé (PV fort, usage modéré)"
- Production PV : Forte (15-20 kWh/jour)
- Consommation : Modérée (base 8 kWh + ECS 3 kWh + piscine 2 kWh)

**Stratégie A : `ecs_first`**
- Ordre : Base → **ECS** → Batterie
- Résultats :
  - Autoconsommation : 92%
  - Coût : -1.80 € (gain export)
  - Confort ECS : 98%
  - Cycles batterie : 0.3

**Stratégie B : `reserve_evening`**
- Ordre : Base → **Batterie** (jusqu'à 18h) → ECS
- Résultats :
  - Autoconsommation : 95%
  - Coût : -1.20 € (moins d'export, plus d'autoproduction soirée)
  - Confort ECS : 90%
  - Cycles batterie : 0.6

**Conclusion** : En été, `reserve_evening` peut être meilleure si :
- Pointe de consommation soirée importante
- Tarif export faible (< 0.10 €/kWh)
- Préférence autonomie vs revenu export

---

### Exemple 3 : Baseline vs Optimisé — Printemps

**Contexte** :
- Scénario : "Printemps (PV moyen)"
- Production PV : Moyenne (10 kWh/jour)
- Consommation : Moyenne (base 10 kWh + ECS 3 kWh)

**Stratégie A : `no_control_offpeak` (baseline)**
- Ordre : Base → Batterie → ... → ECS (jamais de PV)
- Résultats :
  - Autoconsommation : 55%
  - Coût : +1.20 €
  - Confort ECS : 95% (heures creuses fiable)
  - Cycles batterie : 0.4

**Stratégie B : `ecs_hysteresis` (optimisé)**
- Ordre : Base → **ECS** → Batterie
- Résultats :
  - Autoconsommation : 78%
  - Coût : +0.40 €
  - Confort ECS : 92%
  - Cycles batterie : 0.5

**Conclusion** : Le pilotage PV apporte :
- ✅ **Gain : 0.80 €/jour** (292 €/an)
- ✅ Autoconsommation +23% (moins de dépendance réseau)
- ⚠️ Confort ECS légèrement inférieur (-3%, acceptable)

---

## Questions Fréquentes

### Q1 : Puis-je créer ma propre stratégie personnalisée ?

**Réponse** : Pas encore dans le Mode Laboratoire v1.0. Cette fonctionnalité est prévue pour le **Mode Avancé** (LOT 9, futur).

Pour l'instant, vous pouvez :
- Tester les 10 stratégies existantes
- Ajuster le seuil SOC pour `mix_soc_threshold` (10% à 100%)
- Comparer différentes combinaisons A vs B

### Q2 : Quelle est la différence entre les stratégies qui ont le même ordre ?

**Réponse** : Certaines stratégies partagent le même **ordre d'allocation** mais diffèrent par leur **logique de décision** :

**Exemple** : `ecs_first`, `ecs_hysteresis`, `deadline_helper`
- **Ordre identique** : Base → ECS → Batterie
- **Logique différente** :
  - `ecs_first` : Chauffe dès que PV disponible
  - `ecs_hysteresis` : Attend que température baisse de 5-8°C
  - `deadline_helper` : Ajoute préchauffe 2h avant deadline

### Q3 : Pourquoi ma stratégie préférée n'est-elle pas toujours la meilleure ?

**Réponse** : Les performances d'une stratégie **dépendent fortement du scénario** :
- `battery_first` est excellente en hiver avec tarif HP/HC élevé
- `ecs_first` est meilleure en été avec famille nombreuse
- `reserve_evening` est optimale si pointe soirée importante

**Conseil** : Testez votre stratégie sur **plusieurs scénarios** représentatifs de votre année (hiver, été, mi-saison).

### Q4 : Combien de cycles batterie sont acceptables ?

**Réponse** : Règle générale pour batteries lithium-ion résidentielles :
- **< 0.5 cycle/jour** (< 180 cycles/an) ⇒ Excellent, durée de vie > 15 ans
- **0.5-1 cycle/jour** (180-365 cycles/an) ⇒ Normal, durée de vie 10-15 ans
- **> 1 cycle/jour** (> 365 cycles/an) ⇒ Usure accélérée, vérifier garantie constructeur

**Note** : Les batteries modernes (LFP) tolèrent mieux les cycles (> 6000 cycles garantis).

### Q5 : Mon confort ECS est à 65%, est-ce grave ?

**Réponse** : Cela dépend de votre tolérance et de votre profil :
- **65%** = Eau chaude disponible 2/3 du temps
- Si douches uniquement le soir (19h-20h) : Vérifiez que l'ECS est chaude **à ce moment précis** (regardez le graphique température)
- Si douches réparties sur la journée : 65% peut être insuffisant, testez `deadline_helper` ou `ecs_hysteresis`

**Astuce** : Regardez le graphique **DhwPanel** pour voir les moments de refroidissement. Ajustez votre stratégie en conséquence.

### Q6 : Que faire si mes coûts sont toujours positifs (je paie) ?

**Réponse** : C'est normal si :
- Votre production PV < consommation totale (hiver)
- Tarif import élevé et export faible
- Batterie trop petite pour couvrir la pointe soirée

**Solutions** :
1. Testez `battery_first` ou `reserve_evening` pour maximiser autonomie soirée
2. Vérifiez que vous utilisez le bon scénario (production PV réaliste)
3. Considérez augmenter la capacité batterie (simulation avec paramètres modifiés)
4. Si tarif HC disponible, testez `no_control_offpeak` (peut être plus économique)

---

## Aller Plus Loin

### Documentation Technique

- [waterfall_allocation.md](./waterfall_allocation.md) : Explication détaillée du système d'allocation
- [algorithms_playbook.md](./algorithms_playbook.md) : Détail des 10 stratégies
- [product_vision.md](./product_vision.md) : Vision produit et roadmap

### Contribuer

Si vous avez des **idées de nouvelles stratégies**, ouvrez une issue GitHub :
- Décrivez le cas d'usage
- Proposez l'ordre d'allocation
- Expliquez la logique de décision

Nous évaluerons l'ajout dans une prochaine version !

---

**Auteur** : Rodolphe + Claude (Anthropic)
**Version** : 1.0
**Date** : 21 octobre 2025
