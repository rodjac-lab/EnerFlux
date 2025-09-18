# Domain Glossary — EnerFlux

## Définitions & unités
- `PV(t)` : puissance instantanée PV [kW]
- `Load_base(t)` : puissance de base (non pilotée) [kW]
- `Surplus(t)` : `max(PV - Load_base, 0)` [kW]
- `Deficit(t)` : `max(Load_base - PV, 0)` [kW]
- `SOC` : énergie stockée batterie [kWh] (0…capacité utile)
- `DoD` : profondeur de décharge autorisée (ex: 80%)
- `eta_ch`, `eta_dis` : rendements charge/décharge batterie (0..1)
- ECS : ballon d’eau chaude. `T(t)` [°C], `V` [L], `P_res` [kW], pertes `UA` [W/K]
- `dt` : pas de temps [s]

## Bilans — Batterie
Limites de puissance :

$$
|P\_{batt}| \leq P\_{max}
$$

Évolution SOC :

$$
\Delta E\_{ch} = P\_{in} \cdot \frac{dt}{3600} \cdot \eta\_{ch}
$$

$$
\Delta E\_{dis} = - P\_{out} \cdot \frac{dt}{3600} / \eta\_{dis}
$$

$$
SOC\_{t+1} = clip(SOC\_t + \Delta E, [SOC\_{min}, SOC\_{max}])
$$

## Bilans — Ballon ECS (modèle simplifié)
Capacité thermique eau ≈ 1.163 Wh/L/K

Énergie pour ΔT sur V litres :

$$
E\,[kWh] \approx \frac{1.163 \cdot V\,[L] \cdot \Delta T\,[K]}{1000}
$$

Chauffage par résistance :

$$
\Delta T \approx \frac{P\_{res} \cdot dt \cdot \eta\_{ecs}}{1.163 \cdot V}
$$

Pertes (linéaires) :

$$
\Delta T\_{pertes} \approx - \frac{UA \cdot (T - T\_{amb}) \cdot dt}{1.163 \cdot V}
$$

Contrainte : 

$$
T \leq T\_{cible}
$$

## Paramètres par défaut (exemples)
- Batterie : Capacité utile 10 kWh, P_max 3 kW, eta_ch=0.95, eta_dis=0.95, SOC_min=10%, SOC_max=100%
- ECS : V=300 L, P_res=2 kW, T_cible=55 °C, T_amb=20 °C, UA=4 W/K, eta_ecs=0.98
- Pas : dt=900 s (15 min)
