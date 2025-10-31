# Phase 5: UI Mode Coach — Design Document

**Date**: 2025-01-26
**Status**: 🎯 EN COURS
**Objectif**: Intégrer le Mode Coach Prédictif dans l'UI existante avec réutilisation maximale des composants

---

## Question Critique: Comparaison A/B ou Vue Unique?

### Option 1: Vue unique (MPC seul) ✅ RECOMMANDÉ

**Rationale**:
- Mode Coach = **prédictif** (7 jours avec forecast) vs Mode Labo = **pédagogique** (24h statique)
- La valeur est dans la **planification hebdomadaire**, pas la comparaison stratégies
- Le narrateur IA (Phase 3) **explique les décisions MPC** → pas besoin de comparer
- Comparaison A/B reste dans Mode Laboratoire pour comprendre les stratégies

**UX Flow**:
```
Mode Coach Tab:
├─ Week Calendar (7 jours)
├─ Forecast Display (météo + tarifs Tempo)
├─ MPC Strategy Selector (4 heuristiques)
├─ Weekly KPIs (cumulés 7j)
├─ Narrative Cards (insights IA)
└─ Daily Detail (drill-down journalier optionnel)
```

**Avantages**:
- ✅ Focus sur **planification future** (use case différent de Mode Labo)
- ✅ Narrateur IA comme "guide coach" (plus besoin de comparer manuellement)
- ✅ UI plus simple, moins de surcharge cognitive
- ✅ Réutilisation composants (KPICards, CollapsibleCard, ChartFrame)

---

### Option 2: Comparaison A/B (MPC vs Baseline)

**Rationale**:
- Montrer **gains MPC** vs stratégie réactive baseline
- Cohérence avec Mode Labo (même pattern UI)

**UX Flow**:
```
Mode Coach Tab:
├─ Week Calendar
├─ Strategy Selection A (MPC) | B (Baseline reactive)
├─ Weekly KPIs A vs B (comme Mode Labo)
├─ Narrative Cards (comparison insights)
└─ Daily Charts A vs B
```

**Inconvénients**:
- ⚠️ Duplication UI (même pattern que Mode Labo)
- ⚠️ Surcharge cognitive (déjà comparé en Mode Labo, pourquoi re-comparer en Mode Coach?)
- ⚠️ Narrateur IA **explique déjà les gains** → A/B moins nécessaire
- ⚠️ Plus complexe à implémenter (2x simulations hebdo, sync, etc.)

---

## Décision: Option 1 (Vue Unique MPC)

**Justification**:
1. **Séparation use cases clairs**:
   - Mode Labo = Comprendre stratégies (comparaison pédagogique)
   - Mode Coach = Planifier sa semaine (prédictif assisté IA)

2. **Narrateur IA comme "comparateur implicite"**:
   - Insights générés par `generateWeeklyNarrative()` montrent déjà les gains vs baseline
   - Ex: "En anticipant le jour Tempo ROUGE du 19/03, MPC économise 4.20€ vs stratégie réactive"

3. **Réutilisation composants sans duplication pattern**:
   - Gardons KPICards, CollapsibleCard, ChartFrame
   - Mais pas le layout A/B column (spécifique Mode Labo)

**Si l'utilisateur veut comparer**:
- Lancer 2 simulations séparées (Mode Labo 24h avec différentes stratégies)
- Mode Coach = **outil de planning**, pas comparateur

---

## Composants Existants Réutilisables

### 1. Layout & Structure
- ✅ `CollapsibleCard` - Cards avec header/collapse (parfait pour insights narratifs)
- ✅ Tab navigation pattern (déjà 3 tabs: Simulation, Flux, Paramètres)
- ✅ `.rounded-lg .border .border-slate-200 .bg-white .p-6 .shadow-sm` - Style uniforme

### 2. KPI Display
- ✅ `KPICards` - Grid de métriques avec bars comparatives
  - **Adaptation**: Single column (pas A vs B), mais gardons style
  - Métriques hebdo: `weeklyKPIs` au lieu de `kpis.A` / `kpis.B`

### 3. Charts
- ✅ `ChartFrame` - Wrapper Recharts avec titre/sous-titre/légende
- ✅ `EnergyFlowsChart` - Graph flux énergétiques (réutilisable pour daily drill-down)
- ✅ `BatterySocChart` - SOC batterie (affichable par jour dans detail view)
- ⚠️ `DecisionsTimeline` - Moins pertinent (MPC = décisions automatiques, pas besoin timeline)

### 4. Forms & Inputs
- ✅ Style input existant (`.rounded-md .border-slate-300 .px-3 .py-2`)
- ✅ `FieldLabel` component
- ✅ `Tooltip` component (help icons)

### 5. Colors & Theme
- ✅ `chartTheme.ts` - Palette Daltonien-friendly
- ✅ Tailwind classes slate/indigo/emerald

---

## Architecture Proposée Phase 5

### Nouvelle Structure Tabs

```typescript
// App.tsx
const [activeTab, setActiveTab] = useState<'overview' | 'energy-flows' | 'coach' | 'advanced'>('overview');
```

**4 tabs**:
1. **Simulation** (Mode Labo 24h, comparaison A/B) - EXISTANT
2. **Flux énergétiques** - EXISTANT
3. **Coach Prédictif** (7 jours, MPC, narrateur IA) - **NOUVEAU**
4. **Paramètres avancés** - EXISTANT

---

### Nouveaux Composants Mode Coach

#### `src/ui/coach/CoachView.tsx`
```typescript
interface CoachViewProps {
  // Config PV system (pour DataProvider)
  pvSystem: PVSystemConfig;
  location: string; // "lat,lon"

  // Équipements (réutilise state App.tsx)
  battery: BatteryParams;
  dhw: DHWTankParams;
  pool?: PoolFormState;
  ev?: EVFormState;
  heating?: HeatingFormState;

  // MPC config
  mpcStrategy: MPCStrategyId;
  dataProviderMode: 'mock' | 'free' | 'real';
  openWeatherApiKey?: string;
}
```

**Responsabilités**:
- Fetch weekly forecast via `DataProviderFactory`
- Run `runWeeklySimulation()`
- Generate `WeeklyNarrative` via `generateWeeklyNarrative()`
- Display results

---

#### `src/ui/coach/WeekCalendar.tsx`
```typescript
interface WeekCalendarProps {
  forecast: WeeklyForecast;
  selectedDay: number; // 0-6
  onDaySelect: (day: number) => void;
}
```

**UI**:
```
┌─────────────────────────────────────────────────┐
│ Semaine du 17 au 23 mars 2025                  │
├──────┬──────┬──────┬──────┬──────┬──────┬──────┤
│ Lun  │ Mar  │ Mer  │ Jeu  │ Ven  │ Sam  │ Dim  │
│ 17/03│ 18/03│ 19/03│ 20/03│ 21/03│ 22/03│ 23/03│
│      │      │      │      │      │      │      │
│ ☀️   │ ⛅   │ ☁️   │ ☀️   │ ☀️   │ ⛅   │ ☀️   │
│ 28kWh│ 18kWh│ 12kWh│ 25kWh│ 30kWh│ 22kWh│ 27kWh│
│      │      │      │      │      │      │      │
│ 🔵   │ ⚪   │ 🔴   │ 🔵   │ 🔵   │ ⚪   │ 🔵   │
│ BLUE │WHITE │ RED  │ BLUE │ BLUE │WHITE │ BLUE │
└──────┴──────┴──────┴──────┴──────┴──────┴──────┘
```

**Réutilise**: Style cards existant, `.rounded-lg .border .bg-white`

---

#### `src/ui/coach/NarrativeCards.tsx`
```typescript
interface NarrativeCardsProps {
  narrative: WeeklyNarrative;
  maxInsights?: number; // Default 10
}
```

**UI** (réutilise `CollapsibleCard`):
```tsx
<CollapsibleCard
  title={insight.title}
  description={insight.category}
  defaultOpen={insight.priority === 'high'}
>
  <div className="space-y-2">
    <p className="text-sm text-slate-600">{insight.description}</p>
    {insight.value !== undefined && (
      <div className="flex items-center gap-2">
        <span className="text-2xl font-bold text-indigo-600">
          {insight.value.toFixed(insight.unit === '€' ? 2 : 1)}
        </span>
        <span className="text-sm text-slate-500">{insight.unit}</span>
      </div>
    )}
  </div>
</CollapsibleCard>
```

**Style insights par catégorie**:
```typescript
const INSIGHT_STYLES = {
  opportunity: { icon: '💡', color: 'text-emerald-600', bg: 'bg-emerald-50' },
  warning: { icon: '⚠️', color: 'text-amber-600', bg: 'bg-amber-50' },
  achievement: { icon: '🎯', color: 'text-indigo-600', bg: 'bg-indigo-50' },
  tip: { icon: '📌', color: 'text-slate-600', bg: 'bg-slate-50' }
};
```

---

#### `src/ui/coach/WeeklyKPICards.tsx`
```typescript
interface WeeklyKPICardsProps {
  kpis: WeeklyKPIs; // from runWeeklySimulation result
}
```

**Réutilise**: Structure `KPICards.tsx` mais single column (pas A vs B)

**Métriques affichées**:
- Production PV (kWh)
- Autoconsommation (%)
- Import/Export (kWh)
- Coût net (€)
- Confort ECS (% temps ≥ cible)

---

#### `src/ui/coach/MPCStrategySelector.tsx`
```typescript
interface MPCStrategySelectorProps {
  selected: MPCStrategyId;
  onChange: (id: MPCStrategyId) => void;
}
```

**4 stratégies disponibles**:
1. `mpc_sunny_tomorrow` - Priorise ECS si soleil demain
2. `mpc_cloudy_tomorrow` - Priorise batterie si nuageux demain
3. `mpc_tempo_red_guard` - Réserve batterie avant jour ROUGE
4. `mpc_balanced` - Équilibre adaptatif (recommandé)

**UI**: Dropdown simple (réutilise style existant)

---

### Layout Complet Mode Coach

```tsx
// CoachView.tsx structure
<div className="space-y-6">
  {/* Header avec sélecteurs */}
  <div className="grid gap-6 lg:grid-cols-2">
    <MPCStrategySelector selected={mpcStrategy} onChange={setMpcStrategy} />
    <DataProviderSelector mode={providerMode} onChange={setProviderMode} />
  </div>

  {/* Week Calendar */}
  <WeekCalendar
    forecast={forecast}
    selectedDay={selectedDay}
    onDaySelect={setSelectedDay}
  />

  {/* Weekly KPIs */}
  <WeeklyKPICards kpis={result.weeklyKPIs} />

  {/* AI Narrative (insights cards) */}
  <section className="space-y-4">
    <h2 className="text-lg font-semibold text-slate-900">
      Conseils du Coach IA
    </h2>
    <NarrativeCards narrative={narrative} maxInsights={10} />
  </section>

  {/* Daily Detail (optionnel, drill-down sur jour sélectionné) */}
  {selectedDay !== null && (
    <CollapsibleCard
      title={`Détail du ${formatDate(forecast.weather[selectedDay].date)}`}
      defaultOpen={false}
    >
      <DailyDetailView
        day={selectedDay}
        result={result.dailyResults[selectedDay]}
      />
    </CollapsibleCard>
  )}
</div>
```

---

## Réutilisation Maximale

| Composant Existant | Réutilisation Mode Coach |
|-------------------|-------------------------|
| `CollapsibleCard` | ✅ Narrative insights, daily detail |
| `KPICards` style | ✅ WeeklyKPICards (single column) |
| `ChartFrame` | ✅ Daily detail charts |
| Tab navigation | ✅ Ajout 4ème tab "Coach Prédictif" |
| Tailwind classes | ✅ 100% cohérence visuelle |
| `Tooltip` | ✅ Help icons stratégies MPC |
| Form inputs style | ✅ Strategy selector, provider config |
| `chartTheme.ts` palette | ✅ Si charts daily detail |

**Composants NON réutilisés**:
- ❌ `ABCompareLayout` - Spécifique Mode Labo
- ❌ `StrategyPanel` A/B - Mode Coach = single strategy
- ❌ `CompareAB` - Pattern différent

---

## Flux Utilisateur Mode Coach

### 1. Première visite
```
1. User clique tab "Coach Prédictif"
2. Message prompt: "Configurez votre installation PV et localisation"
3. Form simple:
   - Puissance crête (kWp)
   - Localisation (Paris par défaut)
   - Mode provider (Mock/Free/Real)
4. Click "Lancer prévision hebdomadaire"
5. Affichage résultats + narrateur IA
```

### 2. Usage récurrent
```
1. Tab "Coach Prédictif" → Dernière simulation chargée
2. Week calendar affiche semaine actuelle + 7j
3. Narrative cards en haut (high priority d'abord)
4. KPIs hebdo en un coup d'œil
5. Drill-down optionnel sur jour spécifique
```

### 3. Ajustements
```
1. Change MPC strategy → Re-run simulation
2. Change provider mode (mock → free → real) → Re-fetch forecast
3. Équipements (batterie, ECS) synchronisés avec Mode Labo (state partagé App.tsx)
```

---

## État Partagé vs Isolé

### État Partagé (App.tsx)
- ✅ `batteryParams` - Batterie commune Mode Labo + Coach
- ✅ `dhwParams` - ECS commune
- ✅ `pool`, `ev`, `heating` - Équipements communs
- ✅ `ecsService` - Contrat ECS commun

**Rationale**: Configuration matérielle identique, seule la simulation change

### État Isolé (CoachView.tsx)
- ✅ `mpcStrategy` - Spécifique Mode Coach
- ✅ `dataProviderMode` - Mock/Free/Real
- ✅ `pvSystem` - Config PV (puissance, orientation)
- ✅ `location` - Localisation (lat,lon)
- ✅ `forecast` - Données météo/tarifs
- ✅ `weeklyResult` - Résultat simulation 7j
- ✅ `narrative` - Insights IA
- ✅ `selectedDay` - Jour drill-down

---

## Performance Considerations

### Temps Simulation Hebdomadaire
- Target: < 3s (7 jours × ~400ms par jour)
- Solution: Web Worker déjà existant (`src/workers/sim.worker.ts`)
- Adaptation: Ajouter `runWeeklySimulation` dans worker

### Caching Forecast
- Forecast météo/tarifs cache 3h (éviter appels API répétés)
- LocalStorage: Dernière simulation pour reload rapide

### Lazy Loading
- Mode Coach tab charge composants à la demande (React.lazy)
- Narrative cards: Virtualization si > 20 insights

---

## Accessibilité

- ✅ Tab navigation keyboard-friendly (déjà implémenté)
- ✅ Insights cards aria-expanded pour CollapsibleCard
- ✅ Week calendar: aria-label dates + Tempo colors
- ✅ KPIs: aria-live pour updates simulation
- ✅ Focus management lors changement tab

---

## Mobile Responsiveness

- Week calendar: Scroll horizontal sur mobile
- KPI cards: Grid 1 col mobile, 2 cols tablet, 3 cols desktop
- Narrative cards: Stack vertical toujours
- Daily detail: Collapse par défaut mobile

---

## Animation Strategy: Plotset-Style Cinematic Reveal 🎬

**Inspiration**: [Plotset Gallery #3](https://plotset.com/gallery/3.mp4) - Révélation fluide et cinématographique des données.

**Concept**: **UNE SEULE animation continue** (pas étape par étape), avec:
- Fade-in progressif de tous les éléments
- Morphing smooth des charts (line drawing continu)
- Counters qui montent de façon fluide (pas saccadé)
- Parallax subtil entre layers
- Effet "travelling" cinématique

### Séquence d'Animation Continue (6-8 secondes total)

```
t = 0s     ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
           • Background fade-in (opacity 0 → 1, 800ms)
           • Title slide-down + fade-in (from top)

t = 0.3s   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
           • Week calendar apparaît (fade-in + scale 0.95 → 1)
           • Tous les jours ensemble (pas un par un!)
           • Météo icons fade-in avec stagger subtil (50ms entre chaque)
           • Tempo badges fade-in en cascade

t = 0.8s   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
           • Charts container slide-up + fade-in
           • Line charts commencent à se dessiner (strokeDashoffset animation)
           • Drawing progressif de 0% → 100% sur 3-4 secondes
           • Smooth, pas de "steps" visibles

t = 1.2s   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
           • KPI cards fade-in + slide-up (stagger 100ms entre cards)
           • Counters commencent à monter (easing smooth, pas linéaire)
           • 0 → valeur finale sur 2.5 secondes (easeOutQuart)

t = 1.5s   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
           • Narrative cards apparaissent (fade-in + slide-left)
           • Stagger 150ms entre insights (high priority d'abord)
           • Subtle parallax: insights bougent légèrement plus lent que background

t = 4-6s   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
           • Tous les éléments complètement visibles
           • Charts drawing terminé
           • Counters à valeur finale
           • Subtle idle animations (floating, breathing)

t = 6s+    ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
           ✅ Animation complète, interface interactive
           • User peut hover, click, explore
           • Subtle micro-interactions (hover effects, etc.)
```

**Clé**: Tout est **overlapping** et **fluide**, pas discret step-by-step.

### Composants Animés (Style Plotset)

#### 1. **WeekCalendar - Révélation Fluide**
```tsx
// Container: fade-in + subtle scale
<div
  className="week-calendar-container"
  style={{
    animation: 'fadeInScale 1000ms cubic-bezier(0.16, 1, 0.3, 1) 300ms both'
  }}
>
  {/* Tous les jours ensemble, stagger subtil entre icons */}
  {forecast.weather.map((day, idx) => (
    <div
      key={day.date}
      className="calendar-day"
      style={{
        opacity: 0,
        animation: `fadeIn 800ms ease-out ${300 + idx * 50}ms both`
      }}
    >
      {/* Météo icon: fade-in delayed */}
      <span
        className="weather-icon"
        style={{
          opacity: 0,
          animation: `fadeIn 600ms ease-out ${400 + idx * 50}ms both`
        }}
      >
        {day.icon}
      </span>

      {/* Tempo badge: cascade subtle */}
      <span
        className={`tempo-badge tempo-${day.tempoColor?.toLowerCase()}`}
        style={{
          opacity: 0,
          animation: `fadeIn 600ms ease-out ${500 + idx * 50}ms both`
        }}
      >
        {day.tempoColor}
      </span>

      {/* PV production: counter fade-in */}
      <span
        className="pv-total"
        style={{
          opacity: 0,
          animation: `fadeIn 600ms ease-out ${600 + idx * 50}ms both`
        }}
      >
        <CountUp end={day.pvTotal_kWh} duration={2500} delay={600 + idx * 50} />
      </span>
    </div>
  ))}
</div>
```

**CSS Keyframes (Smooth, Plotset-style)**:
```css
/* Easing curves inspired by Plotset */
@keyframes fadeInScale {
  from {
    opacity: 0;
    transform: scale(0.96) translateY(10px);
  }
  to {
    opacity: 1;
    transform: scale(1) translateY(0);
  }
}

@keyframes fadeIn {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

/* Subtle parallax effect (optionnel) */
.week-calendar-container {
  transform-style: preserve-3d;
}

.calendar-day:hover {
  transform: translateZ(10px);
  transition: transform 300ms cubic-bezier(0.16, 1, 0.3, 1);
}
```

---

#### 2. **WeeklyKPICards - Counters Fluides (Plotset-style)**
```tsx
// Hook counter avec easing smooth (comme Plotset)
const useCountUp = (end: number, duration: number, delay: number) => {
  const [count, setCount] = useState(0);
  const rafRef = useRef<number>();

  useEffect(() => {
    const startTime = performance.now() + delay;

    const animate = (currentTime: number) => {
      const elapsed = currentTime - startTime;

      if (elapsed < 0) {
        // Still waiting for delay
        rafRef.current = requestAnimationFrame(animate);
        return;
      }

      const progress = Math.min(elapsed / duration, 1);

      // Easing: easeOutQuart (Plotset-style smooth deceleration)
      const eased = 1 - Math.pow(1 - progress, 4);

      setCount(end * eased);

      if (progress < 1) {
        rafRef.current = requestAnimationFrame(animate);
      } else {
        setCount(end); // Ensure exact final value
      }
    };

    rafRef.current = requestAnimationFrame(animate);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [end, duration, delay]);

  return count;
};

// Dans WeeklyKPICards (tous les counters en parallèle, stagger subtil)
const METRICS = [
  { key: 'pvProduction_kWh', label: 'Production PV', unit: 'kWh', delay: 1200 },
  { key: 'selfConsumption_percent', label: 'Autoconso', unit: '%', delay: 1300 },
  { key: 'import_kWh', label: 'Import', unit: 'kWh', delay: 1400 },
  { key: 'export_kWh', label: 'Export', unit: 'kWh', delay: 1500 },
  { key: 'netCost_eur', label: 'Coût', unit: '€', delay: 1600 },
  { key: 'ecsUptime_percent', label: 'Confort ECS', unit: '%', delay: 1700 }
];

{METRICS.map((metric, idx) => {
  const value = useCountUp(
    weeklyKPIs[metric.key],
    2500, // Duration: 2.5s
    metric.delay
  );

  return (
    <div
      key={metric.key}
      className="kpi-card"
      style={{
        opacity: 0,
        animation: `fadeInUp 800ms cubic-bezier(0.16, 1, 0.3, 1) ${metric.delay}ms both`
      }}
    >
      <div className="kpi-label">{metric.label}</div>
      <div className="kpi-value">
        {formatValue(value, metric.unit)}
      </div>
    </div>
  );
})}
```

**Fade-in cards avec slide-up subtle**:
```css
@keyframes fadeInUp {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
```

---

#### 3. **Charts: Smooth Line Drawing (Plotset-style) ✨**

**Concept clé**: Line path qui se "dessine" progressivement avec **strokeDashoffset**, comme dans la vidéo Plotset.

```tsx
// SVG Path Animation (contrôle total, smooth comme Plotset)
const WeeklyChart: React.FC<{ data: DailyResult[] }> = ({ data }) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const pathRef = useRef<SVGPathElement>(null);
  const [pathLength, setPathLength] = useState(0);

  useEffect(() => {
    if (pathRef.current) {
      const length = pathRef.current.getTotalLength();
      setPathLength(length);

      // Set initial state (invisible)
      pathRef.current.style.strokeDasharray = `${length}`;
      pathRef.current.style.strokeDashoffset = `${length}`;
    }
  }, [data]);

  return (
    <div
      className="chart-container"
      style={{
        opacity: 0,
        animation: 'fadeIn 800ms ease-out 800ms both'
      }}
    >
      <svg ref={svgRef} viewBox="0 0 800 300" className="w-full">
        {/* Grid background (fade-in d'abord) */}
        <g className="grid" style={{ opacity: 0, animation: 'fadeIn 400ms ease-out 900ms both' }}>
          {/* Grid lines... */}
        </g>

        {/* Line path qui se dessine */}
        <path
          ref={pathRef}
          d={generateLinePath(data)} // Fonction pour créer path SVG
          stroke="#10b981"
          strokeWidth={3}
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
          style={{
            strokeDasharray: pathLength,
            strokeDashoffset: pathLength,
            animation: `drawLine 3500ms cubic-bezier(0.16, 1, 0.3, 1) 1000ms forwards`
          }}
        />

        {/* Area fill qui apparaît progressivement (optionnel) */}
        <path
          d={generateAreaPath(data)}
          fill="url(#gradient)"
          opacity={0}
          style={{
            animation: 'fadeIn 1000ms ease-out 2500ms both'
          }}
        />

        {/* Gradient definition */}
        <defs>
          <linearGradient id="gradient" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#10b981" stopOpacity={0.2} />
            <stop offset="100%" stopColor="#10b981" stopOpacity={0} />
          </linearGradient>
        </defs>

        {/* Data points qui apparaissent après line drawing */}
        {data.map((point, idx) => (
          <circle
            key={idx}
            cx={getX(idx)}
            cy={getY(point.value)}
            r={4}
            fill="#10b981"
            style={{
              opacity: 0,
              animation: `fadeIn 300ms ease-out ${2500 + idx * 100}ms both`
            }}
          />
        ))}
      </svg>
    </div>
  );
};

// Helper: Generate SVG path from data
const generateLinePath = (data: DailyResult[]): string => {
  const points = data.map((d, idx) => ({
    x: (idx / (data.length - 1)) * 800,
    y: 250 - (d.value / maxValue) * 200
  }));

  let path = `M ${points[0].x} ${points[0].y}`;
  for (let i = 1; i < points.length; i++) {
    // Smooth curve (cubic bezier) pour effet fluide
    const cp1x = points[i - 1].x + (points[i].x - points[i - 1].x) / 2;
    const cp1y = points[i - 1].y;
    const cp2x = points[i].x - (points[i].x - points[i - 1].x) / 2;
    const cp2y = points[i].y;

    path += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${points[i].x} ${points[i].y}`;
  }

  return path;
};
```

**CSS Keyframe (line drawing)**:
```css
@keyframes drawLine {
  to {
    strokeDashoffset: 0;
  }
}

/* Easing curve importante: cubic-bezier(0.16, 1, 0.3, 1) = easeOutExpo */
/* Donne l'effet "smooth deceleration" comme Plotset */
```

**Alternative Recharts** (si préféré, moins contrôle mais plus simple):
```tsx
<ResponsiveContainer width="100%" height={300}>
  <LineChart data={weeklyData}>
    <Line
      type="monotone"
      dataKey="value"
      stroke="#10b981"
      strokeWidth={3}
      dot={{ r: 4, fill: '#10b981' }}
      isAnimationActive={true}
      animationDuration={3500}
      animationEasing="ease-out"
      animationBegin={1000} // Delay 1s
    />
    <XAxis dataKey="day" />
    <YAxis />
    <Tooltip />
  </LineChart>
</ResponsiveContainer>
```

---

#### 4. **NarrativeCards: Subtle Slide-In (Plotset-style)**

```tsx
// Narrative insights apparaissent avec stagger fluide
{narrative.insights.map((insight, idx) => (
  <CollapsibleCard
    key={insight.id}
    title={insight.title}
    defaultOpen={insight.priority === 'high'}
    style={{
      opacity: 0,
      animation: `slideInLeft 800ms cubic-bezier(0.16, 1, 0.3, 1) ${1500 + idx * 150}ms both`
    }}
  >
    <div className="space-y-2">
      <p className="text-sm text-slate-600">{insight.description}</p>
      {insight.value !== undefined && (
        <div className="flex items-center gap-2">
          <span className="text-2xl font-bold text-indigo-600">
            <CountUp end={insight.value} duration={1500} delay={1500 + idx * 150 + 400} />
          </span>
          <span className="text-sm text-slate-500">{insight.unit}</span>
        </div>
      )}
    </div>
  </CollapsibleCard>
))}
```

**CSS (slide from left, subtle)**:
```css
@keyframes slideInLeft {
  from {
    opacity: 0;
    transform: translateX(-30px);
  }
  to {
    opacity: 1;
    transform: translateX(0);
  }
}
```

---

### Contrôles Simplifiés (Plotset-style)

**Principe**: Animation auto-play UNE fois au chargement, puis interface interactive.

```tsx
// Simple state: animé ou non
const [hasAnimated, setHasAnimated] = useState(false);

useEffect(() => {
  // Auto-trigger animation au mount
  const timer = setTimeout(() => {
    setHasAnimated(true);
  }, 500); // Small delay before starting

  return () => clearTimeout(timer);
}, []);

// Optionnel: Skip button discret en haut à droite
{!hasAnimated && (
  <button
    onClick={() => setHasAnimated(true)}
    className="absolute top-4 right-4 text-sm text-slate-400 hover:text-slate-600 transition-colors"
  >
    Passer l'animation →
  </button>
)}

// Ou refresh button pour rejouer
{hasAnimated && (
  <button
    onClick={() => {
      setHasAnimated(false);
      // Re-trigger animation
      setTimeout(() => setHasAnimated(true), 50);
    }}
    className="text-sm text-slate-500 hover:text-slate-700"
    title="Rejouer l'animation"
  >
    🔄
  </button>
)}
```

**Pas de pause/play** - comme Plotset, c'est une **révélation unique** au chargement, puis interface statique explorable.

---

### Performance & Accessibilité

**Performance (GPU-accelerated)**:
- ✅ Utiliser `transform` et `opacity` (pas `left/top/width`)
- ✅ `will-change: transform` sur éléments animés
- ✅ `requestAnimationFrame` pour counters (voir useCountUp ci-dessus)
- ✅ Animations CSS quand possible (meilleures perfs que JS)

**Accessibilité**:
```tsx
// Respecter prefers-reduced-motion
const prefersReducedMotion = useMediaQuery('(prefers-reduced-motion: reduce)');

// Si reduced motion, skip animations (instant reveal)
const animationDuration = prefersReducedMotion ? 0 : 600;

// Announce to screen readers
<div aria-live="polite" className="sr-only">
  Prévisions pour la semaine du {formatDate(startDate)}.
  Production totale: {weeklyKPIs.pvProduction_kWh.toFixed(0)} kWh.
</div>
```

---

## Questions Ouvertes

1. **API Key Storage** (OpenWeather mode real):
   - LocalStorage (simple, pas sécurisé)
   - Env var (dev only)
   - Backend proxy (v2.0+)

2. **Forecast Update Frequency**:
   - Manual refresh button?
   - Auto-refresh daily à 11h (post-Tempo annonce)?
   - Stale indicator si forecast > 24h?

3. **Animation Defaults**:
   - Auto-play ON par défaut? (recommandé oui, mais skip button visible)
   - Speed 1× par défaut? (oui)
   - Rejouer automatiquement si changement stratégie MPC?

---

## Prochaines Étapes

1. **Validation Design** (cette doc) avec utilisateur ✅
2. **Create CoachView.tsx skeleton**
3. **Implement WeekCalendar component**
4. **Implement NarrativeCards component**
5. **Implement WeeklyKPICards component**
6. **Wire DataProvider integration**
7. **Add Web Worker support for weekly simulation**
8. **Testing & polish**

---

**Décision requise**: Option 1 (Vue unique MPC) ou Option 2 (A/B comparison)?

**Recommandation**: **Option 1** pour raisons exposées ci-dessus.
