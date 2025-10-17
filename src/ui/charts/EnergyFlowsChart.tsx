import React, { useMemo } from 'react';
import { Area, AreaChart, CartesianGrid, Legend, Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import type { SeriesForRun } from '../../data/series';
import { useChartSync } from '../chartSync';

interface EnergyFlowsChartProps {
  series: SeriesForRun['energy'];
  variant: 'A' | 'B';
}

interface ChartDatum {
  hour: number;
  pv: number;
  consumption: number;
  battery: number;
  grid: number;
  reason?: string;
  t_s: number;
}

const EnergyFlowsChart: React.FC<EnergyFlowsChartProps> = ({ series, variant }) => {
  const { hoverTs, setHoverTs } = useChartSync();

  const data = useMemo<ChartDatum[]>(
    () =>
      series.map((point) => {
        // Simplification : 4 courbes claires
        // PV (production), Consumption (load+dhw), Battery (net), Grid (net)
        const batteryNet = point.batt_discharge_kW - point.batt_charge_kW; // + = décharge, - = charge
        const gridNet = point.gridImport_kW - point.gridExport_kW; // + = import, - = export

        return {
          hour: point.hour,
          pv: point.pv_kW,
          consumption: point.baseLoad_kW + point.dhw_power_kW,
          battery: batteryNet,
          grid: gridNet,
          reason: point.reason ? `Décision ${variant} : ${point.reason}` : undefined,
          t_s: point.t_s
        };
      }),
    [series, variant]
  );

  const hoveredHour = useMemo(() => {
    if (hoverTs == null) return null;
    const match = data.find((point) => point.t_s === hoverTs);
    return match ? match.hour : null;
  }, [data, hoverTs]);

  const title = `Flux de puissance — ${variant}`;

  return (
    <div className="space-y-2">
      <h3 className="text-sm font-semibold text-slate-700">{title}</h3>
      <ResponsiveContainer width="100%" height={220}>
        <LineChart
          data={data}
          onMouseMove={(state) => {
            const payload = state?.activePayload?.[0]?.payload as ChartDatum | undefined;
            if (payload) setHoverTs(payload.t_s);
          }}
          onMouseLeave={() => setHoverTs(null)}
          margin={{ top: 5, right: 20, left: 0, bottom: 5 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
          <XAxis
            dataKey="hour"
            type="number"
            domain={['dataMin', 'dataMax']}
            tickFormatter={(v) => `${Math.floor(v)}h`}
          />
          <YAxis
            tickFormatter={(v) => `${v.toFixed(1)}kW`}
            label={{ value: 'kW', angle: -90, position: 'insideLeft' }}
          />
          <Tooltip
            formatter={(value: number, name: string) => [`${value.toFixed(2)} kW`, name]}
            labelFormatter={(value) => `${value} h`}
          />
          <Legend />
          {typeof hoveredHour === 'number' && (
            <ReferenceLine x={hoveredHour} stroke="#94a3b8" strokeDasharray="3 3" strokeOpacity={0.6} />
          )}
          <Line type="monotone" dataKey="pv" stroke="#F0E442" strokeWidth={2} dot={false} name="PV" />
          <Line type="monotone" dataKey="consumption" stroke="#0072B2" strokeWidth={2} dot={false} name="Consommation" />
          <Line type="monotone" dataKey="battery" stroke="#009E73" strokeWidth={2} dot={false} name="Batterie" />
          <Line type="monotone" dataKey="grid" stroke="#D55E00" strokeWidth={2} dot={false} name="Réseau" />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};

export default EnergyFlowsChart;

