import React, { useMemo, useState } from 'react';
import { Area, AreaChart, CartesianGrid, Legend, ReferenceLine, Tooltip, XAxis, YAxis } from 'recharts';
import type { SeriesForRun } from '../../data/series';
import { useChartSync } from '../chartSync';
import ChartFrame, { DefaultTooltip } from '../ChartFrame';
import { chartFont, fmt, metricColorMap } from '../chartTheme';

interface EnergyFlowsChartProps {
  series: SeriesForRun['energy'];
  variant: 'A' | 'B';
}

interface ChartDatum {
  hour: number;
  pv: number;
  load: number;
  dhw: number;
  charge: number;
  discharge: number;
  gridImport: number;
  gridExport: number;
  reason?: string;
  t_s: number;
}

const COLORS = {
  pv: metricColorMap.pv,
  load: metricColorMap.load,
  dhw: metricColorMap.dhw,
  charge: metricColorMap.battery,
  discharge: metricColorMap.battery,
  gridImport: metricColorMap.grid,
  gridExport: metricColorMap.grid
};

const withAlpha = (hex: string, alpha: number): string => {
  const match = /^#?([\da-f]{2})([\da-f]{2})([\da-f]{2})$/i.exec(hex);
  if (!match) {
    return hex;
  }
  const [, r, g, b] = match;
  return `rgba(${parseInt(r, 16)}, ${parseInt(g, 16)}, ${parseInt(b, 16)}, ${alpha})`;
};

const EnergyFlowsChart: React.FC<EnergyFlowsChartProps> = ({ series, variant }) => {
  const [hiddenKeys, setHiddenKeys] = useState<Set<keyof ChartDatum>>(new Set());
  const { hoverTs, setHoverTs } = useChartSync();

  const data = useMemo<ChartDatum[]>(
    () =>
      series.map((point) => ({
        hour: point.hour,
        pv: point.pv_kW,
        load: point.baseLoad_kW,
        dhw: point.dhw_power_kW,
        charge: point.batt_charge_kW,
        discharge: point.batt_discharge_kW,
        gridImport: point.gridImport_kW,
        gridExport: point.gridExport_kW,
        reason: point.reason ? `Décision ${variant} : ${point.reason}` : undefined,
        t_s: point.t_s
      })),
    [series, variant]
  );

  const handleLegendClick = (dataKey: keyof ChartDatum) => {
    setHiddenKeys((prev) => {
      const next = new Set(prev);
      if (next.has(dataKey)) {
        next.delete(dataKey);
      } else {
        next.add(dataKey);
      }
      return next;
    });
  };

  const hoveredHour = useMemo(() => {
    if (hoverTs == null) {
      return null;
    }
    const match = data.find((point) => point.t_s === hoverTs);
    return match ? match.hour : null;
  }, [data, hoverTs]);

  return (
    <ChartFrame
      title={`Flux de puissance — stratégie ${variant}`}
      subtitle="Répartition instantanée (kW)"
      height={320}
    >
      <AreaChart
        data={data}
        onMouseMove={(state) => {
          const payload = state?.activePayload?.[0]?.payload as ChartDatum | undefined;
          if (payload) {
            setHoverTs(payload.t_s);
          }
        }}
        onMouseLeave={() => setHoverTs(null)}
        margin={{ top: 8, right: 16, left: 0, bottom: 32 }}
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
          tickFormatter={(value) => fmt.kw(value)}
          tick={{ fontFamily: chartFont.family, fontSize: chartFont.sizes.tick, fill: '#475569' }}
          axisLine={{ stroke: '#CBD5F5' }}
          tickLine={{ stroke: '#CBD5F5' }}
        />
        <Tooltip
          content={(props) => <DefaultTooltip {...props} />}
          formatter={(value: number, name) => [fmt.kw(value), name]}
          labelFormatter={(value) => fmt.time(value as number)}
        />
        <Legend
          onClick={(entry) => {
            if (entry?.dataKey) {
              handleLegendClick(entry.dataKey as keyof ChartDatum);
            }
          }}
          wrapperStyle={{
            paddingTop: 12,
            fontFamily: chartFont.family,
            fontSize: chartFont.sizes.legend
          }}
        />
        {typeof hoveredHour === 'number' ? (
          <ReferenceLine
            x={hoveredHour}
            stroke={metricColorMap.grid}
            strokeDasharray="4 2"
            strokeOpacity={0.8}
          />
        ) : null}
        <Area
          type="monotone"
          dataKey="pv"
          stroke={COLORS.pv}
          strokeWidth={2}
          fill={withAlpha(COLORS.pv, 0.35)}
          name="PV"
          dot={false}
          hide={hiddenKeys.has('pv')}
        />
        <Area
          type="monotone"
          dataKey="load"
          stackId="demand"
          stroke={COLORS.load}
          strokeWidth={2}
          fill={withAlpha(COLORS.load, 0.4)}
          name="Maison"
          dot={false}
          hide={hiddenKeys.has('load')}
        />
        <Area
          type="monotone"
          dataKey="dhw"
          stackId="demand"
          stroke={COLORS.dhw}
          strokeWidth={2}
          fill={withAlpha(COLORS.dhw, 0.35)}
          name="ECS"
          dot={false}
          hide={hiddenKeys.has('dhw')}
        />
        <Area
          type="monotone"
          dataKey="charge"
          stroke={COLORS.charge}
          strokeWidth={2}
          fill={withAlpha(COLORS.charge, 0.25)}
          name="Batterie (charge)"
          dot={false}
          hide={hiddenKeys.has('charge')}
        />
        <Area
          type="monotone"
          dataKey="discharge"
          stroke={COLORS.discharge}
          strokeWidth={2}
          strokeDasharray="4 2"
          fill={withAlpha(COLORS.discharge, 0.15)}
          name="Batterie (décharge)"
          dot={false}
          hide={hiddenKeys.has('discharge')}
        />
        <Area
          type="monotone"
          dataKey="gridImport"
          stroke={COLORS.gridImport}
          strokeWidth={2}
          fill={withAlpha(COLORS.gridImport, 0.18)}
          name="Import réseau"
          dot={false}
          hide={hiddenKeys.has('gridImport')}
        />
        <Area
          type="monotone"
          dataKey="gridExport"
          stroke={COLORS.gridExport}
          strokeWidth={2}
          fill={withAlpha(COLORS.gridExport, 0.12)}
          name="Export réseau"
          dot={false}
          hide={hiddenKeys.has('gridExport')}
        />
      </AreaChart>
    </ChartFrame>
  );
};

export default EnergyFlowsChart;

