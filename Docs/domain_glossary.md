# Glossaire du domaine — EnerFlux

Ce glossaire unifie le vocabulaire employé dans EnerFlux pour décrire les flux énergétiques, les équipements et les objectifs de confort. Les formules font référence aux conventions détaillées dans [Docs/metrics_and_tests.md](./metrics_and_tests.md).

| Terme | Définition | Formule | Exemple | Notes |
| --- | --- | --- | --- | --- |
| Autoconsommation | Part de l'énergie consommée sur site qui provient directement de la production locale (PV, batterie). | $AC = \frac{E_{pv\_used}}{E_{conso}}$ | Journée d'été : 18 kWh consommés, 12 kWh fournis par PV/batterie ⇒ AC = 67 %. | KPI clé pour juger de l'utilisation locale de la production PV. |
| Autoproduction | Part de la production PV utilisée sur site. | $AP = \frac{E_{pv\_used}}{E_{pv\_total}}$ | 20 kWh produits, 12 kWh utilisés sur site ⇒ AP = 60 %. | Complémentaire de l'autoconsommation pour qualifier le surplus exporté. |
| Surplus | Puissance PV excédentaire après consommation instantanée des charges locales. | $Surplus(t) = \max(PV(t) - Load_{on\_site}(t), 0)$ | Midi ensoleillé : PV 5 kW, charges 2 kW ⇒ surplus 3 kW. | Pilote les stratégies d'allocation (batterie, ECS, VE). |
| Injection | Puissance exportée vers le réseau public. | $Export(t) = \max(Surplus(t) - \sum Allocations, 0)$ | Surplus 3 kW, batterie absorbe 2 kW ⇒ injection 1 kW. | Impacte le KPI `export_kWh` et la rémunération éventuelle. |
| Import | Puissance importée depuis le réseau pour couvrir un déficit. | $Import(t) = \max(Load_{on\_site}(t) - PV(t) - Discharge(t), 0)$ | Soirée : charges 4 kW, PV 0 kW, batterie 1.5 kW ⇒ import 2.5 kW. | Contribue au coût net (`net_cost`). |
| SOC (State of Charge) | Niveau d'énergie stockée dans la batterie exprimé en pourcentage ou kWh. | $SOC\_{\%} = \frac{E_{stock}}{E_{max}} \times 100$ | Batterie 8 kWh pleine à 5.6 kWh ⇒ SOC = 70 %. | Les stratégies `battery_first`, `mix_soc_threshold`, `reserve_evening` s'appuient dessus. |
| Cycle batterie | Cycle équivalent de charge/décharge complet pour la batterie. | $cycles \approx \frac{1}{2E_{cap}} \sum |\Delta E_t|$ | Sur un jour : 16 kWh chargés/déchargés sur batterie 8 kWh ⇒ 1 cycle. | Proxy pour l'usure, suivi dans les KPIs. |
| Puissance crête (kWc) | Puissance nominale maximale du champ PV sous conditions standard (STC). | — | Installation 6 kWc produisant 4.8 kW en plein soleil ⇒ fonctionnement proche du pic. | Sert à estimer les investissements et la capacité maximale. |
| Profil de charge | Courbe temporelle représentant la puissance demandée par le site (base + équipements). | — | Maison : base 0.8 kW + chauffe-eau 2 kW à 6 h ⇒ pic 2.8 kW. | Utilisé pour scénarios et tests (été/hiver). |
| ToU / HP-HC | Tarification « Time of Use » distinguant Heures Pleines (HP) et Heures Creuses (HC). | — | HP 0.24 €/kWh (7 h–23 h), HC 0.18 €/kWh (23 h–7 h). | Impacte l'optimisation coût (`net_cost`) et les stratégies calendrier. |
| Peak-shaving | Réduction des pics de consommation/import via stockage ou délestage. | — | Batterie décharge 3 kW à 19 h pour limiter l'import à 1 kW. | Vise à réduire la puissance souscrite et les surcoûts HP. |
| Diverter | Dispositif qui oriente le surplus PV vers une charge résistive (ECS) plutôt que vers le réseau. | — | Surplus 2 kW → chauffe-eau électrique modulé à 1.8 kW. | Approche hardware complémentaire aux stratégies EnerFlux. |
| Confort ECS | Pourcentage de temps où l'eau chaude sanitaire est à la consigne ou au-dessus. | $Uptime_{ECS} = \frac{\#\{t | T(t) \ge T_{cible}\}}{N}$ | Ballon 55 °C la majeure partie de la journée ⇒ 96 % d'uptime. | KPI suivi dans `metrics_and_tests.md`; dépend des stratégies ECS. |
| Confort VE | Capacité à livrer l'énergie demandée avant le départ du véhicule électrique. | $Completion_{VE} = \frac{E_{livrée}}{E_{demandée}}$ | Demande 18 kWh, livrés 17 kWh avant 7 h ⇒ 94 %. | Mesuré par `ev_charge_completion`. |
| Confort PAC | Respect de la consigne de température intérieure pour la pompe à chaleur. | $Confort_{PAC} = \frac{\#\{t | T_{int}(t) \ge T_{consigne}\}}{N}$ | Maintien ≥ 20 °C sur 85 % des pas ⇒ confort 85 %. | KPI visé dans la feuille de route S5. |
| Autonomie énergétique | Part de la consommation couverte sans import réseau (PV + stockage). | $Autonomie = 1 - \frac{E_{import}}{E_{conso}}$ | Consommation 25 kWh, import 5 kWh ⇒ autonomie 80 %. | Indicateur synthétique pour les scénarios isolés. |
| Charge différable | Charge pouvant être décalée dans le temps sans perte de service immédiate. | — | Lave-linge 2 kWh programmé en heure creuse. | Les stratégies multi-équipements classent ces charges après confort critique. |
| Fenêtre de confort | Intervalle temporel durant lequel un équipement doit atteindre un état cible. | — | Ballon ECS doit être ≥ 55 °C avant 21 h. | Paramètre utilisé par `ecs_first`, `ev_departure_guard`. |
| Réserve soirée | Niveau de SOC minimal visé avant la période de pointe du soir. | — | Stratégie `reserve_evening` impose SOC ≥ 60 % avant 18 h. | Réduit l'import en HP et sécurise le confort nocturne. |

