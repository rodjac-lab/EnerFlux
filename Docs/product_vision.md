Vision

Construire un laboratoire de stratégies pour maximiser l’autoconsommation, en comparant différentes politiques d’allocation du surplus PV entre équipements pilotables : Batterie, Ballon ECS (Eau Chaude Sanitaire), puis Chauffage, Piscine, VE.

Objectifs

Explorer et comparer des stratégies : Règles simples, Mix à seuils, Score multi‑critères, puis Optimisation.

Décider de règles robustes (ex: "ECS d’abord si …", "Batterie d’abord si …").

Mesurer les impacts : % autoconsommation, € économisés, cycles batterie (proxy), confort thermique (ECS/Chauffage), respect fenêtres (Piscine/VE).

KPIs principaux

Taux d’autoconsommation = (énergie conso couverte par PV) / (conso totale)

Taux d’autoproduction = (production PV consommée sur site) / (production PV totale)

Économie € (option tarifs)

Cycles batterie (proxy) : 
cycles
≈
∑
∣
Δ
𝑆
𝑂
𝐶
∣
2
 
𝐸
cap
cycles≈
2E
cap
	​

∑∣ΔSOC∣
	​




Uptime ECS ≥ T° cible (%)

Confort chauffage : % pas dans plage de consigne

Portée MVP (S1)

Équipements implémentés : Batterie, Ballon ECS

Équipements pré‑vus (stubs) : Chauffage, Piscine, VE

Stratégies : ecs_first, battery_first, mix_soc_threshold

Pas de prévisions météo/tarifs dynamiques pour S1 (optionnels ensuite)

Public

Toi (PO) et toute personne voulant jouer avec des stratégies d’autoconsommation.
