# Algorithms Playbook — EnerFlux

## Contrat de service ECS (canonique)

| Mode | Chauffe automatique | Pénalité financière | Garanties principales |
| ---- | ------------------- | ------------------- | --------------------- |
| `off` | Aucune (le ballon suit uniquement la stratégie active) | Aucune | Zéro contrainte ; utile pour tests ou lorsque l’ECS est piloté par un autre système.
| `penalize` | Aucune : la chauffe dépend de la stratégie | Oui : `penalty_per_K * déficit_K` facturée à la deadline | Laisse la stratégie décider, mais mesure l’inconfort résiduel.
| `force` | Oui : appoint réseau enclenché pour atteindre la cible | Non (le déficit est corrigé) | Garantie 100 % de réussite à la deadline, au prix d’un coût réseau éventuel.

### Définitions détaillées
- **Cible (`targetCelsius`)** : température minimale à atteindre au moment de la deadline (généralement l’heure de retour à domicile le soir).
- **Deadline (`deadlineHour`)** : horodatage local (00–23 h) auquel le contrat évalue la performance. Les simulations utilisent l’heure locale du scénario, y compris les transitions DST.
- **Mode `off`** : la simulation n’impose aucun appoint ni pénalité. Le ballon ne chauffe qu’en fonction des demandes produites par la stratégie (ex. `ecs_first`).
- **Mode `penalize`** : si `T_deadline < targetCelsius`, on comptabilise un déficit `deficitK = targetCelsius - T_deadline`. Une pénalité en euro est ajoutée, sans modifier la température.
- **Mode `force`** : à la deadline, le moteur ajoute l’énergie manquante (jusqu’aux limites de puissance de l’ECS) pour atteindre `targetCelsius`. Cette énergie provient du réseau et augmente la consommation importée.

### Formules KPI
Soit un ensemble de `N` évaluations (ex. nombre de jours simulés) :
- `hit_rate = (1/N) * Σ[1(T_deadline_i ≥ targetCelsius)]`
- `avg_deficitK = (1/N) * Σ[max(0, targetCelsius - T_deadline_i)]`
- `penalties_total€ = Σ[max(0, targetCelsius - T_deadline_i)] * penaltyPerKelvin`
- `net_cost_with_penalties€ = energy_cost€ + penalties_total€`
  - `energy_cost€` correspond à la facture nette import/export du scénario.

### Cas limites & arbitrages
- **Deadline inatteignable** : si le temps restant ou la puissance max de l’ECS ne suffisent pas pour combler le déficit, `force` chauffe au maximum disponible et un résiduel peut subsister ; `penalize` enregistre la pénalité correspondante.
- **Fuseaux horaires & DST** : les deadlines sont évaluées en heure locale. Lors d’un passage heure d’été/hiver, deux deadlines peuvent exister pour la même heure (02:00) ; la simulation choisit la première occurrence dans le fuseau du scénario.
- **Rattrapage forcé** : en mode `force`, le moteur déclenche l’appoint même s’il faut tirer sur le réseau en période de prix élevé. Les stratégies doivent anticiper ce risque via les helpers pour optimiser le coût.
- **Température déjà supérieure à la cible** : aucun appoint ni pénalité n’est appliqué ; `deficitK = 0`.

### Helpers du contrat ECS
#### `ecs_hysteresis`
- **Objectif** : éviter les oscillations ON/OFF rapides lorsque le ballon effleure la cible.
- **Principe** : introduire deux seuils `T_low` et `T_high`. Tant que `T ≥ T_high`, le helper coupe les demandes ECS ; il les réactive uniquement quand `T ≤ T_low`.
- **Impact** : réduit les commutations et les pertes thermiques tout en respectant le contrat. Compatible avec tous les modes (`off`, `penalize`, `force`).

#### `deadline_helper`
- **Objectif** : sécuriser l’atteinte de la deadline lorsque la production PV s’annonce insuffisante.
- **Principe** : surveille la puissance PV disponible et l’énergie requise pour atteindre `targetCelsius`. Si l’estimation montre que la cible sera manquée, le helper lance une pré-chauffe (ex. dernière heure avant deadline) pour lisser la consommation réseau.
- **Impact** : augmente `hit_rate` et diminue `penalties_total€` en mode `penalize`, tout en réduisant la quantité d’énergie achetée au prix fort en mode `force`.

### Exemple chiffré — Journée d’hiver à faible PV
Hypothèses : ballon 200 L (`0,232 kWh/K`), cible 55 °C, départ 48 °C (`7 K` d’écart, soit `1,62 kWh`). Prix import : `0,20 €/kWh`. Pénalité : `0,08 €/K`.

| Étape | PV dispo (kWh) | Énergie ECS utilisée (kWh) | Température (°C) | Déficit (K) | Coût/pénalité (€) |
| ----- | -------------- | ------------------------- | ---------------- | ----------- | ----------------- |
| Matin (stratégie) | 0,0 | 0,0 | 48,0 | 7,0 | 0,00 |
| Midi (surplus 1,0 kWh) | 1,0 | 1,0 | 52,3 | 2,7 | 0,00 |
| 21 h — Mode `off` | — | 0,0 | 52,3 | 2,7 | 0,00 |
| 21 h — Mode `penalize` | — | 0,0 | 52,3 | 2,7 | 0,22 |
| 21 h — Mode `force` | — | 0,63 (réseau) | 55,0 | 0,0 | 0,13 |

Résumé KPI sur la journée :

| Mode | `hit_rate` | `avg_deficitK` | `penalties_total€` | `net_cost_with_penalties€` (supp. par rapport à `off`) |
| ---- | ----------- | -------------- | ------------------ | ------------------------------------------------------- |
| `off` | 0 % | 2,7 K | 0,00 € | 0,00 € |
| `penalize` | 0 % | 2,7 K | 0,22 € | +0,22 € |
| `force` | 100 % | 0,0 K | 0,00 € | +0,13 € (énergie importée)

### Schéma d’ordonnancement moteur
```mermaid
flowchart LR
  subgraph Strategique
    S[Stratégie principale]
    Hysteresis[ecs_hysteresis]
    Deadline[deadline_helper]
  end
  PV[PV / charges] -->|surplus/déficit| S
  S -->|demande ECS| Hysteresis
  Hysteresis --> Deadline
  Deadline -->|requêtes priorisées| Contract[Contrat ECS]
  Contract -->|planification| Engine[Moteur]
  Engine --> DHW[DHWTank]
  DHW -->|état (T°)| KPIs[Calcul KPI]
  KPIs --> Contract
```

## Stratégies S1 (rappel)

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
- Exceptions :
  - Si T ≥ T_cible − marge → pas de demande ECS
  - Si batterie aux limites (SOC_max ou P_max) → passer ECS

---

## Allocation (surplus/déficit)
Au pas `t` :

- Surplus = `max(PV - Load_base, 0)`
- Déficit = `max(Load_base - PV, 0)`

Distribution selon la stratégie choisie, sous contraintes de puissance.

---

## Score multi-critères (S2)
Score marginal par kWh alloué :

$$
S = a \cdot G_{autoconso} + b \cdot G_{€} - c \cdot C_{cycles} - d \cdot I_{inconfort}
$$

Ordonner les demandes par score décroissant jusqu’à épuisement du surplus.
Poids {a, b, c, d} paramétrables.

---

## Optimisation (S4+)
Formulation LP sur horizon glissant (24 h) :

- Variables : `pv_to_x[t]` (flux d’énergie)
- Contraintes : SOC, T°, fenêtres VE/Piscine
- Objectif : max autoconsommation ou min coût
