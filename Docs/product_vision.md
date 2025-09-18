# Product Vision — EnerFlux

## Vision
Construire un **laboratoire de stratégies** pour maximiser l’autoconsommation, en comparant différentes politiques d’allocation du surplus PV entre équipements pilotables : Batterie, Ballon ECS (Eau Chaude Sanitaire), puis Chauffage, Piscine, VE.

## Objectifs
- Explorer et comparer des stratégies : règles simples, mix à seuils, score multi-critères, puis optimisation.
- Décider de règles robustes (ex: "ECS d’abord si …", "Batterie d’abord si …").
- Mesurer les impacts : % autoconsommation, € économisés, cycles batterie (proxy), confort thermique (ECS/Chauffage), respect fenêtres (Piscine/VE).

## KPIs principaux
- **Taux d’autoconsommation**

$$
AC = \frac{E_{pv\_used}}{E_{conso}}
$$

- **Taux d’autoproduction**

$$
AP = \frac{E_{pv\_used}}{E_{pv\_total}}
$$

- **Économie € (option tarifs)**

$$
G\_{€} = E\_{import\,evite} \cdot p\_{import} - E\_{export\,perdu} \cdot p\_{export}
$$

- **Cycles batterie (proxy)**

$$
\text{cycles} \approx \frac{1}{2 E\_{cap}} \sum\_{t=1}^{N} |\Delta E\_t|
$$

- **Uptime ECS ≥ T cible (%)**
- **Confort chauffage** : % pas dans plage de consigne

## Portée MVP (S1)
- Équipements implémentés : Batterie, Ballon ECS
- Équipements pré-vus (stubs) : Chauffage, Piscine, VE
- Stratégies : `ecs_first`, `battery_first`, `mix_soc_threshold`
- Pas de prévisions météo/tarifs dynamiques pour S1

## Public
Toi (PO) et toute personne voulant jouer avec des stratégies d’autoconsommation.
