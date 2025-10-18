import React, { useMemo } from 'react';
import { Line, LineChart, ReferenceArea, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import type { SeriesForRun } from '../../data/series';
import type { ExportV1 } from '../../types/export';
import { useChartSync } from '../chartSync';

interface BatterySocChartProps {
  series: SeriesForRun['battery'];
  meta: ExportV1['meta'];
  variant: 'A' | 'B';
}

interface Datum {
  hour: number;
  soc: number;
  t_s: number;
}

const BatterySocChart: React.FC<BatterySocChartProps> = ({ series, meta, variant }) => {
  const { hoverTs, setHoverTs } = useChartSync();

  const data = useMemo<Datum[]>(
    () =>
      series.map((point) => ({
        hour: point.hour,
        soc: point.soc_kWh,
        t_s: point.t_s
      })),
    [series]
  );

  const hoveredHour = useMemo(() => {
    if (hoverTs == null) return null;
    const match = data.find((point) => point.t_s === hoverTs);
    return match ? match.hour : null;
  }, [data, hoverTs]);

  const socColor = variant === 'A' ? '#22c55e' : '#a855f7';
  const title = `SoC batterie — ${variant}`;

  // Calculate domain: if socMax <= socMin, use auto domain from data
  const yDomain = useMemo(() => {
    const socMin = meta.batteryConfig.socMin_kWh;
    const socMax = meta.batteryConfig.socMax_kWh;

    // If invalid domain (max <= min), calculate from actual data
    if (socMax <= socMin || socMax === 0) {
      const values = data.map(d => d.soc).filter(v => Number.isFinite(v));
      if (values.length === 0) return [0, 10]; // fallback
      const dataMin = Math.min(...values);
      const dataMax = Math.max(...values);
      const padding = (dataMax - dataMin) * 0.1 || 1; // 10% padding or 1kWh min
      return [Math.max(0, dataMin - padding), dataMax + padding];
    }

    return [socMin, socMax];
  }, [meta.batteryConfig.socMin_kWh, meta.batteryConfig.socMax_kWh, data]);

  // Only show reference lines/areas if we have valid battery config
  const showReferences = meta.batteryConfig.socMax_kWh > meta.batteryConfig.socMin_kWh;

  return (
    <div className="space-y-2">
      <h3 className="text-sm font-semibold text-slate-700">{title}</h3>
      <ResponsiveContainer width="100%" height={180}>
        <LineChart
          data={data}
          onMouseMove={(state) => {
            const payload = state?.activePayload?.[0]?.payload as Datum | undefined;
            if (payload) setHoverTs(payload.t_s);
          }}
          onMouseLeave={() => setHoverTs(null)}
          margin={{ top: 5, right: 20, left: 10, bottom: 5 }}
        >
          <XAxis
            dataKey="hour"
            type="number"
            domain={['dataMin', 'dataMax']}
            tickFormatter={(v) => `${Math.floor(v)}h`}
          />
          <YAxis
            domain={yDomain as [number, number]}
            tickFormatter={(v) => `${v.toFixed(1)}kWh`}
            label={{ value: 'kWh', angle: -90, position: 'insideLeft' }}
          />
          <Tooltip
            formatter={(value: number) => `${value.toFixed(2)} kWh`}
            labelFormatter={(value) => `${value} h`}
          />
          {showReferences && (
            <>
              <ReferenceArea
                y1={meta.batteryConfig.socMin_kWh}
                y2={meta.batteryConfig.socMax_kWh}
                fill={socColor}
                fillOpacity={0.1}
              />
              <ReferenceLine
                y={meta.batteryConfig.socMin_kWh}
                stroke={socColor}
                strokeDasharray="4 2"
                label={{ value: 'Min', position: 'insideLeft', fill: '#64748b', fontSize: 10 }}
              />
              <ReferenceLine
                y={meta.batteryConfig.socMax_kWh}
                stroke={socColor}
                strokeDasharray="4 2"
                label={{ value: 'Max', position: 'insideLeft', fill: '#64748b', fontSize: 10 }}
              />
            </>
          )}
          {typeof hoveredHour === 'number' && (
            <ReferenceLine x={hoveredHour} stroke="#94a3b8" strokeDasharray="3 3" strokeOpacity={0.6} />
          )}
          <Line
            type="monotone"
            dataKey="soc"
            stroke={socColor}
            strokeWidth={2}
            dot={false}
            name={`SoC ${variant}`}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};

export default BatterySocChart;
