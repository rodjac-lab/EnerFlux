import React, { useMemo } from 'react';
import { ComposedChart, ReferenceLine, ResponsiveContainer, Scatter, Tooltip, XAxis, YAxis } from 'recharts';
import type { SeriesForRun } from '../../data/series';
import type { ExportV1 } from '../../types/export';
import { useChartSync } from '../chartSync';

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
        value: 0.5,
        reason: point.reason,
        t_s: point.t_s
      })),
    [series]
  );

  // Filtre seulement événements importants (pas idle)
  const events = useMemo(() => data.filter((item) => item.reason !== 'idle'), [data]);

  const hoveredHour = useMemo(() => {
    if (hoverTs == null) return null;
    const match = data.find((point) => point.t_s === hoverTs);
    return match ? match.hour : null;
  }, [data, hoverTs]);

  const title = `Événements — ${variant}`;
  const eventColor = variant === 'A' ? '#22c55e' : '#a855f7';

  return (
    <div className="space-y-2">
      <h3 className="text-sm font-semibold text-slate-700">{title}</h3>
      <ResponsiveContainer width="100%" height={100}>
        <ComposedChart
          data={data}
          onMouseLeave={() => setHoverTs(null)}
          margin={{ top: 10, right: 20, left: 0, bottom: 5 }}
        >
          <XAxis
            type="number"
            dataKey="hour"
            domain={['dataMin', 'dataMax']}
            tickFormatter={(v) => `${Math.floor(v)}h`}
          />
          <YAxis hide domain={[0, 1]} />
          <Tooltip content={<DecisionTooltip />} />

          {/* Deadline ECS */}
          {typeof meta.dhwConfig.deadlineHour === 'number' && (
            <ReferenceLine
              x={meta.dhwConfig.deadlineHour}
              stroke="#f97316"
              strokeDasharray="4 2"
              label={{ value: 'Deadline', position: 'top', fill: '#f97316', fontSize: 10 }}
            />
          )}

          {/* Hover line */}
          {typeof hoveredHour === 'number' && (
            <ReferenceLine x={hoveredHour} stroke="#94a3b8" strokeDasharray="3 3" strokeOpacity={0.6} />
          )}

          {/* Dots pour événements */}
          <Scatter
            data={events}
            dataKey="value"
            shape={(props) => <Marker {...props} onSelect={setHoverTs} hoverTs={hoverTs} color={eventColor} />}
          />
        </ComposedChart>
      </ResponsiveContainer>
      <p className="text-xs text-slate-500">{events.length} événements</p>
    </div>
  );
};

interface MarkerProps {
  cx?: number;
  cy?: number;
  payload?: Datum;
  onSelect: (ts: number | null) => void;
  hoverTs: number | null;
  color: string;
}

const Marker: React.FC<MarkerProps> = ({ cx, cy, payload, onSelect, hoverTs, color }) => {
  if (typeof cx !== 'number' || typeof cy !== 'number' || !payload) return null;

  const isActive = hoverTs === payload.t_s;
  const radius = isActive ? 5 : 3;

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
      style={{ cursor: 'pointer' }}
    >
      <circle cx={cx} cy={cy} r={radius} fill={color} stroke="white" strokeWidth={isActive ? 2 : 1} />
    </g>
  );
};

interface DecisionTooltipProps {
  active?: boolean;
  payload?: Array<{ payload: Datum }>;
  label?: number;
}

const DecisionTooltip: React.FC<DecisionTooltipProps> = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;

  const datum = payload[0].payload;
  return (
    <div className="rounded border border-slate-200 bg-white/95 px-2 py-1 text-xs shadow">
      <div className="font-semibold">{`${Math.floor(Number(label))}h`}</div>
      <div className="text-[11px] text-slate-600">{datum.reason}</div>
    </div>
  );
};

export default DecisionsTimeline;
