import React, { useMemo } from 'react';
import { CartesianGrid, Line, LineChart, ReferenceArea, ReferenceLine, Tooltip, XAxis, YAxis } from 'recharts';
import type { SeriesForRun } from '../../data/series';
import type { ExportV1 } from '../../types/export';
import { useChartSync } from '../chartSync';
import ChartFrame, { DefaultTooltip } from '../ChartFrame';
import { chartFont, fmt, metricColorMap } from '../chartTheme';

interface BatterySocChartProps {
  series: SeriesForRun['battery'];
  meta: ExportV1['meta'];
  variant: 'A' | 'B';
}

interface Datum {
  hour: number;
  soc: number;
  t_s: number;
  reason?: string;
}

const BatterySocChart: React.FC<BatterySocChartProps> = ({ series, meta, variant }) => {
  const { hoverTs, setHoverTs } = useChartSync();
  const data = useMemo<Datum[]>(
    () =>
      series.map((point) => ({
        hour: point.hour,
        soc: point.soc_kWh,
        t_s: point.t_s,
        reason: point.reason ? `Décision ${variant} : ${point.reason}` : undefined
      })),
    [series, variant]
  );

  const hoveredHour = useMemo(() => {
    if (hoverTs == null) {
      return null;
    }
    const match = data.find((point) => point.t_s === hoverTs);
    return match ? match.hour : null;
  }, [data, hoverTs]);

  const batteryColor = metricColorMap.battery;

  const withAlpha = (hex: string, alpha: number): string => {
    const match = /^#?([\da-f]{2})([\da-f]{2})([\da-f]{2})$/i.exec(hex);
    if (!match) {
      return hex;
    }
    const [, r, g, b] = match;
    return `rgba(${parseInt(r, 16)}, ${parseInt(g, 16)}, ${parseInt(b, 16)}, ${alpha})`;
  };

  return (
    <ChartFrame
      title={`SoC batterie — stratégie ${variant}`}
      subtitle="Énergie stockée (kWh)"
      minHeight={240}
    >
      <LineChart
        data={data}
        onMouseMove={(state) => {
          const payload = state?.activePayload?.[0]?.payload as Datum | undefined;
          if (payload) {
            setHoverTs(payload.t_s);
          }
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
          domain={[meta.batteryConfig.socMin_kWh, meta.batteryConfig.socMax_kWh]}
          tickFormatter={(value) => fmt.kwh(value)}
          tick={{ fontFamily: chartFont.family, fontSize: chartFont.sizes.tick, fill: '#475569' }}
          axisLine={{ stroke: '#CBD5F5' }}
          tickLine={{ stroke: '#CBD5F5' }}
        />
        <Tooltip
          content={(props) => <DefaultTooltip {...props} />}
          formatter={(value: number, name) => [fmt.kwh(value), name]}
          labelFormatter={(value) => fmt.time(value as number)}
        />
        <ReferenceArea
          y1={meta.batteryConfig.socMin_kWh}
          y2={meta.batteryConfig.socMax_kWh}
          fill={withAlpha(batteryColor, 0.12)}
        />
        <ReferenceLine
          y={meta.batteryConfig.socMin_kWh}
          stroke={batteryColor}
          strokeDasharray="4 2"
          label={{ value: 'Min', position: 'insideLeft', fill: '#475569', fontSize: chartFont.sizes.tick }}
        />
        <ReferenceLine
          y={meta.batteryConfig.socMax_kWh}
          stroke={batteryColor}
          strokeDasharray="4 2"
          label={{ value: 'Max', position: 'insideLeft', fill: '#475569', fontSize: chartFont.sizes.tick }}
        />
        {typeof hoveredHour === 'number' ? (
          <ReferenceLine
            x={hoveredHour}
            stroke={metricColorMap.grid}
            strokeDasharray="3 3"
            strokeOpacity={0.8}
          />
        ) : null}
        <Line
          type="monotone"
          dataKey="soc"
          stroke={batteryColor}
          strokeWidth={2}
          dot={false}
          name="SoC"
        />
      </LineChart>
    </ChartFrame>
  );
};

export default BatterySocChart;

