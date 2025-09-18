import React from 'react';
import { Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis, Legend } from 'recharts';
import { SimulationResult } from '../../core/engine';

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
    <ResponsiveContainer width="100%" height={320}>
      <LineChart data={data} margin={{ top: 20, left: 0, right: 16, bottom: 0 }}>
        <XAxis
          dataKey="time_h"
          tickFormatter={(value) => `${value}h`}
          label={{ value: 'Heure', position: 'insideBottomRight', offset: -8 }}
        />
        <YAxis
          tickFormatter={(value) => `${value} kW`}
          label={{ value: 'Puissance (kW)', angle: -90, position: 'insideLeft' }}
        />
        <Tooltip formatter={(value: number) => `${value.toFixed(2)} kW`} labelFormatter={(value) => `${value} h`} />
        <Legend />
        <Line type="monotone" dataKey="pv" stroke="#38bdf8" strokeWidth={2} dot={false} name="PV" />
        <Line type="monotone" dataKey="load" stroke="#f97316" strokeWidth={2} dot={false} name="Charge" />
      </LineChart>
    </ResponsiveContainer>
  );
};

export default PVLoadChart;
