# EnerFlux — Backlog / TODO

## Court terme (S1)
- [ ] Tests CI verts :
  - [ ] Inclure ΔSOC dans bilans énergétiques
  - [ ] Renforcer scénario “Batterie vide” (SOC0=5%, PV≈3.8 kW, ECS P=3.0 kW)
  - [ ] Ajuster seuil divergence si nécessaire (≥0.005)
- [ ] Merger PR#1 une fois stable

## Moyen terme (S2)
- [ ] PR#2 — Tarifs
  - [ ] Implémenter TariffPanel (fixed / TOU / profile)
  - [ ] Propager prix import/export dans EnvContext
  - [ ] KPIs € : coût import, revenu export, coût net, économies vs no-PV
  - [ ] Option stratégie `min_cost`

## Long terme
- [ ] Ajout d’autres usages : chauffage, piscine, VE
- [ ] UI compacte / sexy (moins de saisie, plus de graphes)
- [ ] Analyse économique : ROI, temps de retour, scénarios multi-jours
