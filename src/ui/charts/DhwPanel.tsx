import React, { useMemo } from 'react';
import { Bar, CartesianGrid, ComposedChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis, Line } from 'recharts';
import type { SeriesForRun } from '../../data/series';
import type { ExportV1 } from '../../types/export';
import { useChartSync } from '../chartSync';

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

  return (
    <div className="h-56 w-full" role="figure" aria-label={`ECS stratégie ${variant}`}>
      <ResponsiveContainer>
        <ComposedChart
          data={data}
          onMouseMove={(state) => {
            const payload = state?.activePayload?.[0]?.payload as Datum | undefined;
            if (payload) {
              setHoverTs(payload.t_s);
            }
          }}
          onMouseLeave={() => setHoverTs(null)}
        >
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis
            type="number"
            dataKey="hour"
            domain={['dataMin', 'dataMax']}
            tickFormatter={formatHour}
          />
          <YAxis yAxisId="temp" unit=" °C" orientation="left" domain={[0, 'auto']} />
          <YAxis yAxisId="power" unit=" kW" orientation="right" />
          <Tooltip content={<DhwTooltip variant={variant} />} />
          <ReferenceLine yAxisId="temp" y={meta.dhwConfig.targetCelsius} stroke="#f97316" strokeDasharray="4 2" />
          {typeof hoveredHour === 'number' ? (
            <ReferenceLine x={hoveredHour} stroke="#0ea5e9" strokeDasharray="3 3" />
          ) : null}
          <Bar yAxisId="power" dataKey="power" fill="rgba(99, 102, 241, 0.3)" name="Puissance" />
          <Line yAxisId="temp" type="monotone" dataKey="temp" stroke="#ef4444" dot={false} name="Température" />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
};

const formatHour = (value: number): string => {
  const hours = Math.floor(value);
  const minutes = Math.round((value - hours) * 60);
  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
};

interface DhwTooltipProps {
  active?: boolean;
  payload?: Array<{ value: number; dataKey: string; payload: Datum }>;
  label?: number;
  variant: 'A' | 'B';
}

const DhwTooltip: React.FC<DhwTooltipProps> = ({ active, payload, label, variant }) => {
  if (!active || !payload?.length) {
    return null;
  }
  const datum = payload[0].payload;
  return (
    <div className="rounded border border-slate-200 bg-white/90 p-2 text-xs shadow">
      <div className="font-semibold">{formatHour(Number(label))}</div>
      <div>{`Temp: ${datum.temp.toFixed(1)} °C`}</div>
      <div>{`Puissance: ${datum.power.toFixed(2)} kW`}</div>
      {datum.reason !== 'idle' ? (
        <div className="text-[11px] text-amber-600">Décision {variant}: {datum.reason}</div>
      ) : null}
    </div>
  );
};

export default DhwPanel;

