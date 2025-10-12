import type { SimulationResult, SimulationTraceStep } from './engine';
import type { SimulationKPIs } from './kpis';
import type { ExportMetaV1, ExportKPIs, ExportStep, ExportV1 } from '../types/export';

export interface Trace {
  dt_s: number;
  steps: SimulationTraceStep[];
  totals: SimulationResult['totals'];
  kpis: SimulationKPIs;
}

const DEFAULT_JSON_FILENAME = 'enerflux_export_v1.json';
const DEFAULT_CSV_FILENAME = 'enerflux_export_v1.csv';

const toExportKPIs = (kpis: SimulationKPIs, totals: SimulationResult['totals']): ExportKPIs => ({
  autoconsumption_pct: kpis.selfConsumption * 100,
  autoproduct_pct: kpis.selfProduction * 100,
  import_kWh: totals.gridImport_kWh,
  export_kWh: totals.gridExport_kWh,
  cost_EUR: kpis.net_cost_with_penalties ?? kpis.euros.net_cost,
  ecs_time_at_or_above_target_pct: kpis.ecsTargetUptime * 100
});

const toNumber = (value: number | undefined): number => {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }
  return 0;
};

const toStringValue = (value: string | undefined): string => (typeof value === 'string' ? value : 'idle');

const buildStep = (
  index: number,
  meta: ExportMetaV1,
  stepA?: SimulationTraceStep,
  stepB?: SimulationTraceStep
): ExportStep => {
  const fallbackTime = index * meta.dt_s;
  const t_s = stepA?.time_s ?? stepB?.time_s ?? fallbackTime;
  const pv_kW = stepA?.pv_kW ?? stepB?.pv_kW ?? 0;
  const baseLoad_kW = stepA?.baseLoad_kW ?? stepB?.baseLoad_kW ?? 0;
  return {
    t_s,
    pv_kW,
    baseLoad_kW,
    surplus_A_kW: toNumber(stepA?.surplusBeforeStrategy_kW),
    deficit_A_kW: toNumber(stepA?.deficitBeforeStrategy_kW),
    battery_power_A_kW: toNumber(stepA?.battery_power_kW),
    battery_soc_A_kWh: toNumber(stepA?.battery_soc_kWh),
    dhw_power_A_kW: toNumber(stepA?.dhw_power_kW),
    dhw_temp_A_C: toNumber(stepA?.dhw_temp_C),
    gridImport_A_kW: toNumber(stepA?.gridImport_kW),
    gridExport_A_kW: toNumber(stepA?.gridExport_kW),
    pvUsedOnSite_A_kW: toNumber(stepA?.pvUsedOnSite_kW),
    decision_reason_A: toStringValue(stepA?.decision_reason),
    surplus_B_kW: toNumber(stepB?.surplusBeforeStrategy_kW),
    deficit_B_kW: toNumber(stepB?.deficitBeforeStrategy_kW),
    battery_power_B_kW: toNumber(stepB?.battery_power_kW),
    battery_soc_B_kWh: toNumber(stepB?.battery_soc_kWh),
    dhw_power_B_kW: toNumber(stepB?.dhw_power_kW),
    dhw_temp_B_C: toNumber(stepB?.dhw_temp_C),
    gridImport_B_kW: toNumber(stepB?.gridImport_kW),
    gridExport_B_kW: toNumber(stepB?.gridExport_kW),
    pvUsedOnSite_B_kW: toNumber(stepB?.pvUsedOnSite_kW),
    decision_reason_B: toStringValue(stepB?.decision_reason)
  };
};

export const buildExportV1 = (traceA: Trace, traceB: Trace, meta: ExportMetaV1): ExportV1 => {
  const length = Math.max(traceA.steps.length, traceB.steps.length);
  const steps: ExportStep[] = [];
  for (let index = 0; index < length; index += 1) {
    steps.push(buildStep(index, meta, traceA.steps[index], traceB.steps[index]));
  }
  return {
    meta,
    steps,
    kpis: {
      A: toExportKPIs(traceA.kpis, traceA.totals),
      B: toExportKPIs(traceB.kpis, traceB.totals)
    }
  };
};

const isBrowser = typeof window !== 'undefined' && typeof document !== 'undefined';

const downloadBlob = (filename: string, blob: Blob) => {
  if (!isBrowser) {
    return;
  }
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  link.click();
  URL.revokeObjectURL(link.href);
};

export const serializeJSON = (v1: ExportV1): string => JSON.stringify(v1, null, 2);

export const buildCSVContent = (v1: ExportV1): string => {
  const metadataLines = [
    `# version: ${v1.meta.version}`,
    `# scenario: ${v1.meta.scenario}`,
    `# dt_s: ${v1.meta.dt_s}`,
    `# strategyA: ${v1.meta.strategyA.id}`,
    `# strategyB: ${v1.meta.strategyB.id}`,
    `# tariffs: ${JSON.stringify(v1.meta.tariffs)}`,
    `# batteryConfig: ${JSON.stringify(v1.meta.batteryConfig)}`,
    `# dhwConfig: ${JSON.stringify(v1.meta.dhwConfig)}`
  ];
  const headers = [
    't_s',
    'pv_A',
    'base_A',
    'surplus_A',
    'battP_A',
    'soc_A',
    'dhwP_A',
    'dhwT_A',
    'import_A',
    'export_A',
    'pvUsed_A',
    'reason_A',
    'pv_B',
    'base_B',
    'surplus_B',
    'battP_B',
    'soc_B',
    'dhwP_B',
    'dhwT_B',
    'import_B',
    'export_B',
    'pvUsed_B',
    'reason_B'
  ];
  const escape = (value: string | number) => {
    const str = String(value);
    if (str.includes(';') || str.includes('\n')) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };
  const rows = v1.steps.map((step) => [
    step.t_s,
    step.pv_kW,
    step.baseLoad_kW,
    step.surplus_A_kW,
    step.battery_power_A_kW,
    step.battery_soc_A_kWh,
    step.dhw_power_A_kW,
    step.dhw_temp_A_C,
    step.gridImport_A_kW,
    step.gridExport_A_kW,
    step.pvUsedOnSite_A_kW,
    step.decision_reason_A,
    step.pv_kW,
    step.baseLoad_kW,
    step.surplus_B_kW,
    step.battery_power_B_kW,
    step.battery_soc_B_kWh,
    step.dhw_power_B_kW,
    step.dhw_temp_B_C,
    step.gridImport_B_kW,
    step.gridExport_B_kW,
    step.pvUsedOnSite_B_kW,
    step.decision_reason_B
  ]);
  const csvBody = [headers.join(';'), ...rows.map((row) => row.map(escape).join(';'))].join('\n');
  return [...metadataLines, csvBody].join('\n');
};

export const exportJSON = (v1: ExportV1, filename = DEFAULT_JSON_FILENAME): void => {
  const content = serializeJSON(v1);
  const blob = new Blob([content], { type: 'application/json' });
  downloadBlob(filename, blob);
};

export const exportCSV = (v1: ExportV1, filename = DEFAULT_CSV_FILENAME): void => {
  const content = buildCSVContent(v1);
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
  downloadBlob(filename, blob);
};
