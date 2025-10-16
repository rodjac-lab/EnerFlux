import React from 'react';
import { CartesianGrid, Line, LineChart, Tooltip, XAxis, YAxis } from 'recharts';
import { SimulationResult } from '../../core/engine';
import ChartFrame, { DefaultTooltip } from '../ChartFrame';
import { chartFont, fmt, metricColorMap } from '../chartTheme';

interface PVLoadChartProps {
  result?: SimulationResult;
}

const PVLoadChart: React.FC<PVLoadChartProps> = ({ result }) => {
  const data = result?.steps.map((step) => ({
    time_h: step.time_s / 3600,
    pv: step.pv_kW,
    load: step.baseLoad_kW
  }));

  if (!data || data.length === 0) {
    return <p className="text-sm text-slate-500">Lancez une simulation pour visualiser les flux.</p>;
  }

  return (
    <ChartFrame
      title="Production PV vs consommation"
      subtitle="Profil journalier (kW)"
      height={320}
    >
      <LineChart data={data} margin={{ top: 16, right: 16, left: 0, bottom: 32 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
        <XAxis
          dataKey="time_h"
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
        <Line
          type="monotone"
          dataKey="pv"
          stroke={metricColorMap.pv}
          strokeWidth={2}
          dot={false}
          name="PV"
        />
        <Line
          type="monotone"
          dataKey="load"
          stroke={metricColorMap.load}
          strokeWidth={2}
          dot={false}
          name="Charge"
        />
      </LineChart>
    </ChartFrame>
  );
};

export default PVLoadChart;
