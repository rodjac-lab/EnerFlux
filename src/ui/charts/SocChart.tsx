import React from 'react';
import { Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis, Legend } from 'recharts';
import { SimulationResult } from '../../core/engine';

interface SocChartProps {
  resultA?: SimulationResult;
  resultB?: SimulationResult;
}

interface SocPoint {
  time_h: number;
  socA?: number;
  socB?: number;
}

const extractSoc = (result?: SimulationResult): { time: number; soc: number }[] | undefined => {
  if (!result) {
    return undefined;
  }
  return result.steps.map((step) => {
    const batteryState = step.deviceStates.find((device) => typeof device.state.soc_percent === 'number');
    return {
      time: step.time_s / 3600,
      soc: batteryState ? Number(batteryState.state.soc_percent) : 0
    };
  });
};

const SocChart: React.FC<SocChartProps> = ({ resultA, resultB }) => {
  const seriesA = extractSoc(resultA);
  const seriesB = extractSoc(resultB);
  const length = Math.max(seriesA?.length ?? 0, seriesB?.length ?? 0);
  if (length === 0) {
    return <p className="text-sm text-slate-500">Ajoutez une batterie pour visualiser le SOC.</p>;
  }
  const data: SocPoint[] = [];
  for (let i = 0; i < length; i += 1) {
    const time = seriesA?.[i]?.time ?? seriesB?.[i]?.time ?? 0;
    data.push({
      time_h: time,
      socA: seriesA?.[i]?.soc,
      socB: seriesB?.[i]?.soc
    });
  }

  return (
    <ResponsiveContainer width="100%" height={320}>
      <LineChart data={data} margin={{ top: 20, left: 0, right: 16, bottom: 0 }}>
        <XAxis dataKey="time_h" tickFormatter={(value) => `${value}h`} />
        <YAxis domain={[0, 100]} tickFormatter={(value) => `${value}%`} label={{ value: 'SOC (%)', angle: -90, position: 'insideLeft' }} />
        <Tooltip formatter={(value: number) => `${value.toFixed(1)} %`} labelFormatter={(value) => `${value} h`} />
        <Legend />
        {seriesA ? <Line type="monotone" dataKey="socA" stroke="#22c55e" strokeWidth={2} dot={false} name="SOC A" /> : null}
        {seriesB ? <Line type="monotone" dataKey="socB" stroke="#a855f7" strokeWidth={2} dot={false} name="SOC B" /> : null}
      </LineChart>
    </ResponsiveContainer>
  );
};

export default SocChart;
