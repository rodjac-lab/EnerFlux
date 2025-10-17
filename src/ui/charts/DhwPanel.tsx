import React, { useMemo } from 'react';
import { Bar, CartesianGrid, ComposedChart, ReferenceLine, Tooltip, XAxis, YAxis, Line } from 'recharts';
import type { SeriesForRun } from '../../data/series';
import type { ExportV1 } from '../../types/export';
import { useChartSync } from '../chartSync';
import ChartFrame, { DefaultTooltip } from '../ChartFrame';
import { chartFont, fmt, metricColorMap } from '../chartTheme';

interface DhwPanelProps {
  series: SeriesForRun['dhw'];
  meta: ExportV1['meta'];
  variant: 'A' | 'B';
}

interface Datum {
  hour: number;
  temp: number;
  power: number;
  t_s: number;
  reason: string;
}

const DhwPanel: React.FC<DhwPanelProps> = ({ series, meta, variant }) => {
  const { hoverTs, setHoverTs } = useChartSync();
  const data = useMemo<Datum[]>(
    () =>
      series.map((point) => ({
        hour: point.hour,
        temp: point.temp_C,
        power: point.power_kW,
        t_s: point.t_s,
        reason: point.reason
      })),
    [series]
  );

  const hoveredHour = useMemo(() => {
    if (hoverTs == null) {
      return null;
    }
    const match = data.find((point) => point.t_s === hoverTs);
    return match ? match.hour : null;
  }, [data, hoverTs]);

  const tempColor = metricColorMap.dhw;
  const powerColor = metricColorMap.battery;

  return (
    <ChartFrame
      title={`ECS — stratégie ${variant}`}
      subtitle="Température et puissance"
      legend={true}
      minHeight={240}
    >
      <ComposedChart
        data={data}
        onMouseMove={(state) => {
          const payload = state?.activePayload?.[0]?.payload as Datum | undefined;
          if (payload) {
            setHoverTs(payload.t_s);
          }
        }}
        onMouseLeave={() => setHoverTs(null)}
        margin={{ top: 8, right: 48, left: 0, bottom: 32 }}
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
          yAxisId="temp"
          orientation="left"
          domain={[0, 'auto']}
          tickFormatter={(value) => `${value.toFixed(0)}°C`}
          tick={{ fontFamily: chartFont.family, fontSize: chartFont.sizes.tick, fill: '#475569' }}
          axisLine={{ stroke: '#CBD5F5' }}
          tickLine={{ stroke: '#CBD5F5' }}
        />
        <YAxis
          yAxisId="power"
          orientation="right"
          tickFormatter={(value) => fmt.kw(value)}
          tick={{ fontFamily: chartFont.family, fontSize: chartFont.sizes.tick, fill: '#475569' }}
          axisLine={{ stroke: '#CBD5F5' }}
          tickLine={{ stroke: '#CBD5F5' }}
        />
        <Tooltip
          content={(props) => <DhwTooltip {...props} variant={variant} />}
        />
        <ReferenceLine
          yAxisId="temp"
          y={meta.dhwConfig.targetCelsius}
          stroke={tempColor}
          strokeDasharray="4 2"
          label={{ value: 'Cible', position: 'insideLeft', fill: '#475569', fontSize: chartFont.sizes.tick }}
        />
        {typeof hoveredHour === 'number' ? (
          <ReferenceLine
            x={hoveredHour}
            stroke={metricColorMap.grid}
            strokeDasharray="3 3"
            strokeOpacity={0.8}
          />
        ) : null}
        <Bar yAxisId="power" dataKey="power" fill={`${powerColor}40`} name="Puissance" />
        <Line yAxisId="temp" type="monotone" dataKey="temp" stroke={tempColor} strokeWidth={2} dot={false} name="Température" />
      </ComposedChart>
    </ChartFrame>
  );
};

interface DhwTooltipProps {
  active?: boolean;
  payload?: Array<{ value: number; dataKey: string; name?: string; payload: Datum; color?: string }>;
  label?: number;
  variant: 'A' | 'B';
}

const DhwTooltip: React.FC<DhwTooltipProps> = ({ active, payload, label, variant }) => {
  if (!active || !payload?.length) {
    return null;
  }
  const datum = payload[0].payload;

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
            <span>
              {entry.dataKey === 'temp'
                ? `${entry.value.toFixed(1)} °C`
                : fmt.kw(entry.value)}
            </span>
          </li>
        ))}
      </ul>
      {datum.reason && datum.reason !== 'idle' ? (
        <div className="mt-2 text-[10px] text-slate-500" style={{ fontFamily: chartFont.family }}>
          Décision {variant}: {datum.reason}
        </div>
      ) : null}
    </div>
  );
};

export default DhwPanel;

