# EnerFlux
A simple simulator for Self consumption algorithms
PV Self‑Consumption Lab (JS/TS)

But — Un laboratoire de stratégies pour maximiser l’autoconsommation d’une installation photovoltaïque résidentielle avec équipements pilotables (Batterie, Ballon ECS, puis Chauffage, Piscine, VE).

Pourquoi — Comparer facilement plusieurs stratégies (règles simples, score multi‑critères, optimisation plus tard), visualiser les impacts (kW/kWh/€), et décider de règles robustes.

🧱 Stack

TypeScript (sécurité des types & unités)

React + Vite (UI moderne, rapide)

Zustand (state store simple)

Recharts (graphiques)

Tailwind + shadcn/ui + Framer Motion (UI sexy)

Web Worker pour exécuter la simulation sans bloquer la UI

Vitest (tests)

🚀 Quickstart
# 1) Créer le projet
npm create vite@latest pv-lab -- --template react-ts
cd pv-lab


# 2) Dépendances UI & outils
npm i zustand recharts zod tailwindcss postcss autoprefixer class-variance-authority clsx framer-motion lucide-react


# 3) Dev server
npm run dev

Configure Tailwind (npx tailwindcss init -p) et ajoute les directives dans src/index.css.

📁 Arborescence (cible)
/ (repo)
├─ README.md
├─ AGENT.md
├─ docs/
│  ├─ product_vision.md
│  ├─ domain_glossary.md
│  ├─ algorithms_playbook.md
│  ├─ scenarios_catalog.md
│  └─ metrics_and_tests.md
├─ src/
│  ├─ core/
│  │  ├─ engine.ts
│  │  ├─ strategy.ts
│  │  ├─ kpis.ts
│  │  └─ power-graph.ts
│  ├─ devices/
│  │  ├─ Device.ts
│  │  ├─ Battery.ts
│  │  ├─ DHWTank.ts
│  │  ├─ Heating.ts   # modele thermique S5.1
│  │  ├─ PoolPump.ts  # filtration + rattrapage S5.2
│  │  ├─ EVCharger.ts # sessions arrivee/depart + catch-up S5.3
│  │  └─ registry.ts
│  ├─ data/
│  │  ├─ types.ts
│  │  └─ scenarios.ts
│  ├─ workers/
│  │  └─ sim.worker.ts
│  ├─ ui/
│  │  ├─ App.tsx
│  │  ├─ panels/
│  │  ├─ charts/
│  │  └─ compare/
│  └─ main.tsx
├─ tests/
│  ├─ engine_minimal.test.ts
│  └─ ecs_physics.test.ts
└─ package.json
🧪 MVP — ce qui fonctionne en v0

Simulation pas‑à‑pas (dt configurable) sur PV + charge de base + Batterie + Ballon ECS

Stratégies : ecs_first, ecs_hysteresis, deadline_helper, battery_first, mix_soc_threshold, reserve_evening, ev_departure_guard, multi_equipment_priority

- `reserve_evening` : maintient au moins 60 % de SOC avant 18 h pour couvrir la pointe, puis priorise l’ECS et les besoins thermiques une fois la réserve atteinte.
- `ev_departure_guard` : anticipe l’arrivée d’un véhicule électrique en préservant la batterie, puis accélère la charge quand le départ approche.
- `multi_equipment_priority` : sécurise d’abord l’ECS, arbitre le chauffage selon l’écart à la consigne puis distribue le surplus PV entre VE et piscine avant d’envisager la batterie.

KPIs : Autoconsommation, Autoproduction, Δ € vs réseau seul, ROI simplifié, proxy cycles batterie, % temps ECS ≥ T° cible, ratio confort chauffage, complétion filtration piscine, complétion charge VE

UI : Comparateur A/B avec vue condensée multi-métriques, graphiques synchronisés + export CSV/JSON

Comparaisons : Appoint réseau automatique garantissant un ballon ECS conforme dans chaque scénario

### Service ECS — mode Forcer vs Pénaliser

* **Forcer** : applique un appoint réseau automatique si la température visée n’est pas atteinte avant l’heure limite. Pas de
  pénalité ajoutée au coût net.
* **Pénaliser** : aucun appoint final n’est déclenché ; un déficit de température résiduel génère une pénalité financière
  (par défaut 0,08 €/K) ajoutée au coût net.
* **Désactivé** : ni secours réseau automatique, ni pénalité — utile pour analyser une stratégie « pure ».

La cible et l’heure limite du contrat sont configurables depuis le panneau ECS afin d’aligner le contrat sur vos exigences de
service.

### KPIs économiques enrichis (S4)

- **Δ vs réseau seul** — estimation de l’économie quotidienne par rapport à un foyer 100 % réseau, calculée à partir des flux d’énergie.
- **Taux d’économie** — part de la facture réseau évitée.
- **Temps de retour simplifié** — investissement PV + batterie (approximation catalogue : 1 150 €/kWc, 480 €/kWh) divisé par les économies annualisées.

> ⚠️ Ces heuristiques ne tiennent pas compte des aides, coûts d’intégration ou maintenance. Elles fournissent un ordre de grandeur pour comparer les stratégies entre elles.

### Presets orientés contrat ECS (S3)

- **Matin froid** — PV tardif, batterie bridée à 1 kW et tarifs de pointe matin/soir pour tester l’hystérésis et le helper
  deadline.
- **Ballon confort** — cible 58 °C avant les douches du soir avec ToU renforcé (0.32 €/kWh en pointe) pour comparer préchauffe vs
  réserve batterie.

### Presets multi-équipements (S5)

- **Soirée VE** — arrivee véhicule à 18 h, départ 7 h avec 22 kWh à restituer et tarif pointe soir pour étudier l’arbitrage PV/batterie.
- **Stress multi-équipements** — hiver froid cumulant chauffage, filtration piscine et recharge VE pour éprouver la stratégie multi-priorités.

🗺️ Roadmap courte

S1 : Core + Batterie + ECS + UI de base + tests

S2 : Stratégie score multi‑critères + presets + UX raffinée

S3 : Chauffage/Piscine/VE (stubs → implémentations) ✅ livré (ECS contract, helpers, presets)

S4 : KPIs économiques enrichis + stratégie `reserve_evening` + vue KPI condensée ✅ livré

S5 : Intégration multi-équipements (chauffage modulable, pompe piscine, VE) + nouvelles stratégies/presets ✅ livré (stratégie `multi_equipment_priority`, KPIs confort, preset stress)

⚠️ Disclaimer

Outil de simulation. Ne constitue pas un conseil technique/économique. Vérifier toute décision réelle avec un professionnel et les contraintes électriques/légales locales.

Licence

MIT (à confirmer).

