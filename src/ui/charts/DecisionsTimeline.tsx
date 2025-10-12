import React, { useMemo } from 'react';
import { ComposedChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis, Scatter } from 'recharts';
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
    <div className="h-40 w-full" role="figure" aria-label={`Décisions ${variant}`}>
      <ResponsiveContainer>
        <ComposedChart
          data={data}
          onMouseLeave={() => setHoverTs(null)}
          margin={{ top: 20, bottom: 10, left: 20, right: 20 }}
        >
          <XAxis dataKey="hour" tickFormatter={formatHour} />
          <YAxis hide domain={[0, 1]} />
          <Tooltip content={<DecisionTooltip />} />
          {events.map((event) => (
            <ReferenceLine
              key={`${event.t_s}-${variant}`}
              x={event.hour}
              stroke="#f97316"
              strokeDasharray="2 2"
              label={{ position: 'top', value: event.reason }}
            />
          ))}
          {typeof meta.dhwConfig.deadlineHour === 'number' ? (
            <ReferenceLine
              x={meta.dhwConfig.deadlineHour}
              stroke="#22c55e"
              strokeDasharray="4 2"
              label={{ value: 'Deadline ECS', position: 'top' }}
            />
          ) : null}
          {typeof hoveredHour === 'number' ? (
            <ReferenceLine x={hoveredHour} stroke="#0ea5e9" strokeDasharray="3 3" />
          ) : null}
          <Scatter
            data={events}
            dataKey="value"
            shape={(props) => <Marker {...props} onSelect={setHoverTs} variant={variant} hoverTs={hoverTs} />}
          />
        </ComposedChart>
      </ResponsiveContainer>
      <div className="sr-only" data-testid="decision-count">
        {events.length}
      </div>
      {typeof meta.dhwConfig.deadlineHour === 'number' ? (
        <div className="sr-only" data-testid="deadline-hour">
          {meta.dhwConfig.deadlineHour}
        </div>
      ) : null}
    </div>
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

const formatHour = (value: number): string => {
  const hours = Math.floor(value);
  const minutes = Math.round((value - hours) * 60);
  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
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
    <div className="rounded border border-slate-200 bg-white/90 p-2 text-xs shadow">
      <div className="font-semibold">{formatHour(Number(label))}</div>
      <div>{datum.reason}</div>
    </div>
  );
};

export default DecisionsTimeline;

