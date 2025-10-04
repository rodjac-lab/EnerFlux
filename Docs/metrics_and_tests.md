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

Δ € vs réseau seul :

$$
\Delta_{grid} = C_{grid\,only} - C_{net}
$$

Taux d’économie :

$$
\text{Savings\_rate} = \frac{\Delta_{grid}}{C_{grid\,only}}
$$

Temps de retour simplifié :

$$
\text{Payback} = \frac{Investissement}{\Delta_{grid} / (T / 1\,\text{an})}
$$

avec $T$ la durée simulée (en secondes). L’investissement est estimé par défaut à partir du pic PV (1 150 €/kWc) et de la capacité batterie (480 €/kWh) plus un forfait d’équilibrage (1 200 € PV, 500 € batterie).

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
- `tests/euro_kpis.test.ts` : vérifie Δ €, taux d’économie et payback sur un cas simple + cas limites (économies nulles).
- `tests/strategy_registry.test.ts` : couvre le mapping des helpers ECS et l’heuristique `reserve_evening` (réserve 60 % avant 18 h).

## Vue condensée de comparaison

- Les indicateurs énergétiques et financiers sont regroupés dans `CondensedKpiGrid` (cartes + tableaux) afin de comparer visuellement plusieurs métriques sans quitter la page A/B.
- Les cartes énergétiques affichent automatiquement un badge Δ coloré lorsque l’écart dépasse un seuil, facilitant l’identification de la stratégie gagnante.
- En absence de résultats (simulation non lancée ou en échec), la vue affiche un message explicite plutôt que des cellules vides.

---

## Tolérances
- Bilans : 1e-6
- Seeds fixées pour scénarios pseudo-aléatoires
- Tests rapides (< 1 s) pour CI fluide
