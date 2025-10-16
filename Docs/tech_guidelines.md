# Tech Guidelines — EnerFlux

## Stack & Versions
- **Node.js**: 20 LTS (align CI + local). Use `nvm use` if provided, otherwise install matching version.
- **Package manager**: npm 9.x (lockfile committed). Install dependencies with `npm install`.
- **Build tooling**: Vite 5, TypeScript strict mode, PostCSS/Tailwind pipeline.
- **Testing**: Vitest + jsdom for UI, Node environment for engine/core tests.
- **Local commands**:
  - `npm install`
  - `npm run dev` to launch Vite with hot reload.
  - `npm test` for the Vitest suite (mirrors CI default target).

## Folder Layout (canonical)
```
/
├─ Docs/
│  ├─ metrics_and_tests.md
│  └─ tech_guidelines.md
├─ public/
├─ src/
│  ├─ core/          # moteur de simulation, stratégies, KPIs
│  ├─ engine/        # orchestrateurs haut niveau, workers
│  ├─ devices/       # équipements (Battery, DHWTank, etc.)
│  ├─ lib/           # utilitaires transverses (units, schemas)
│  ├─ ui/
│  │  ├─ charts/
│  │  └─ components/
│  └─ index.ts/main.tsx
├─ tests/            # scénarios métiers + golden tests
└─ package.json
```
Respect this structure when creating new modules—prefer extending existing domains over introducing parallel trees.

## TypeScript Conventions
- Prefer `type` aliases for shapes composed of primitives or unions; use `interface` only for object contracts meant to be extended.
- Mark objects immutable by default (`readonly` properties/tuples). Mutability must be explicit.
- Encode units in the type system. Use branded/unit-safe primitives for energies, powers, and temperatures:

  ```ts
  type Watt = number & { readonly unit: 'W' };
  type KilowattHour = number & { readonly unit: 'kWh' };
  type Celsius = number & { readonly unit: '°C' };

  const asWatt = (value: number): Watt => value as Watt;
  const asKilowattHour = (value: number): KilowattHour => value as KilowattHour;
  const asCelsius = (value: number): Celsius => value as Celsius;
  ```

- Favor discriminated unions for strategy modes to keep exhaustive `switch`es:

  ```ts
  type StrategyId =
    | { kind: 'ecs_first' }
    | { kind: 'battery_first' }
    | { kind: 'mix_threshold'; threshold_pct: number };
  ```

- Never suppress type errors with `any`; prefer dedicated type guards or schema validation (e.g. Zod) near boundaries.

## Coding Patterns
- **Pure functions** inside `src/core` and `src/engine`: no shared mutable state, deterministic output given the same inputs, no direct I/O.
- Keep reducers pure—compute next state without mutating the previous one. Use structural sharing helpers where needed.
- Derive derived data in selectors/utilities rather than storing redundant state.
- Shape inputs/outputs via Zod schemas or equivalent to make contracts explicit.

  ```ts
  import { asKilowattHour, KilowattHour } from '../lib/units';

  type EngineStepInput = {
    readonly dt_s: number;
    readonly surplus_kW: number;
    readonly battery_soc_kWh: KilowattHour;
  };

  const computeBatteryDelta = (
    input: EngineStepInput,
  ): { readonly nextSoc_kWh: KilowattHour } => {
    const next = Math.max(input.battery_soc_kWh + input.surplus_kW * input.dt_s / 3600, 0);
    return { nextSoc_kWh: asKilowattHour(next) };
  };
  ```

- UI components may manage local React state but should delegate heavy computations to hooks/services backed by the pure core.

## Error Handling
- Do not throw raw errors. Narrow each failure to a domain-specific type or return `Result<T, E>` style structures.
- Convert unknown errors at boundaries (e.g. worker messages) into typed variants before propagating.
- Log only at integration edges (UI handlers, worker supervisors). The pure core must remain silent.
- When logging, provide device/strategy identifiers and timestamps; avoid leaking PII or scenario seeds.

## Testing Rules
- Co-locate unit tests alongside the modules they verify using `*.test.ts`. Feature-wide scenarios live under `tests/`.
- Maintain deterministic fixtures. Freeze random seeds and assert on energy balances per tolerances described in [Metrics & Tests](./metrics_and_tests.md).
- Golden tests capture expected end-to-end outputs (KPIs, timelines). Store canonical JSON/CSV under `tests/__golden__/` and update intentionally.
- Snapshots are allowed for serialized engine outputs but must be small (<200 lines) and reviewed manually.
- Aim for ≥85 % coverage (line + branch). Update the target once CI coverage reports stabilize.

  ```ts
  // tests/__golden__/engine_minimal.test.ts
  import { expect, test } from 'vitest';
  import { runSimulation } from '../../src/engine/runSimulation';
  import summerCase from '../__fixtures__/summer_case.json';
  import engineGolden from '../__golden__/engine_minimal.json';

  test('engine respects energy balance (golden)', async () => {
    const result = await runSimulation(summerCase);
    expect(result.summary).toMatchObject(engineGolden.summary);
    expect(result.timeline).toMatchSnapshot();
  });
  ```

## PR Rules
- Keep pull requests focused: one feature/fix per PR and <400 modified LOC whenever possible.
- Include unit and/or integration tests covering the change. Update documentation and the changelog section relevant to the feature.
- Follow Conventional Commits (`feat:`, `fix:`, `docs:`, `refactor:`…) for commit messages.
- Ensure reviewers can reproduce your results: describe scenarios, commands, and any flags used.

## Dependencies Policy
- Preferred stack: React, Zustand, Recharts, Zod, Vitest, date-fns. Core/engine should avoid UI-centric or heavy runtime dependencies.
- Adding a new dependency requires: assessing bundle impact, confirming license compatibility, and opening an Architecture Decision Record (ADR) under `Docs/adr/`.
- For engine/core modules, prefer zero-dependency utilities. Any math/physics helper must be vetted for determinism and maintainability.

## CI Expectations
- CI runs lint (`npm run lint` when available), `npm run build`, `npm test`, and golden diff checks.
- Keep pipelines green by running the same commands locally before pushing. Use `npm run test:golden` (if provided) to refresh fixtures explicitly.
- Ensure worker builds and TypeScript declarations succeed; fix warnings treated as errors in CI.
- Document any temporary skips with TODOs referencing tracking issues and remove them promptly.
