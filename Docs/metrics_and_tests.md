# Metrics and Tests — EnerFlux

## KPIs (définitions formelles)

Consommation totale :

$$
E\_{conso} = \sum\_t Load\_{base}(t) \cdot \frac{dt}{3600} + \sum\_{devices} E\_{device}(t)
$$

PV utilisé sur site :

$$
E\_{pv\_used} = \sum\_t \min(PV(t), Load\_{on\_site}(t)) \cdot \frac{dt}{3600}
$$

Autoconsommation :

$$
AC = \frac{E\_{pv\_used}}{E\_{conso}}
$$

Autoproduction :

$$
AP = \frac{E\_{pv\_used}}{E\_{pv\_total}}
$$

Économie (€) :

$$
G\_{€} = E\_{import\,evite} \cdot p\_{import} - E\_{export\,perdu} \cdot p\_{export}
$$

Cycles batterie (proxy) :

$$
\text{cycles} \approx \frac{1}{2 E\_{cap}} \sum\_{t=1}^{N} |\Delta E\_t|
$$

Uptime ECS :

$$
Uptime\_{ECS} = \frac{\#\{t \mid T(t) \ge T\_{cible}\}}{N}
$$

---

## Tests d’acceptation (S1)

### A. Moteur minimal
- Contexte : Été ensoleillé, stratégie `ecs_first`
- Vérifications :
  - Bilan énergie : `PV = sum(flux)` (tol 1e-6)
  - SOC ∈ [SOC_min, SOC_max]
  - T_ECS ≤ T_cible (+ marge 0.5 °C)

### B. ECS physique
- Cas : V=300 L, P=2 kW, dt=900 s, eta=0.98, pertes=0
- Attendu : ΔT simulé ≈ ΔT théorique (±2 % après 1 h et 2 h)

### C. Comparaison stratégies
- Été ensoleillé, ECS froid le matin
  - Autoconsommation(`ecs_first`) ≥ Autoconsommation(`battery_first`)
- Cas batterie vide + ECS chaud
  - Inverse possible (ordre de grandeur, pas strict)

---

## Tolérances
- Bilans : 1e-6
- Seeds fixées pour scénarios pseudo-aléatoires
- Tests rapides (< 1 s) pour CI fluide
