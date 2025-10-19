import React, { useMemo } from 'react';
import { ComposedChart, ReferenceLine, ResponsiveContainer, Scatter, Tooltip, XAxis, YAxis } from 'recharts';
import type { SeriesForRun } from '../../data/series';
import type { ExportV1 } from '../../types/export';
import { useChartSync } from '../chartSync';

interface DecisionsTimelineProps {
  series: SeriesForRun;
  meta: ExportV1['meta'];
  variant: 'A' | 'B';
}

interface EventDatum {
  hour: number;
  y: number;
  type: 'grid_export' | 'grid_import' | 'batt_charge' | 'batt_discharge' | 'ecs_on';
  t_s: number;
}

const DecisionsTimeline: React.FC<DecisionsTimelineProps> = ({ series, meta, variant }) => {
  const { hoverTs, setHoverTs } = useChartSync();

  const data = useMemo<EventDatum[]>(() => {
    const points: EventDatum[] = [];

    // Parcourir tous les points temporels
    for (let i = 0; i < series.energy.length; i++) {
      const e = series.energy[i];
      const d = series.dhw[i];

      // Ligne 3 : RÉSEAU
      if (e.gridExport_kW > 0.001) {
        points.push({ hour: e.hour, y: 3, type: 'grid_export', t_s: e.t_s });
      } else if (e.gridImport_kW > 0.001) {
        points.push({ hour: e.hour, y: 3, type: 'grid_import', t_s: e.t_s });
      }

      // Ligne 2 : BATTERIE
      if (e.batt_charge_kW > 0.001) {
        points.push({ hour: e.hour, y: 2, type: 'batt_charge', t_s: e.t_s });
      } else if (e.batt_discharge_kW > 0.001) {
        points.push({ hour: e.hour, y: 2, type: 'batt_discharge', t_s: e.t_s });
      }

      // Ligne 1 : ECS (point vert uniquement si ON)
      if (d && d.power_kW > 0.001) {
        points.push({ hour: e.hour, y: 1, type: 'ecs_on', t_s: e.t_s });
      }
    }

    return points;
  }, [series]);

  const hoveredHour = useMemo(() => {
    if (hoverTs == null) return null;
    const match = data.find((point) => point.t_s === hoverTs);
    return match ? match.hour : null;
  }, [data, hoverTs]);

  const title = `Événements — ${variant}`;

  return (
    <div className="space-y-2">
      <h3 className="text-sm font-semibold text-slate-700">{title}</h3>
      <ResponsiveContainer width="100%" height={140}>
        <ComposedChart
          data={data}
          onMouseLeave={() => setHoverTs(null)}
          margin={{ top: 10, right: 20, left: 50, bottom: 5 }}
        >
          <XAxis
            type="number"
            dataKey="hour"
            domain={['dataMin', 'dataMax']}
            tickFormatter={(v) => `${Math.floor(v)}h`}
          />
          <YAxis
            type="number"
            domain={[0, 4]}
            ticks={[1, 2, 3]}
            tick={{ fontSize: 10, fill: '#64748b' }}
            tickFormatter={(val: number) => {
              if (val === 1) return 'ECS';
              if (val === 2) return 'BATTERIE';
              if (val === 3) return 'RÉSEAU';
              return '';
            }}
            axisLine={{ stroke: '#cbd5e1' }}
            tickLine={{ stroke: '#cbd5e1' }}
          />
          <Tooltip content={<EventTooltip />} />

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
            data={data}
            dataKey="y"
            shape={(props: any) => <EventMarker {...props} onSelect={setHoverTs} hoverTs={hoverTs} />}
          />
        </ComposedChart>
      </ResponsiveContainer>
      <p className="text-xs text-slate-500">{data.length} événements</p>
    </div>
  );
};

interface EventMarkerProps {
  cx?: number;
  cy?: number;
  payload?: EventDatum;
  onSelect: (ts: number | null) => void;
  hoverTs: number | null;
}

const EventMarker: React.FC<EventMarkerProps> = ({ cx, cy, payload, onSelect, hoverTs }) => {
  if (typeof cx !== 'number' || typeof cy !== 'number' || !payload) return null;

  // Couleurs selon le type
  let color = '#10b981'; // vert par défaut (export, charge, ecs_on)
  if (payload.type === 'grid_import') color = '#f97316'; // orange
  if (payload.type === 'batt_discharge') color = '#3b82f6'; // bleu

  const isActive = hoverTs === payload.t_s;
  const radius = isActive ? 4 : 2.5;

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
      <circle cx={cx} cy={cy} r={radius} fill={color} stroke="white" strokeWidth={isActive ? 2 : 1} opacity={0.8} />
    </g>
  );
};

interface EventTooltipProps {
  active?: boolean;
  payload?: Array<{ payload: EventDatum }>;
  label?: number;
}

const EventTooltip: React.FC<EventTooltipProps> = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;

  const datum = payload[0].payload;
  const typeLabels = {
    grid_export: '➡️ Export réseau',
    grid_import: '⬅️ Import réseau',
    batt_charge: '⚡ Charge batterie',
    batt_discharge: '🔋 Décharge batterie',
    ecs_on: '🔥 ECS ON'
  };

  return (
    <div className="rounded border border-slate-200 bg-white/95 px-2 py-1 text-xs shadow">
      <div className="font-semibold">{`${Math.floor(Number(label))}h`}</div>
      <div className="text-[11px] text-slate-600">{typeLabels[datum.type]}</div>
    </div>
  );
};

export default DecisionsTimeline;
