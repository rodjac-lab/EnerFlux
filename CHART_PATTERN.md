# Guide : Créer un Nouveau Chart

Ce guide explique comment créer un nouveau composant chart cohérent avec le thème unifié d'EnerFlux.

---

## 📐 Template de Base

```tsx
import React, { useMemo } from 'react';
import { LineChart, Line, CartesianGrid, XAxis, YAxis, Tooltip } from 'recharts';
import ChartFrame, { DefaultTooltip } from '../ChartFrame';
import { chartFont, fmt, metricColorMap } from '../chartTheme';
import { useChartSync } from '../chartSync';

interface MyChartProps {
  data: MyDataType[];
  variant: 'A' | 'B';
}

const MyChart: React.FC<MyChartProps> = ({ data, variant }) => {
  const { hoverTs, setHoverTs } = useChartSync();

  const chartData = useMemo(() =>
    data.map(point => ({
      hour: point.hour,
      value: point.value,
      t_s: point.t_s
    })),
    [data]
  );

  return (
    <ChartFrame
      title={`Mon Chart — stratégie ${variant}`}
      subtitle="Description du chart"
      minHeight={240} // Hauteur minimale en pixels
      legend={true}  // Afficher la légende
    >
      <LineChart
        data={chartData}
        onMouseMove={(state) => {
          const payload = state?.activePayload?.[0]?.payload;
          if (payload) setHoverTs(payload.t_s);
        }}
        onMouseLeave={() => setHoverTs(null)}
        margin={{ top: 8, right: 24, left: 0, bottom: 32 }}
      >
        <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />

        <XAxis
          type="number"
          dataKey="hour"
          domain={['dataMin', 'dataMax']}
          tickFormatter={(value) => fmt.time(value)}
          tick={{ fontFamily: chartFont.family, fontSize: chartFont.sizes.tick, fill: '#475569' }}
          axisLine={{ stroke: '#CBD5F5' }}
          tickLine={{ stroke: '#CBD5F5' }}
        />

        <YAxis
          tickFormatter={(value) => fmt.kw(value)} // ou fmt.kwh, fmt.eur, fmt.pct
          tick={{ fontFamily: chartFont.family, fontSize: chartFont.sizes.tick, fill: '#475569' }}
          axisLine={{ stroke: '#CBD5F5' }}
          tickLine={{ stroke: '#CBD5F5' }}
        />

        <Tooltip
          content={(props) => <DefaultTooltip {...props} />}
          formatter={(value: number, name) => [fmt.kw(value), name]}
          labelFormatter={(value) => fmt.time(value as number)}
        />

        <Line
          type="monotone"
          dataKey="value"
          stroke={metricColorMap.pv} // Choisir la couleur appropriée
          strokeWidth={2}
          dot={false}
          name="Ma Série"
        />
      </LineChart>
    </ChartFrame>
  );
};

export default MyChart;
```

---

## 🎨 Palette de Couleurs

Utiliser `metricColorMap` pour une cohérence garantie :

```tsx
import { metricColorMap, seriesColorFor } from '../chartTheme';

// Couleurs prédéfinies
metricColorMap.pv          // #F0E442 - jaune vif (production PV)
metricColorMap.load        // #0072B2 - bleu profond (charge maison)
metricColorMap.battery     // #009E73 - vert sarcelle (batterie)
metricColorMap.grid        // #D55E00 - vermillon (réseau)
metricColorMap.dhw         // #CC79A7 - magenta (ECS)
metricColorMap.ev          // #56B4E9 - bleu ciel (VE/PAC/Piscine)

// Couleur dynamique pour métriques inconnues
seriesColorFor('myMetric') // Génère une couleur stable basée sur le hash du nom
```

### Créer des Variantes de Transparence

```tsx
// Fonction helper pour alpha
const withAlpha = (hex: string, alpha: number): string => {
  const match = /^#?([\da-f]{2})([\da-f]{2})([\da-f]{2})$/i.exec(hex);
  if (!match) return hex;
  const [, r, g, b] = match;
  return `rgba(${parseInt(r, 16)}, ${parseInt(g, 16)}, ${parseInt(b, 16)}, ${alpha})`;
};

// Utilisation
fill={withAlpha(metricColorMap.battery, 0.3)} // 30% opacité
```

---

## 📏 Formatters Disponibles

```tsx
import { fmt } from '../chartTheme';

fmt.time(14.5)    // "14:30"
fmt.kw(1234)      // "1.2 kW"
fmt.kwh(5.678)    // "5.68 kWh"
fmt.eur(1234.56)  // "1235 €"
fmt.pct(0.8567)   // "86%"
```

---

## 🔄 Synchronisation du Hover

Pour synchroniser le hover entre charts dans une layout A/B :

```tsx
import { useChartSync } from '../chartSync';

const { hoverTs, setHoverTs } = useChartSync();

// Dans le chart
<LineChart
  onMouseMove={(state) => {
    const payload = state?.activePayload?.[0]?.payload;
    if (payload) setHoverTs(payload.t_s);
  }}
  onMouseLeave={() => setHoverTs(null)}
>
  {/* ... */}
  {typeof hoveredHour === 'number' && (
    <ReferenceLine
      x={hoveredHour}
      stroke={metricColorMap.grid}
      strokeDasharray="3 3"
      strokeOpacity={0.8}
    />
  )}
</LineChart>
```

---

## 🎯 Props ChartFrame

| Prop | Type | Défaut | Description |
|------|------|--------|-------------|
| `title` | `string` | **requis** | Titre du chart |
| `subtitle` | `string?` | - | Sous-titre optionnel |
| `legend` | `boolean?` | `true` | Afficher la légende |
| `height` | `number \| string?` | `'100%'` | Hauteur explicite (rare) |
| `minHeight` | `number?` | - | Hauteur minimale (recommandé) |
| `children` | `React.ReactElement` | **requis** | Le composant Recharts |

---

## 📐 Hauteurs Recommandées

| Type de Chart | `minHeight` | Usage |
|---------------|-------------|-------|
| Chart principal | 240-280px | EnergyFlows, BatterySoc, PVLoad |
| Chart secondaire | 200-240px | DhwPanel, autres métriques |
| Timeline | 180px | DecisionsTimeline, événements |

---

## 🛠️ Tooltip Personnalisé (Optionnel)

Si `DefaultTooltip` ne suffit pas, créer un tooltip custom qui respecte le style :

```tsx
interface MyTooltipProps {
  active?: boolean;
  payload?: Array<{ value: number; dataKey: string; name?: string; color?: string }>;
  label?: number;
}

const MyTooltip: React.FC<MyTooltipProps> = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;

  return (
    <div className="rounded-md border border-slate-200 bg-white/95 px-3 py-2 text-xs shadow-md">
      <div className="font-semibold text-slate-900" style={{ fontFamily: chartFont.family }}>
        {fmt.time(Number(label))}
      </div>
      <ul className="mt-2 space-y-1">
        {payload.map((entry) => (
          <li
            key={entry.dataKey}
            className="flex items-center gap-2 text-[11px] text-slate-700 tabular-nums"
            style={{ fontFamily: chartFont.family }}
          >
            <span
              className="h-2.5 w-2.5 rounded-full"
              style={{ backgroundColor: entry.color ?? '#475569' }}
              aria-hidden="true"
            />
            <span className="flex-1">{entry.name ?? entry.dataKey}</span>
            <span>{fmt.kw(entry.value)}</span>
          </li>
        ))}
      </ul>
    </div>
  );
};

// Utilisation
<Tooltip content={(props) => <MyTooltip {...props} />} />
```

---

## ✅ Checklist Avant PR

- [ ] Utilise `ChartFrame` pour le wrapper
- [ ] Utilise `metricColorMap` pour les couleurs
- [ ] Utilise `fmt.*` pour les formatters
- [ ] Utilise `chartFont` pour les polices
- [ ] Implemente `useChartSync()` si en layout A/B
- [ ] Spécifie `minHeight` approprié
- [ ] Teste le hover et la synchronisation
- [ ] Vérifie l'alignement visuel avec les autres charts
- [ ] Build réussit (`npm run build`)

---

## 🚫 Anti-patterns à Éviter

❌ **Ne pas faire :**
```tsx
// Hauteur fixe directe
<div className="h-64">
  <ResponsiveContainer>
    {/* ... */}
  </ResponsiveContainer>
</div>

// Formatter local
const formatHour = (value) => `${value}h`;

// Couleur en dur
<Line stroke="#FF0000" />

// Police en dur
<XAxis tick={{ fontSize: 12 }} />
```

✅ **À la place :**
```tsx
// Utiliser ChartFrame
<ChartFrame minHeight={256}>
  <LineChart>
    {/* ... */}
  </LineChart>
</ChartFrame>

// Utiliser fmt
tickFormatter={(value) => fmt.time(value)}

// Utiliser metricColorMap
<Line stroke={metricColorMap.pv} />

// Utiliser chartFont
<XAxis tick={{ fontFamily: chartFont.family, fontSize: chartFont.sizes.tick }} />
```

---

## 📚 Ressources

- [chartTheme.ts](src/ui/chartTheme.ts) - Palette, formatters, police
- [ChartFrame.tsx](src/ui/ChartFrame.tsx) - Wrapper standardisé
- [chartSync.tsx](src/ui/chartSync.tsx) - Context de synchronisation hover
- [UI_FIXES_SUMMARY.md](UI_FIXES_SUMMARY.md) - Détails des corrections récentes

---

**Bon développement ! 🚀**
