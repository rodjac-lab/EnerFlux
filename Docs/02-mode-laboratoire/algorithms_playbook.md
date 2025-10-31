# Algorithms Playbook — EnerFlux

Ce playbook décrit les heuristiques d'allocation utilisées par le moteur EnerFlux. Les définitions de KPI et la liste complète des tests de non-régression sont détaillées dans [Docs/metrics_and_tests.md](./metrics_and_tests.md).

## Strategy matrix

| Stratégie | Inputs required | Paramètres (valeurs par défaut) | Decision logic summary | Pros | Cons | KPIs impactés | Scénarios typiques | Related tests |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `ecs_first` | `surplus_kW`; liste `requests` avec capacités `thermal-storage` et `electrical-storage`; indices de priorité `ecs_deadline_priority`/`ecs_deadline_urgent` | Aucun | Trie les requêtes et alimente d'abord les stocks thermiques (ballon ECS, chauffage), puis le reste. | Maximises le confort ECS et la couverture thermique. | Peut retarder la recharge batterie ⇒ moins d'autoconsommation les soirs nuageux. | `ecs_hit_rate`, `ecs_avg_deficit_K`, autoconsommation. | Journée ensoleillée avec ballon tiède. | [`tests/strategy_registry.test.ts`](../tests/strategy_registry.test.ts) (mappage de base), [`tests/strategies_divergence.test.ts`](../tests/strategies_divergence.test.ts) (écart vs `battery_first`). |
| `ecs_hysteresis` | Idem `ecs_first` + état ECS exposant `ecs_deadline_*` pour prioriser les urgences. | Hystérésis (ΔT=2 K) et deadline activés via contrat ECS. | Logique d'allocation `ecs_first` + helper moteur qui coupe les demandes ECS tant que `T ≥ T_high`. | Réduit les cyclages ECS, stabilise la température. | Peut laisser filer la T° sous `T_target` avant de relancer ⇒ confort légèrement oscillant. | `ecs_hit_rate`, `ecs_avg_deficit_K`, `uptime_ECS`. | Ballon quasi à consigne avec production PV intermittente. | [`tests/strategy_registry.test.ts`](../tests/strategy_registry.test.ts) (activation helper). |
| `battery_first` | `surplus_kW`; `requests` incluant batterie (`soc_percent` ou `socFraction`). | Aucun | Charge la batterie tant que SOC < max, puis alimente ECS/charges thermiques. | Maximises l'autoconsommation future, protège les cyclages ECS. | Peut dégrader le confort ECS si SOC bas prolongé. | Autoconsommation, `ecs_hit_rate`, `net_cost`. | Matin froid batterie vide après nuit. | [`tests/strategies_divergence.test.ts`](../tests/strategies_divergence.test.ts) (divergence vs `ecs_first`). |
| `mix_soc_threshold` | Inputs `battery_first` + `ecs_first`; lecture `soc_percent`. | `thresholdPercent` (=50 % via `resolveStrategy`). | Si SOC < seuil ⇒ priorité batterie; sinon priorité ECS. | Offre compromis configurable entre confort ECS et réserve batterie. | Seuil fixe ⇒ tuning manuel selon saison. | Autoconsommation, `ecs_hit_rate`, coût réseau. | Mi-saison avec batterie à moitié pleine. | TODO (ajouter test dédié au franchissement de seuil). |
| `reserve_evening` | `surplus_kW`; `requests` batterie (`soc_percent`), ECS; heure courante. | Fenêtre soir 18 h; réserve SOC ≥60 %. | Avant 18 h et SOC < 60 % ⇒ charger batterie; sinon priorité ECS/thermique. | Assure réserve pour pointe réseau, évite import en soirée. | Peut retarder ECS en milieu de journée si SOC faible. | Autoconsommation horaire, `net_cost`, `ecs_hit_rate`. | Journée nuageuse avant pointe 18–22 h. | [`tests/strategy_registry.test.ts`](../tests/strategy_registry.test.ts) (réserve ≥60 %). |
| `ev_departure_guard` | `surplus_kW`; `requests` batterie (`soc_percent`), ECS, VE (`session_*`, `energy_remaining_kWh`, `maxAccept_kW`); heure courante. | Fenêtre réserve VE : SOC cible 70 % si VE imminent; départ urgent ≤1,5 h; fenêtre arrivée VE ≤6 h. | Identifie VE actif/imminent, construit réserve batterie si besoin, puis bascule priorité vers VE lorsque départ proche ou puissance requise élevée. | Sécurise départ VE sans sacrifier entièrement confort thermique. | Paramètres fixes ⇒ peut surdimensionner la réserve pour petits trajets. | `ev_charge_completion`, `ecs_hit_rate`, autoconsommation. | Soirée avec VE programmé à 22 h et batterie moyenne. | [`tests/strategy_registry.test.ts`](../tests/strategy_registry.test.ts) (réserve VE, priorisation VE urgente). |
| `multi_equipment_priority` | `requests` multi-équipements : ECS (`temp_C`, `target_C`), chauffage (`call_for_heat`, `deficit`), VE, piscine (`hours_remaining`), batterie; `surplus_kW`. | Paliers confort chauffage (1,5 K/0,8 K), fenêtres VE, priorités piscine. | Classe ECS < chauffage < VE urgent < piscine rattrapage < batterie < charges restantes selon déficits. | Offre vision holistique multi-usage, maintient confort critique. | Complexité accrue, dépendance aux états fournis par chaque device. | `ecs_hit_rate`, `heating_comfort_ratio`, `ev_charge_completion`, `pool_filtration_completion`. | Maison équipée ECS + PAC + piscine + VE. | [`tests/strategy_registry.test.ts`](../tests/strategy_registry.test.ts) (ordre allocations), [`tests/multi_equipment_kpis.test.ts`](../tests/multi_equipment_kpis.test.ts) (KPIs piscine/VE). |

## Pseudocode

Les blocs suivants décrivent le flux décisionnel (inputs → décision → allocations) de chaque stratégie. Les allocations sont des paires `(deviceId, power_kW)` bornées par `surplus_kW` et `request.maxAccept_kW`.

### `ecs_first`

```pseudo
Inputs:
  surplus_kW
  requests[] (capabilities, maxAccept_kW, optional ECS deadline hints)
Parameters: none
Procedure:
  sort requests by (deadlinePriority ascending, thermal-first, priorityHint descending, deviceId)
  for each request in sorted list while surplus_kW > 0:
    power = min(request.maxAccept_kW, surplus_kW)
    if power > 0:
      emit allocation(request.device.id, power)
      surplus_kW -= power
Outputs:
  allocations[] prioritising domestic hot water and thermal loads
```

### `ecs_hysteresis`

```pseudo
Inputs:
  Same as ecs_first + ECS helper state (current temp, hysteresis bounds)
Parameters:
  hysteresis band ΔT = 2 K (contract helper)
Procedure:
  contract helper suppresses ECS requests while temp >= T_high
  if ECS request active:
    execute ecs_first procedure
  else:
    run ecs_first without ECS entries (other loads share surplus)
Outputs:
  allocations[] with fewer ECS ON/OFF cycles
```

### `battery_first`

```pseudo
Inputs:
  surplus_kW
  requests[] including at least one electrical-storage device with soc_percent
Parameters: none
Procedure:
  sort requests by (deadlinePriority, electrical-storage first, others later)
  allocate following same loop as ecs_first
Outputs:
  allocations[] filling batteries before other demands
```

### `mix_soc_threshold`

```pseudo
Inputs:
  surplus_kW
  requests[] including battery SOC and ECS targets
Parameters:
  thresholdPercent (default 50 %)
Procedure:
  soc = first battery request.soc_percent
  if soc exists and soc < thresholdPercent:
    run battery_first allocation order
  else:
    run ecs_first allocation order
Outputs:
  allocations[] switching priority around the SOC threshold
```

### `reserve_evening`

```pseudo
Inputs:
  surplus_kW
  requests[] with battery soc_percent and thermal loads
  time_s (seconds since midnight)
Parameters:
  eveningStartHour = 18
  reserveSocTarget = 60 %
Procedure:
  hour = time_s / 3600 mod 24
  needsReserve = (soc_percent < reserveSocTarget) and (hour < eveningStartHour)
  order requests as:
    if thermal load:
      rank = 0 when hour >= eveningStartHour else (needsReserve ? 2 : 0)
    if electrical storage:
      rank = needsReserve ? 0 : 1
    otherwise rank = 5
  allocate by increasing rank using ecs_first loop
Outputs:
  allocations[] building a battery buffer before evening, then serving thermal loads
```

### `ev_departure_guard`

```pseudo
Inputs:
  surplus_kW
  requests[] including battery soc_percent, EV session flags, thermal loads
  time_s
Parameters:
  eveningReserveTarget = 60 %
  baseReserveTarget = 55 %
  evReserveTarget = 70 % when EV active or arriving within 6 h
  urgencyThreshold_h = 1.5
  requiredPowerUrgentRatio = 0.8
Procedure:
  inspect EV requests:
    mark hasActiveEv, hasUrgentEv, soonestArrival_h, requiredPower ratios
  compute shouldPrioritiseBattery if battery SOC below (evReserveTarget or baseReserveTarget) or evening reserve missing
  assign ranks:
    EV: urgent → -5; active → (shouldPrioritiseBattery ? 1 : 0); arrival soon → 3; otherwise 5
    Battery: shouldPrioritiseBattery → -4; activeEV without urgency → 3; otherwise 1
    Thermal: shouldPrioritiseBattery → 4; urgentEV → 3; otherwise 2
    Others: 6
  allocate by increasing rank
Outputs:
  allocations[] that keep a buffer for upcoming EV sessions and fast-charge when departure is imminent
```

### `multi_equipment_priority`

```pseudo
Inputs:
  surplus_kW
  requests[]: ECS, heating, EV, pool, battery, others with respective state signals
Parameters:
  heating deficit tiers: ≥1.5 K → rank 0, ≥0.8 K → rank 1
  EV urgency tiers: active & <1.2 h → rank 0.5, active high power → 0.7, upcoming <1.5 h → 3
  Pool tiers: running → 3.2, hours_remaining ≤0.5 → 3.6, ≤1.5 → 4.2, ≤3 → 5
Procedure:
  if request is ECS tank → rank -10
  else if heating device → rank from heating tiers
  else if EV → rank from EV tiers
  else if pool → rank from pool tiers
  else if electrical storage → rank 7
  else if other thermal → rank 5
  else rank 8
  allocate sorted by rank using ecs_first loop
Outputs:
  allocations[] that protect comfort-critical loads before flexible storage or shiftable appliances
```
