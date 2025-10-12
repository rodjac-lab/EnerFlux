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
  reason: string;
}

const BatterySocChart: React.FC<BatterySocChartProps> = ({ series, meta, variant }) => {
  const { hoverTs, setHoverTs } = useChartSync();
  const data = useMemo<Datum[]>(
    () =>
      series.map((point) => ({
        hour: point.hour,
        soc: point.soc_kWh,
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

  return (
    <div className="h-48 w-full" role="figure" aria-label={`SoC batterie stratégie ${variant}`}>
      <ResponsiveContainer>
        <LineChart
          data={data}
          onMouseMove={(state) => {
            const payload = state?.activePayload?.[0]?.payload as Datum | undefined;
            if (payload) {
              setHoverTs(payload.t_s);
            }
          }}
          onMouseLeave={() => setHoverTs(null)}
        >
          <XAxis dataKey="hour" tickFormatter={formatHour} />
          <YAxis unit=" kWh" domain={[meta.batteryConfig.socMin_kWh, meta.batteryConfig.socMax_kWh]} />
          <Tooltip content={<SocTooltip variant={variant} />} />
          <ReferenceArea
            y1={meta.batteryConfig.socMin_kWh}
            y2={meta.batteryConfig.socMax_kWh}
            fill="#818cf8"
            fillOpacity={0.08}
          />
          <ReferenceLine
            y={meta.batteryConfig.socMin_kWh}
            stroke="#6366f1"
            strokeDasharray="4 2"
            label="Min"
          />
          <ReferenceLine
            y={meta.batteryConfig.socMax_kWh}
            stroke="#6366f1"
            strokeDasharray="4 2"
            label="Max"
          />
          {typeof hoveredHour === 'number' ? (
            <ReferenceLine x={hoveredHour} stroke="#0ea5e9" strokeDasharray="3 3" />
          ) : null}
          <Line type="monotone" dataKey="soc" stroke="#0f172a" dot={false} name="SoC" />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};

const formatHour = (value: number): string => {
  const hours = Math.floor(value);
  const minutes = Math.round((value - hours) * 60);
  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
};

interface SocTooltipProps {
  active?: boolean;
  payload?: Array<{ value: number; payload: Datum }>;
  label?: number;
  variant: 'A' | 'B';
}

const SocTooltip: React.FC<SocTooltipProps> = ({ active, payload, label, variant }) => {
  if (!active || !payload?.length) {
    return null;
  }
  const datum = payload[0].payload;
  return (
    <div className="rounded border border-slate-200 bg-white/90 p-2 text-xs shadow">
      <div className="font-semibold">{formatHour(Number(label))}</div>
      <div>{`SoC: ${datum.soc.toFixed(2)} kWh`}</div>
      <div className="text-[11px] text-slate-500">Décision {variant}: {datum.reason}</div>
    </div>
  );
};

export default BatterySocChart;

