import React, { useMemo } from 'react';
import { ComposedChart, ReferenceLine, Tooltip, XAxis, YAxis, Scatter } from 'recharts';
import type { SeriesForRun } from '../../data/series';
import type { ExportV1 } from '../../types/export';
import { useChartSync } from '../chartSync';
import ChartFrame from '../ChartFrame';
import { chartFont, fmt, metricColorMap } from '../chartTheme';

interface DecisionsTimelineProps {
  series: SeriesForRun['decisions'];
  meta: ExportV1['meta'];
  variant: 'A' | 'B';
}

interface Datum {
  hour: number;
  value: number;
  reason: string;
  t_s: number;
}

const DecisionsTimeline: React.FC<DecisionsTimelineProps> = ({ series, meta, variant }) => {
  const { hoverTs, setHoverTs } = useChartSync();
  const data = useMemo<Datum[]>(
    () =>
      series.map((point) => ({
        hour: point.hour,
        value: 0,
        reason: point.reason,
        t_s: point.t_s
      })),
    [series]
  );

  const events = useMemo(() => data.filter((item) => item.reason !== 'idle'), [data]);
  const hoveredHour = useMemo(() => {
    if (hoverTs == null) {
      return null;
    }
    const match = data.find((point) => point.t_s === hoverTs);
    return match ? match.hour : null;
  }, [data, hoverTs]);

  return (
    <ChartFrame
      title={`Timeline décisions — stratégie ${variant}`}
      subtitle="Événements majeurs de la simulation"
      legend={false}
      minHeight={180}
    >
      <ComposedChart
        data={data}
        onMouseLeave={() => setHoverTs(null)}
        margin={{ top: 20, bottom: 10, left: 20, right: 20 }}
      >
        <XAxis
          type="number"
          dataKey="hour"
          domain={['dataMin', 'dataMax']}
          tickFormatter={(value) => fmt.time(value)}
          tick={{ fontFamily: chartFont.family, fontSize: chartFont.sizes.tick, fill: '#475569' }}
          axisLine={{ stroke: '#CBD5F5' }}
          tickLine={{ stroke: '#CBD5F5' }}
        />
        <YAxis hide domain={[0, 1]} />
        <Tooltip content={<DecisionTooltip />} />
        {events.map((event) => (
          <ReferenceLine
            key={`${event.t_s}-${variant}`}
            x={event.hour}
            stroke="#f97316"
            strokeDasharray="2 2"
            label={{
              position: 'top',
              value: event.reason,
              style: { fontSize: chartFont.sizes.tick, fill: '#f97316' }
            }}
          />
        ))}
        {typeof meta.dhwConfig.deadlineHour === 'number' ? (
          <ReferenceLine
            x={meta.dhwConfig.deadlineHour}
            stroke="#22c55e"
            strokeDasharray="4 2"
            label={{
              value: 'Deadline ECS',
              position: 'top',
              style: { fontSize: chartFont.sizes.tick, fill: '#22c55e' }
            }}
          />
        ) : null}
        {typeof hoveredHour === 'number' ? (
          <ReferenceLine
            x={hoveredHour}
            stroke={metricColorMap.grid}
            strokeDasharray="3 3"
            strokeOpacity={0.8}
          />
        ) : null}
        <Scatter
          data={events}
          dataKey="value"
          shape={(props) => <Marker {...props} onSelect={setHoverTs} variant={variant} hoverTs={hoverTs} />}
        />
      </ComposedChart>
    </ChartFrame>
  );
};

interface MarkerProps {
  cx?: number;
  cy?: number;
  payload?: Datum;
  onSelect: (ts: number | null) => void;
  variant: 'A' | 'B';
  hoverTs: number | null;
}

const Marker: React.FC<MarkerProps> = ({ cx, cy, payload, onSelect, variant, hoverTs }) => {
  if (typeof cx !== 'number' || typeof cy !== 'number' || !payload) {
    return null;
  }
  const isActive = hoverTs === payload.t_s;
  const radius = isActive ? 6 : 4;
  return (
    <g
      role="button"
      tabIndex={0}
      onClick={() => onSelect(isActive ? null : payload.t_s)}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          onSelect(isActive ? null : payload.t_s);
        }
      }}
      data-testid={`decision-marker-${variant}`}
    >
      <circle cx={cx} cy={cy} r={radius} fill="#f97316" stroke="#b45309" strokeWidth={isActive ? 2 : 1} />
    </g>
  );
};

interface DecisionTooltipProps {
  active?: boolean;
  payload?: Array<{ payload: Datum }>;
  label?: number;
}

const DecisionTooltip: React.FC<DecisionTooltipProps> = ({ active, payload, label }) => {
  if (!active || !payload?.length) {
    return null;
  }
  const datum = payload[0].payload;
  return (
    <div className="rounded-md border border-slate-200 bg-white/95 px-3 py-2 text-xs shadow-md">
      <div className="font-semibold text-slate-900" style={{ fontFamily: chartFont.family }}>
        {fmt.time(Number(label))}
      </div>
      <div className="mt-1 text-[11px] text-slate-700" style={{ fontFamily: chartFont.family }}>
        {datum.reason}
      </div>
    </div>
  );
};

export default DecisionsTimeline;

