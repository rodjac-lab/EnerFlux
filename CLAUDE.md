# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

EnerFlux is an open-source laboratory for comparing residential self-consumption strategies (PV, battery, domestic hot water, EV, heating, pool) through deterministic simulation and interactive UI. It operates in "Laboratory Mode" (Mode Laboratoire), enabling side-by-side A/B comparison of allocation strategies across predefined scenarios.

**Primary language**: French (documentation, comments, UI labels)
**Tech stack**: React + TypeScript + Vite, with Vitest for testing

## Essential Commands

### Development
```bash
npm install              # Install dependencies
npm run dev              # Launch Vite dev server (http://localhost:5173)
npm run build            # Production build (outputs to dist/)
npm run preview          # Preview production build
```

### Testing
```bash
npm test                 # Run full test suite (~20s, includes golden tests)
npm run test:watch       # Watch mode for iterative development
npm test -- --update     # Update Vitest snapshots (if needed)
```

**Important**: The test suite includes "golden tests" (`tests/exporter.test.ts`) that validate JSON/CSV export formats. If you intentionally change these formats, update the expectations and justify in your PR.

## Architecture

### Core Simulation Engine (Pure Functional)

The simulation engine follows a strict deterministic, pure-functional architecture:

- **`src/core/engine.ts`**: Main simulation loop orchestrator. Steps through time intervals, collects device power requests, applies strategy allocation, and updates device states.
- **`src/core/strategy.ts`**: Strategy registry and allocation logic. Defines 10+ strategies (from `no_control_offpeak` baseline to `multi_equipment_priority`).
- **`src/core/allocation.ts`**: Priority-based waterfall allocation system. Takes surplus PV and device requests, returns power allocations respecting max/min constraints.
- **`src/core/kpis.ts`**: KPI computation (self-consumption rate, costs, energy flows). Deterministic aggregation from simulation steps.

**Strict rules for core/**:
- **Pure functions only**: No shared mutable state, no I/O, deterministic output
- **Immutability**: Use `readonly` properties, never mutate previous state
- **Type-safe units**: Use branded types (`Watt`, `KilowattHour`, `Celsius`) defined in `src/lib/units` (if exists) or inline type aliases
- **No logging in core**: Logging happens only at integration boundaries (UI, workers)

### Device Abstractions

All devices implement the `Device` interface (`src/devices/Device.ts`):

```typescript
interface Device {
  id: string;
  label: string;
  capabilities: readonly Capability[];  // 'electrical-storage', 'thermal-storage', 'shiftable-load', 'vehicle-charger'
  plan(dt_s: number, ctx: EnvContext): DevicePlan;  // Return power request/offer
  apply(power_kW: number, dt_s: number, ctx: EnvContext): void;  // Update internal state
  state(): Record<string, number | boolean>;  // Export state for KPIs/UI
}
```

**Key devices**:
- **`Battery.ts`**: Electrical storage with SOC tracking, charge/discharge efficiency
- **`DHWTank.ts`**: Domestic hot water tank with thermal physics, water draw events, hysteresis control
- **`EVCharger.ts`**: EV charging sessions with departure deadlines, energy requirements
- **`Heating.ts`**: Heat pump with call-for-heat logic, thermal deficit tracking
- **`PoolPump.ts`**: Pool filtration with daily hour requirements, shiftable scheduling

### Strategy System

Strategies define allocation priority order for surplus PV. Each strategy is a pure function:

```typescript
type Strategy = (context: StrategyContext) => StrategyAllocation[];

interface StrategyContext {
  surplus_kW: number;
  requests: StrategyRequest[];  // Device power requests with state
  time_s: number;
  dt_s: number;
}
```

**10 available strategies** (see `Docs/algorithms_playbook.md` for full pseudocode):
1. `no_control_offpeak` / `no_control_hysteresis` - Baseline reference (no PV optimization)
2. `ecs_first` - Prioritize domestic hot water, then battery
3. `battery_first` - Fill battery before thermal loads
4. `mix_soc_threshold` - Switch priority at SOC threshold (default 50%)
5. `reserve_evening` - Ensure battery reserve before 18h
6. `ev_departure_guard` - Secure EV charging before departure deadline
7. `multi_equipment_priority` - Complex ranking across ECS, heating, EV, pool, battery

**Waterfall allocation**: Strategies sort device requests by priority rank, then allocate surplus top-to-bottom until exhausted.

### ECS (Domestic Hot Water) Subsystem

ECS has special treatment due to comfort criticality and deadline logic:

- **`src/core/ecs/contract.ts`**: Service contract defining comfort parameters (target temp, deadline hours, hysteresis band)
- **`src/core/ecs/helpers.ts`**: Deadline urgency computation, hysteresis state machine
- **`src/core/ecs/kpis.ts`**: ECS-specific KPIs (hit rate, deficit, uptime)
- **`src/devices/DHWTank.ts`**: Physical model with water draw profiles (`light`/`medium`/`heavy` = 120/160/220 L/day)

**Water draw events**: Realistic hot water consumption (showers, dishes) modeled as `WaterDrawEvent[]` with time, volume, cold water temp. This causes tank temperature drops requiring reheating.

### Data Layer

- **`src/data/scenarios.ts`**: 7 predefined scenarios (winter harsh, summer sunny, etc.) with weather profiles + equipment configs
- **`src/data/tariffs.ts`**: Time-of-Use pricing (peak/off-peak hours, import/export rates)
- **`src/data/series.ts`**: Time series generation (PV production curves, base load profiles)
- **`src/data/ecs-service.ts`**: ECS contract defaults and resolution logic

### UI Structure

- **`src/ui/compare/`**: A/B comparison views (main simulation interface)
- **`src/ui/charts/`**: Chart components (`EnergyFlowsChart`, `BatterySocChart`, `DhwPanel`, `DecisionsTimeline`, `EnergyFlowDiagram`)
- **`src/ui/panels/`**: Control panels (scenario selection, strategy pickers, parameter inputs)
- **`src/ui/components/`**: Shared UI components (`ChartFrame`, KPI cards, tooltips)

**Chart system**: All charts follow `CHART_PATTERN.md` conventions:
- Daltonien-friendly palette (consistent colors across charts)
- `ChartFrame` wrapper for titles, subtitles, legends
- Normalized units (`kW`, `kWh`, `€`, `%`, `HH:mm`)
- Tabular tooltips with 30px cursor offset

**3-tab navigation** (as of October 2025):
1. "Simulation" - A/B comparison with 4 synced charts
2. "Flux énergétiques" - Animated energy flow diagrams + Sankey placeholders
3. "Paramètres avancés" - Configuration forms

## Type System Conventions

1. **Prefer `type` over `interface`** for primitives/unions; use `interface` only for extensible contracts
2. **Mark everything `readonly` by default** - mutability must be explicit
3. **Encode units in types** using branded types:
   ```typescript
   type Watt = number & { readonly unit: 'W' };
   type KilowattHour = number & { readonly unit: 'kWh' };
   type Celsius = number & { readonly unit: '°C' };
   ```
4. **Use discriminated unions** for strategy modes to enable exhaustive switches
5. **Never use `any`** - prefer type guards or Zod schemas at boundaries

## Testing Philosophy

### Test Organization
- **Unit tests**: Co-located with modules as `*.test.ts` (e.g., `allocation.test.ts` next to `allocation.ts`)
- **Integration tests**: Feature-wide scenarios in `tests/` directory
- **Golden tests**: `tests/exporter.test.ts` validates canonical JSON/CSV outputs

### Coverage Target
- **≥85% line + branch coverage** (update once CI stabilizes)

### Golden Test Protocol
When changing simulation outputs:
1. Verify changes are intentional (not regressions)
2. Update golden fixtures in `tests/__golden__/` (if exists) or test expectations
3. Document rationale in PR description
4. Include before/after KPI comparison

### Determinism Requirements
- **Freeze random seeds** in fixtures
- **Assert energy balance** within documented tolerances (see `Docs/metrics_and_tests.md`)
- **No flaky tests** - all tests must pass 100% reliably

## Documentation-First Workflow (Mandatory)

**CRITICAL**: Every code change MUST update documentation. See `Agent.md` for full directive.

### Impact Matrix (Code → Docs)
| Code Area | Required Doc Updates |
|-----------|---------------------|
| `src/engine`, `src/core`, strategies | `algorithms_playbook.md`, `metrics_and_tests.md` |
| `src/ui/charts` | `README.md` (screenshots/notes), `development_plan.md` if milestone |
| `src/devices` | `algorithms_playbook.md` (params), `metrics_and_tests.md` (KPIs) |
| Architecture/conventions | `tech_guidelines.md` |
| Progress/roadmap | `development_plan.md`, `status.md` |

### Doc-First Checklist (Per PR)
- [ ] Code + tests (unit/golden if KPI impact)
- [ ] Documentation updated (list affected files in PR)
- [ ] Link to relevant scenarios/metrics
- [ ] PR is focused (<400 LOC when possible)

**Exception**: Internal refactors with no behavioral change may skip docs if justified in PR description.

## Key Files Reference

### Must-Read Documentation
- **`Docs/README.md`**: Documentation index
- **`Docs/product_vision.md`**: Product vision, personas, v2.0 roadmap
- **`Docs/algorithms_playbook.md`**: Strategy matrix, pseudocode, decision logic
- **`Docs/metrics_and_tests.md`**: KPI definitions, test scenarios
- **`Docs/tech_guidelines.md`**: Full coding standards, TypeScript rules, PR protocol
- **`Docs/domain_glossary.md`**: Energy domain terminology (autoconsommation, SOC, ToU, etc.)

### Quick References
- **`CHART_PATTERN.md`**: Chart component conventions
- **`UI_FIXES_SUMMARY.md`**: Recent UI refactoring notes
- **`Agent.md`**: Doc-first workflow guide

## Commit Conventions

Follow Conventional Commits:
- `feat:` - New feature
- `fix:` - Bug fix
- `docs:` - Documentation only
- `refactor:` - Code restructuring (no behavior change)
- `test:` - Test additions/fixes
- `chore:` - Build/tooling changes

## Common Pitfalls

1. **Mutating state in core/**: Core modules must be pure - no `let` variables tracking state across calls
2. **Skipping unit tests**: Every new strategy/device needs unit test coverage
3. **Forgetting docs**: Code without doc updates will be rejected in PR review
4. **Hardcoding units**: Always use typed units (kW, kWh, °C) - never raw numbers
5. **Breaking golden tests**: If export format changes, update expectations AND document why
6. **Ignoring energy balance**: Simulation must conserve energy (PV + Grid = Load + Battery + Export)
7. **Adding dependencies without ADR**: New dependencies require Architecture Decision Record in `Docs/adr/`

## Folder Structure
```
/
├─ Docs/              # Product docs, technical specs, glossary
├─ src/
│  ├─ core/          # Simulation engine (pure functions)
│  │  └─ ecs/        # ECS subsystem (contracts, helpers, KPIs)
│  ├─ devices/       # Device implementations (Battery, DHWTank, etc.)
│  ├─ data/          # Scenarios, tariffs, series generators
│  ├─ ui/
│  │  ├─ charts/     # Recharts components
│  │  ├─ compare/    # A/B comparison views
│  │  ├─ panels/     # Control panels
│  │  └─ components/ # Shared UI components
│  ├─ lib/           # Cross-cutting utilities (units, schemas)
│  └─ workers/       # Web Workers (if async simulation needed)
├─ tests/            # Integration tests + golden tests
└─ package.json
```

## When Implementing New Features

1. **Understand the domain first**: Read `domain_glossary.md` and `algorithms_playbook.md`
2. **Plan with docs**: Draft algorithm pseudocode in `algorithms_playbook.md` BEFORE coding
3. **Define KPIs**: If feature affects metrics, update `metrics_and_tests.md` definitions
4. **Write tests first**: Create test cases covering expected behavior
5. **Implement in core**: Pure functions in `src/core` or devices in `src/devices`
6. **Add UI if needed**: Follow `CHART_PATTERN.md` for new visualizations
7. **Update scenarios**: Add test scenarios in `tests/` if new edge cases
8. **Validate energy balance**: Ensure simulation conserves energy
9. **Update docs**: Mark deliverables complete in `development_plan.md` and `status.md`

## CI/CD Expectations

CI pipeline runs:
- Lint checks (when `npm run lint` exists)
- `npm run build` - Must succeed with no warnings
- `npm test` - All tests must pass
- Golden diff validation - Export formats must match expectations

**Pre-push checklist**:
- [ ] `npm test` passes locally
- [ ] `npm run build` succeeds
- [ ] Documentation updated
- [ ] No TypeScript errors/warnings

## Getting Help

- **Slack/Issues**: Report bugs/request features at the repository's GitHub Issues
- **Documentation index**: Start at `Docs/README.md`
- **Architecture questions**: Check `tech_guidelines.md` first
- **Strategy logic**: See `algorithms_playbook.md` with pseudocode examples
- **Domain terminology**: Consult `domain_glossary.md` for definitions
