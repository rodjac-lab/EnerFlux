# Plan S5 — Intégration multi-équipements

## Objectifs
- Doter les stubs Chauffage, Pompe de piscine et Borne VE d’un modèle énergétique simple mais cohérent avec le moteur.
- Étendre les stratégies pour arbitrer le surplus PV entre plusieurs demandes tout en respectant confort et contraintes.
- Déployer des presets/tests couvrant hiver rigoureux, saison piscine et soirées recharge VE.

## Chantier 1 — Chauffage électrique modulable
1. **Modèle thermique** :
   - Capacité thermique logement (kWh/K) + pertes linéaires `UA_home`.
   - Température intérieure suivie dans `state()` ; consigne jour/nuit configurable.
2. **Planification** :
   - Demande `need: 'toHeat'` si `T_int < consigne - hysteresis`.
   - Offre possible (déstockage) si `T_int > consigne + marge` pour simuler délestage ? (optionnel S5.1).
3. **Intégration UI** :
   - Nouveau panneau « Chauffage » avec consigne jour/nuit, puissance, capacité thermique.
   - Help tooltips détaillant les hypothèses.
4. **Tests** :
   - Cas statique (aucune chauffe) vs dynamique (remontée en température) validés par équations `ΔT = P * dt / C_th`.

## Chantier 2 - Pompe de piscine (livre)
1. **Modèle** : consommation fixe `P_pump` avec durée quotidienne minimale `h_min` et créneaux préférés.
2. **Planification** :
   - Générer des requêtes `toLoad` dans les créneaux préférés ; sinon rattrapage en fin de journée pour respecter `h_min`.
3. **UI & presets** :
   - Paramètres : puissance, durée cible, fenêtres (ex: 10h-16h). Preset été avec fort PV.
4. **Tests** :
   - Vérifier qu’on atteint bien `h_min` même sans surplus (import réseau).

## Chantier 3 — Borne VE
1. **Modèle** : sessions de charge paramétrées par `arrivalHour`, `departureHour`, `energyNeed_kWh`.
2. **Planification** :
   - Demande `toLoad` répartie sur la fenêtre via puissance max `P_max` avec rattrapage final.
   - Hook stratégie pour réserver SOC batterie si import prohibitif.
3. **UI & presets** :
   - Formulaire pour programmer une session ; preset « Soirée VE » (arrivée 18h, départ 7h).
4. **Tests** :
   - Vérifier que l’énergie demandée est livrée dans la fenêtre, importer sinon.

## Chantier 4 — Stratégie multi-équipements & KPI confort (S5.4)
1. **Analyse / cadrage**
   - Cartographier les demandes `toHeat`, `toLoad`, `toStore` émises par chaque device (ECS, chauffage, piscine, VE).
   - Lister les conflits courants (ex : PV limité en matinée vs chauffage + ECS) pour définir les priorités attendues.
   - Valider avec produit que la stratégie cible respecte :
     1. confort ECS prioritaire aux deadlines,
     2. maintien température intérieure dans l’hystérésis,
     3. respect des fenêtres VE/piscine.
2. **Conception de la stratégie `multi_equipment_priority`**
   - Étendre `core/strategy.ts` avec un ordonnanceur qui :
     - réserve la puissance pour ECS puis chauffage selon écart à la consigne,
     - exploite le surplus PV pour VE/piscine en respectant leurs fenêtres,
     - bascule sur import réseau uniquement quand toutes les demandes critiques sont servies.
   - Ajouter paramètres de pondération (ex : `comfort_margin_kW`, priorités par device) documentés.
   - Préparer pseudo-code + exemples dans ce fichier avant implémentation.
   - Priorités implémentées : ECS (-10) > chauffage (palier 1.5 K / 0.8 K / appel chauffage) > VE (urgence session active, fenêtre imminente) > piscine (fenêtre active / rattrapage) > batterie / autres.
3. **Adaptations moteur / données**
   - Vérifier que `core/engine.ts` expose les signaux nécessaires (charges en attente, SOC batterie, import max).
   - Étendre `EnvContext`/`DeviceState` si besoin pour transporter les marges de confort.
   - Ajouter nouveaux presets multi-équipements (hiver + soirée VE) pour tester la stratégie (preset `MultiStress`).
4. **KPIs confort**
   - Définir :
     - `heating_comfort_ratio` = % pas horaires avec `T_int >= consigne - marge`.
     - `pool_filtration_completion` = heures réalisées / heures cibles.
     - `ev_charge_completion` (existe déjà) : vérifier cohérence et intégrer dans récap.
   - Implémenter le calcul dans `core/engine.ts`/`core/kpis.ts` + exposition côté UI (KPIs + tooltips).
   - Ajouter tests Vitest couvrant cas limites (pénurie PV, import coupé).
5. **Documentation & UX**
   - Mettre à jour README (roadmap + section stratégie) et `Docs/status.md`.
   - Écrire guide d’usage dans `Docs/scenarios_catalog` + aide UI (tooltips sur panneau Stratégie & KPIs).
   - Capturer une capture d’écran de la vue comparaison avec la nouvelle stratégie.

## Découpage recommandé
1. S5.1 : Chauffage (modèle + UI + tests + presets hiver).
2. S5.2 : Pompe de piscine (modèle + UI + tests + preset été).
3. S5.3 : Borne VE (modèle + UI + tests + preset soirée).
4. S5.4 : Stratégie multi-équipements + KPI confort.

Chaque étape doit rester autonome (docs + tests inclus) pour itérations rapides.
