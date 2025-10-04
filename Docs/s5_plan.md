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

## Chantier 2 — Pompe de piscine
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

## Stratégie & KPI
- Introduire un orchestrateur multi-équipements (`multi_equipment_priority`) combinant ECS, chauffage, VE, piscine.
- Ajouter KPI confort chauffage (% pas >= consigne) et completion VE/piscine.
- Étendre aide UI + README pour expliquer les arbitrages.

## Découpage recommandé
1. S5.1 : Chauffage (modèle + UI + tests + presets hiver).
2. S5.2 : Pompe de piscine (modèle + UI + tests + preset été).
3. S5.3 : Borne VE (modèle + UI + tests + preset soirée).
4. S5.4 : Stratégie multi-équipements + KPI confort.

Chaque étape doit rester autonome (docs + tests inclus) pour itérations rapides.
