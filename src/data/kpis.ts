import { ExportKPIs, ExportStep, ExportV1 } from '../types/export';
import { WindowFilter, filterExportSteps } from './series';

const HOURS_IN_DAY = 24;

const dtToHours = (dt_s: number): number => dt_s / 3600;

const sum = (values: Iterable<number>): number => {
  let total = 0;
  for (const value of values) {
    total += value;
  }
  return total;
};

const energyFromPower = (values: number[], dt_s: number): number => sum(values) * dtToHours(dt_s);

const getVariantValue = (step: ExportStep, baseKey: string, variant: 'A' | 'B'): number => {
  const candidates = [
    `${baseKey}_${variant}_kW`,
    `${baseKey}_${variant}_kWh`,
    `${baseKey}_${variant}_C`,
    `${baseKey}_${variant}`
  ] as Array<keyof ExportStep>;
  for (const key of candidates) {
    const value = step[key];
    if (typeof value === 'number' && Number.isFinite(value)) {
      return value;
    }
  }
  return 0;
};

const getDecisionTemp = (step: ExportStep, variant: 'A' | 'B'): number => {
  const key = `dhw_temp_${variant}_C` as keyof ExportStep;
  const value = step[key];
  return typeof value === 'number' && Number.isFinite(value) ? value : 0;
};

const getDhwPower = (step: ExportStep, variant: 'A' | 'B'): number => {
  const key = `dhw_power_${variant}_kW` as keyof ExportStep;
  const value = step[key];
  return typeof value === 'number' && Number.isFinite(value) ? value : 0;
};

const getDecisionReason = (step: ExportStep, variant: 'A' | 'B'): string => {
  const key = `decision_reason_${variant}` as keyof ExportStep;
  const value = step[key];
  return typeof value === 'string' ? value : 'idle';
};

const normalise = (value: number): number => (Number.isFinite(value) ? value : 0);

export const computeKPIsForSteps = (
  meta: ExportV1['meta'],
  steps: ExportStep[],
  variant: 'A' | 'B'
): ExportKPIs => {
  const dt_s = meta.dt_s;
  const pvSeries = steps.map((step) => normalise(step.pv_kW));
  const pvTotal_kWh = energyFromPower(pvSeries, dt_s);
  const importSeries = steps.map((step) => getVariantValue(step, 'gridImport', variant));
  const import_kWh = energyFromPower(importSeries, dt_s);
  const exportSeries = steps.map((step) => getVariantValue(step, 'gridExport', variant));
  const export_kWh = energyFromPower(exportSeries, dt_s);

  const totalLoadSeries = steps.map((step) => step.baseLoad_kW + getDhwPower(step, variant));
  const totalLoad_kWh = energyFromPower(totalLoadSeries, dt_s);

  const autoconsumption_pct = pvTotal_kWh > 0 ? (1 - export_kWh / pvTotal_kWh) * 100 : 0;
  const autoproduct_pct = totalLoad_kWh > 0 ? (1 - import_kWh / totalLoad_kWh) * 100 : 0;

  const ecsTemps = steps.map((step) => getDecisionTemp(step, variant));
  const ecsAtTargetCount = ecsTemps.filter((temp) => temp >= meta.dhwConfig.targetCelsius).length;
  const ecs_time_at_or_above_target_pct = ecsTemps.length > 0 ? (ecsAtTargetCount / ecsTemps.length) * 100 : 0;

  const cost_EUR = computeCost(meta, steps, variant);

  return {
    autoconsumption_pct: clampPercent(autoconsumption_pct),
    autoproduct_pct: clampPercent(autoproduct_pct),
    import_kWh,
    export_kWh,
    cost_EUR,
    ecs_time_at_or_above_target_pct
  };
};

const clampPercent = (value: number): number => {
  if (!Number.isFinite(value)) {
    return 0;
  }
  if (value < 0) {
    return 0;
  }
  if (value > 100) {
    return 100;
  }
  return value;
};

const computeCost = (meta: ExportV1['meta'], steps: ExportStep[], variant: 'A' | 'B'): number => {
  const dt_h = dtToHours(meta.dt_s);
  let cost = 0;
  for (const step of steps) {
    const import_kWh = getVariantValue(step, 'gridImport', variant) * dt_h;
    const export_kWh = getVariantValue(step, 'gridExport', variant) * dt_h;
    let importPrice = meta.tariffs.import_EUR_per_kWh;
    if (meta.tariffs.mode === 'tou' && meta.tariffs.tou) {
      const hour = Math.floor((step.t_s / 3600) % HOURS_IN_DAY);
      const { onpeak_hours = [], offpeak_hours = [], onpeak_price, offpeak_price } = meta.tariffs.tou;
      if (onpeak_hours.includes(hour)) {
        importPrice = onpeak_price;
      } else if (offpeak_hours.includes(hour)) {
        importPrice = offpeak_price;
      } else {
        importPrice = offpeak_price;
      }
    }
    cost += import_kWh * importPrice;
    cost -= export_kWh * meta.tariffs.export_EUR_per_kWh;
  }
  return cost;
};

export const computeKPIsForWindow = (
  trace: ExportV1,
  window?: WindowFilter
): { A: ExportKPIs; B: ExportKPIs } => {
  const steps = filterExportSteps(trace.steps, window);
  return {
    A: computeKPIsForSteps(trace.meta, steps, 'A'),
    B: computeKPIsForSteps(trace.meta, steps, 'B')
  };
};

export const buildWindowedExport = (trace: ExportV1, window?: WindowFilter): ExportV1 => {
  const steps = filterExportSteps(trace.steps, window);
  const kpis = computeKPIsForWindow(trace, window);
  return {
    meta: trace.meta,
    steps,
    kpis
  };
};

export const hasDecisionEvent = (step: ExportStep, variant: 'A' | 'B'): boolean => {
  const reason = getDecisionReason(step, variant);
  return reason !== 'idle';
};

