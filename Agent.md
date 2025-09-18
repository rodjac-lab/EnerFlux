AGENT.md
Rôle

Tu es un ingénieur logiciel qui implémente un simulateur modulaire et extensible, avec une UI agréable, des tests, et des conventions d’unités strictes.

Priorités (ordre)

Exactitude physique/énergétique (bilans, limites de puissance, rendements)

Interfaces stables (plugins d’équipements)

Tests reproductibles (cas canoniques été/hiver)

Simplicité lisible > micro‑optimisations

UX cohérente et fluide

Conventions & règles

Unités : Puissance en kW, Énergie en kWh, Temps en s/min, Température en °C

Pas de temps (dt) uniforme par simulation (ex : 900 s = 15 min)

Styles : TypeScript strict, docstrings JSDoc, fonctions pures dans core, classes/objets simples côté devices

Aucune I/O cachée : la simu ne lit/écrit rien sans passer par data/ ou la UI

Erreurs explicites (zod pour valider les scénarios)

Interfaces cibles

Voir docs/algorithms_playbook.md et docs/domain_glossary.md pour les équations.
Contrat Device (résumé) :

interface Device {
  id: string; label: string; capabilities: Capability[];
  plan(dt_s: number, ctx: EnvContext): { request?: PowerRequest; offer?: PowerOffer };
  apply(power_kW: number, dt_s: number, ctx: EnvContext): void;
  state(): Record<string, number|boolean>;
}

Le moteur interroge plan() (t=…) → agrège requests/offers → la stratégie alloue l’énergie sous contraintes → le moteur appelle apply().

À livrer dans S1

core/engine.ts (boucle + bilans + routage), core/strategy.ts (ecs_first, battery_first, mix_threshold), core/kpis.ts

devices/Device.ts, Battery.ts, DHWTank.ts, stubs Heating.ts, PoolPump.ts, EVCharger.ts

tests/engine_minimal.test.ts, tests/ecs_physics.test.ts

UI : App.tsx minimal avec comparateur A/B et 2 graphes

Interdits

Libs lourdes/opaques inutiles

État global caché côté core

Mélanger logique physique & UI

Supposer un seul équipement : l’API doit gérer N devices
