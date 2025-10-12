import React, { useMemo, useState } from 'react';
import {
  Area,
  AreaChart,
  CartesianGrid,
  Legend,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from 'recharts';
import type { SeriesForRun } from '../../data/series';
import { useChartSync } from '../chartSync';

interface EnergyFlowsChartProps {
  series: SeriesForRun['energy'];
  variant: 'A' | 'B';
}

interface ChartDatum {
  hour: number;
  pv: number;
  base: number;
  dhw: number;
  charge: number;
  discharge: number;
  import: number;
  export: number;
  reason: string;
  t_s: number;
}

const COLORS = {
  pv: '#fbbf24',
  base: '#1d4ed8',
  dhw: '#f97316',
  charge: '#22c55e',
  discharge: '#14b8a6',
  import: '#ef4444',
  export: '#0ea5e9'
};

const EnergyFlowsChart: React.FC<EnergyFlowsChartProps> = ({ series, variant }) => {
  const [hiddenKeys, setHiddenKeys] = useState<Set<keyof ChartDatum>>(new Set());
  const { hoverTs, setHoverTs } = useChartSync();

  const data = useMemo<ChartDatum[]>(
    () =>
      series.map((point) => ({
        hour: point.hour,
        pv: point.pv_kW,
        base: point.baseLoad_kW,
        dhw: point.dhw_power_kW,
        charge: point.batt_charge_kW,
        discharge: point.batt_discharge_kW,
        import: point.gridImport_kW,
        export: point.gridExport_kW,
        reason: point.reason,
        t_s: point.t_s
      })),
    [series]
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
    <div className="h-72 w-full" role="figure" aria-label={`Flux énergétiques stratégie ${variant}`}>
      <ResponsiveContainer>
        <AreaChart
          data={data}
          onMouseMove={(state) => {
            const payload = state?.activePayload?.[0]?.payload as ChartDatum | undefined;
            if (payload) {
              setHoverTs(payload.t_s);
            }
          }}
          onMouseLeave={() => setHoverTs(null)}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#cbd5f5" />
          <XAxis
            type="number"
            dataKey="hour"
            domain={['dataMin', 'dataMax']}
            tickFormatter={formatHour}
          />
          <YAxis unit=" kW" />
          <Tooltip content={<EnergyTooltip variant={variant} />} />
          <Legend
            onClick={(entry) => {
              if (entry?.dataKey) {
                handleLegendClick(entry.dataKey as keyof ChartDatum);
              }
            }}
          />
          {typeof hoveredHour === 'number' ? (
            <ReferenceLine x={hoveredHour} stroke="#6366f1" strokeDasharray="4 2" />
          ) : null}
          <Area
            type="monotone"
            dataKey="pv"
            stroke={COLORS.pv}
            fill="rgba(251, 191, 36, 0.35)"
            name="PV"
            hide={hiddenKeys.has('pv')}
          />
          <Area
            type="monotone"
            dataKey="base"
            stackId="demand"
            stroke={COLORS.base}
            fill="rgba(29, 78, 216, 0.45)"
            name="Base"
            hide={hiddenKeys.has('base')}
          />
          <Area
            type="monotone"
            dataKey="dhw"
            stackId="demand"
            stroke={COLORS.dhw}
            fill="rgba(249, 115, 22, 0.45)"
            name="ECS"
            hide={hiddenKeys.has('dhw')}
          />
          <Area
            type="monotone"
            dataKey="charge"
            stroke={COLORS.charge}
            fill="rgba(34, 197, 94, 0.35)"
            name="Batterie charge"
            hide={hiddenKeys.has('charge')}
          />
          <Area
            type="monotone"
            dataKey="discharge"
            stroke={COLORS.discharge}
            fill="rgba(20, 184, 166, 0.35)"
            name="Batterie décharge"
            hide={hiddenKeys.has('discharge')}
          />
          <Area
            type="monotone"
            dataKey="import"
            stroke={COLORS.import}
            fill="rgba(239, 68, 68, 0.15)"
            name="Import"
            hide={hiddenKeys.has('import')}
          />
          <Area
            type="monotone"
            dataKey="export"
            stroke={COLORS.export}
            fill="rgba(14, 165, 233, 0.15)"
            name="Export"
            hide={hiddenKeys.has('export')}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
};

const formatHour = (value: number): string => {
  const hours = Math.floor(value);
  const minutes = Math.round((value - hours) * 60);
  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
};

interface EnergyTooltipProps {
  active?: boolean;
  payload?: Array<{ value: number; dataKey: keyof ChartDatum; payload: ChartDatum }>;
  label?: number;
  variant: 'A' | 'B';
}

const EnergyTooltip: React.FC<EnergyTooltipProps> = ({ active, payload, label, variant }) => {
  if (!active || !payload) {
    return null;
  }
  const rows = payload.filter((item) => typeof item.value === 'number');
  const datum = payload[0]?.payload;
  return (
    <div className="rounded border border-slate-200 bg-white/90 p-3 text-xs shadow">
      <div className="font-semibold">{formatHour(Number(label))}</div>
      <ul className="mt-2 space-y-1">
        {rows.map((item) => (
          <li key={item.dataKey}> {`${String(item.dataKey)}: ${item.value.toFixed(2)} kW`} </li>
        ))}
      </ul>
      <div className="mt-2 text-[11px] text-slate-500">Décision {variant}: {datum?.reason ?? 'idle'}</div>
    </div>
  );
};

export default EnergyFlowsChart;

