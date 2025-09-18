# Algorithms Playbook — EnerFlux

## Stratégies S1

### 1) `battery_first`
1. Surplus → batterie (tant que SOC < max, et P ≤ P_max)
2. Puis ECS (jusqu’à T_cible, limité par P_res)
3. Puis export réseau

### 2) `ecs_first`
1. Surplus → ECS (jusqu’à T_cible)
2. Puis batterie
3. Puis export réseau

### 3) `mix_soc_threshold(x%)`
- Si SOC < x% → priorité batterie
- Sinon priorité ECS
- Exceptions : 
  - Si T ≥ T_cible − marge → pas de demande ECS
  - Si batterie aux limites (SOC_max ou P_max) → passer ECS

---

## Allocation (surplus/déficit)
Au pas t :

- Surplus = `max(PV - Load_base, 0)`
- Déficit = `max(Load_base - PV, 0)`

Distribution selon la stratégie choisie, sous contraintes de puissance.

---

## Score multi-critères (S2)
Score marginal par kWh alloué :

$$
S = a \cdot G\_{autoconso} + b \cdot G\_{€} - c \cdot C\_{cycles} - d \cdot I\_{inconfort}
$$

Ordonner les demandes par score décroissant jusqu’à épuisement du surplus.  
Poids {a, b, c, d} paramétrables.

---

## Optimisation (S4+)
Formulation LP sur horizon glissant (24 h) :

- Variables : `pv_to_x[t]` (flux d’énergie)
- Contraintes : SOC, T°, fenêtres VE/Piscine
- Objectif : max autoconsommation ou min coût
