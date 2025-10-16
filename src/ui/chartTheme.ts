import type { TooltipFormatter, TooltipLabelFormatter } from 'recharts';

export const chartColors = [
  '#F0E442', // vivid yellow — par défaut pour la production PV
  '#0072B2', // deep blue — charge maison
  '#009E73', // teal green — batterie (puissance/SOC)
  '#D55E00', // vermillion — réseau (import/export)
  '#CC79A7', // magenta — ECS / eau chaude sanitaire
  '#56B4E9', // sky blue — VE / PAC / Piscine
  '#E69F00', // orange — réserve (autres séries secondaires)
  '#000000' // black — fallback contrasté
] as const;

export const chartFont = {
  family: 'Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
  sizes: {
    title: 16,
    axis: 12,
    legend: 12,
    tick: 11
  }
} as const;

const clampNumber = (value: number): number => (Number.isFinite(value) ? value : 0);

const formatKw = (value: number): string => {
  const watts = clampNumber(value);
  const inKw = Math.abs(watts) >= 100 ? watts / 1000 : watts;
  return `${inKw.toFixed(1)} kW`;
};

const formatKwh = (value: number): string => `${clampNumber(value).toFixed(2)} kWh`;

const formatEur = (value: number): string => `${Math.round(clampNumber(value))} €`;

const formatPct = (value: number): string => `${Math.round(clampNumber(value) * 100)}%`;

const formatTime = (value: Date | string | number): string => {
  if (typeof value === 'number') {
    const hours = Math.floor(value);
    const minutes = Math.round((value - hours) * 60);
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
  }

  const stringValue = typeof value === 'string' ? value.trim() : '';
  if (/^\d{1,2}:\d{2}$/.test(stringValue)) {
    const [h, m] = stringValue.split(':');
    return `${h.padStart(2, '0')}:${m.padStart(2, '0')}`;
  }

  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) {
    return String(value);
  }
  const hours = date.getHours();
  const minutes = date.getMinutes();
  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
};

export const fmt = {
  kw: formatKw,
  kwh: formatKwh,
  eur: formatEur,
  pct: formatPct,
  time: formatTime
};

export interface SeriesMeta {
  key: string;
  name: string;
  color?: string;
  unit?: 'power' | 'energy' | 'currency' | 'percentage' | string;
  formatter?: TooltipFormatter<number | string, string> | TooltipLabelFormatter;
}

/**
 * Mapping stable métrique → couleur (voir palette chartColors).
 * - PV / production solaire : chartColors[0]
 * - Maison / charge / load : chartColors[1]
 * - Batterie (puissance, SOC) : chartColors[2]
 * - Réseau (import + export) : chartColors[3]
 * - ECS (eau chaude sanitaire) : chartColors[4]
 * - VE / PAC / Piscine : chartColors[5], puis reprise de la palette si besoin
 */
export const metricColorMap = {
  pv: chartColors[0],
  load: chartColors[1],
  demand: chartColors[1],
  battery: chartColors[2],
  batterySoc: chartColors[2],
  grid: chartColors[3],
  gridImport: chartColors[3],
  gridExport: chartColors[3],
  dhw: chartColors[4],
  ecs: chartColors[4],
  ev: chartColors[5],
  heatPump: chartColors[5],
  pool: chartColors[5]
} as const;

export const seriesColorFor = (metric: keyof typeof metricColorMap | string): string => {
  if (metric in metricColorMap) {
    return metricColorMap[metric as keyof typeof metricColorMap];
  }
  const index = Math.abs(metric.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0)) % chartColors.length;
  return chartColors[index];
};
