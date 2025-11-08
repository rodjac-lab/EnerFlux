import React, { useMemo } from 'react';
import { Line, LineChart, ReferenceArea, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import type { SeriesForRun } from '../../data/series';
import type { ExportV1 } from '../../types/export';
import { useChartSync } from '../chartSync';
import { getChartDefaults } from './chartTheme';

interface DhwPanelProps {
  series: SeriesForRun['dhw'];
  meta: ExportV1['meta'];
  variant: 'A' | 'B';
}

interface Datum {
  hour: number;
  temp: number;
  t_s: number;
}

const DhwPanel: React.FC<DhwPanelProps> = ({ series, meta, variant }) => {
  const { hoverTs, setHoverTs } = useChartSync();
  const chartDefaults = getChartDefaults();

  const data = useMemo<Datum[]>(
    () =>
      series.map((point) => ({
        hour: point.hour,
        temp: point.temp_C,
        t_s: point.t_s
      })),
    [series]
  );

  const hoveredHour = useMemo(() => {
    if (hoverTs == null) return null;
    const match = data.find((point) => point.t_s === hoverTs);
    return match ? match.hour : null;
  }, [data, hoverTs]);

  const tempColor = chartDefaults.series[4]; // magenta pour ECS
  const title = `ECS — ${variant}`;
  const targetTemp = meta.dhwConfig.targetCelsius;

  return (
    <div className="space-y-2">
      <h3 className="text-sm font-semibold text-text">{title}</h3>
      <ResponsiveContainer width="100%" height={140}>
        <LineChart
          data={data}
          onMouseMove={(state) => {
            const payload = state?.activePayload?.[0]?.payload as Datum | undefined;
            if (payload) setHoverTs(payload.t_s);
          }}
          onMouseLeave={() => setHoverTs(null)}
          margin={{ top: 5, right: 20, left: 0, bottom: 5 }}
        >
          <XAxis
            dataKey="hour"
            type="number"
            domain={['dataMin', 'dataMax']}
            tickFormatter={(v) => `${Math.floor(v)}h`}
          />
          <YAxis
            domain={[0, 'auto']}
            tickFormatter={(v) => `${v}°C`}
            label={{ value: '°C', angle: -90, position: 'insideLeft' }}
          />
          <Tooltip
            formatter={(value: number) => `${value.toFixed(1)} °C`}
            labelFormatter={(value) => `${value} h`}
          />
          {/* Zone confort 50-60°C */}
          <ReferenceArea y1={50} y2={60} fill={tempColor} fillOpacity={0.1} />
          {/* Ligne cible */}
          <ReferenceLine
            y={targetTemp}
            stroke={tempColor}
            strokeDasharray="4 2"
            label={{ value: 'Cible', position: 'insideLeft', fill: chartDefaults.labelColor, fontSize: 10 }}
          />
          {typeof hoveredHour === 'number' && (
            <ReferenceLine x={hoveredHour} stroke={chartDefaults.axisStroke} strokeDasharray="3 3" strokeOpacity={0.6} />
          )}
          <Line type="monotone" dataKey="temp" stroke={tempColor} strokeWidth={2} dot={false} name="Température" />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};

export default DhwPanel;
