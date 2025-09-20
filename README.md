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
│  │  ├─ Heating.ts   # stub v1
│  │  ├─ PoolPump.ts  # stub v1
│  │  ├─ EVCharger.ts # stub v1
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

Stratégies : ecs_first, battery_first, mix_soc_threshold

KPIs : Autoconsommation, Autoproduction, € économisés (optionnel), proxy cycles batterie, % temps ECS ≥ T° cible

UI : Comparateur A/B avec graphiques synchronisés + export CSV/JSON

Comparaisons : Appoint réseau automatique garantissant un ballon ECS conforme dans chaque scénario

🗺️ Roadmap courte

S1 : Core + Batterie + ECS + UI de base + tests

S2 : Stratégie score multi‑critères + presets + UX raffinée

S3 : Chauffage/Piscine/VE (stubs → implémentations)

S4 : Optimisation (LP/MPC) optionnelle sur horizon glissant

⚠️ Disclaimer

Outil de simulation. Ne constitue pas un conseil technique/économique. Vérifier toute décision réelle avec un professionnel et les contraintes électriques/légales locales.

Licence

MIT (à confirmer).
