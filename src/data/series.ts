import { ExportV1, ExportStep } from '../types/export';

export type DecisionReason =
  | 'idle'
  | 'batt_charge'
  | 'batt_discharge'
  | 'ecs_preheat'
  | 'ecs_deadline_force'
  | 'grid_import'
  | 'export_surplus';

export interface TimePoint {
  index: number;
  t_s: number;
  hour: number;
  reason: DecisionReason;
}

export interface EnergyFlowPoint extends TimePoint {
  pv_kW: number;
  baseLoad_kW: number;
  dhw_power_kW: number;
  batt_charge_kW: number;
  batt_discharge_kW: number;
  gridImport_kW: number;
  gridExport_kW: number;
  pvUsedOnSite_kW: number;
}

export interface BatterySocPoint extends TimePoint {
  soc_kWh: number;
}

export interface DhwPoint extends TimePoint {
  temp_C: number;
  power_kW: number;
}

export interface DecisionPoint extends TimePoint {
  highlight: boolean;
}

export interface SeriesForRun {
  energy: EnergyFlowPoint[];
  battery: BatterySocPoint[];
  dhw: DhwPoint[];
  decisions: DecisionPoint[];
}

export interface BuiltSeries {
  meta: ExportV1['meta'];
  seriesA: SeriesForRun;
  seriesB: SeriesForRun;
}

export interface WindowFilter {
  startH: number;
  endH: number;
}

const clampReason = (reason: string): DecisionReason => {
  const allowed: DecisionReason[] = [
    'idle',
    'batt_charge',
    'batt_discharge',
    'ecs_preheat',
    'ecs_deadline_force',
    'grid_import',
    'export_surplus'
  ];
  if (allowed.includes(reason as DecisionReason)) {
    return reason as DecisionReason;
  }
  return 'idle';
};

const buildEnergyPoint = (
  step: ExportStep,
  index: number,
  variant: 'A' | 'B'
): EnergyFlowPoint => {
  const t_s = step.t_s;
  const hour = step.t_s / 3600;
  const power = variant === 'A' ? step.battery_power_A_kW : step.battery_power_B_kW;
  const charge = power > 0 ? power : 0;
  const discharge = power < 0 ? -power : 0;
  return {
    index,
    t_s,
    hour,
    reason: clampReason(variant === 'A' ? step.decision_reason_A : step.decision_reason_B),
    pv_kW: step.pv_kW,
    baseLoad_kW: step.baseLoad_kW,
    dhw_power_kW: variant === 'A' ? step.dhw_power_A_kW : step.dhw_power_B_kW,
    batt_charge_kW: charge,
    batt_discharge_kW: discharge,
    gridImport_kW: variant === 'A' ? step.gridImport_A_kW : step.gridImport_B_kW,
    gridExport_kW: variant === 'A' ? step.gridExport_A_kW : step.gridExport_B_kW,
    pvUsedOnSite_kW: variant === 'A' ? step.pvUsedOnSite_A_kW : step.pvUsedOnSite_B_kW
  };
};

const buildBatteryPoint = (
  step: ExportStep,
  index: number,
  variant: 'A' | 'B'
): BatterySocPoint => ({
  index,
  t_s: step.t_s,
  hour: step.t_s / 3600,
  soc_kWh: variant === 'A' ? step.battery_soc_A_kWh : step.battery_soc_B_kWh,
  reason: clampReason(variant === 'A' ? step.decision_reason_A : step.decision_reason_B)
});

const buildDhwPoint = (step: ExportStep, index: number, variant: 'A' | 'B'): DhwPoint => ({
  index,
  t_s: step.t_s,
  hour: step.t_s / 3600,
  temp_C: variant === 'A' ? step.dhw_temp_A_C : step.dhw_temp_B_C,
  power_kW: variant === 'A' ? step.dhw_power_A_kW : step.dhw_power_B_kW,
  reason: clampReason(variant === 'A' ? step.decision_reason_A : step.decision_reason_B)
});

const buildDecisions = (steps: ExportStep[], variant: 'A' | 'B'): DecisionPoint[] =>
  steps.map((step, index) => {
    const reason = clampReason(variant === 'A' ? step.decision_reason_A : step.decision_reason_B);
    return {
      index,
      t_s: step.t_s,
      hour: step.t_s / 3600,
      reason,
      highlight: reason !== 'idle'
    };
  });

export const buildSeriesForVariant = (trace: ExportV1, variant: 'A' | 'B'): SeriesForRun => {
  const energy = trace.steps.map((step, index) => buildEnergyPoint(step, index, variant));
  const battery = trace.steps.map((step, index) => buildBatteryPoint(step, index, variant));
  const dhw = trace.steps.map((step, index) => buildDhwPoint(step, index, variant));
  const decisions = buildDecisions(trace.steps, variant);
  return { energy, battery, dhw, decisions };
};

export const buildSeries = (trace: ExportV1): BuiltSeries => ({
  meta: trace.meta,
  seriesA: buildSeriesForVariant(trace, 'A'),
  seriesB: buildSeriesForVariant(trace, 'B')
});

const withinWindow = (point: TimePoint, window: WindowFilter): boolean => {
  if (typeof window.startH === 'number' && point.hour < window.startH) {
    return false;
  }
  if (typeof window.endH === 'number' && point.hour > window.endH) {
    return false;
  }
  return true;
};

const filterTimeSeries = <T extends TimePoint>(series: T[], window: WindowFilter): T[] =>
  series.filter((point) => withinWindow(point, window));

export const applyWindowToSeries = (series: SeriesForRun, window: WindowFilter): SeriesForRun => ({
  energy: filterTimeSeries(series.energy, window),
  battery: filterTimeSeries(series.battery, window),
  dhw: filterTimeSeries(series.dhw, window),
  decisions: filterTimeSeries(series.decisions, window)
});

export const filterExportSteps = (steps: ExportStep[], window?: WindowFilter): ExportStep[] => {
  if (!window) {
    return [...steps];
  }
  return steps.filter((step) => {
    const hour = step.t_s / 3600;
    if (typeof window.startH === 'number' && hour < window.startH) {
      return false;
    }
    if (typeof window.endH === 'number' && hour > window.endH) {
      return false;
    }
    return true;
  });
};

export const sliceSeriesWithWindow = (
  built: BuiltSeries,
  window?: WindowFilter
): { seriesA: SeriesForRun; seriesB: SeriesForRun } => {
  if (!window) {
    return { seriesA: built.seriesA, seriesB: built.seriesB };
  }
  return {
    seriesA: applyWindowToSeries(built.seriesA, window),
    seriesB: applyWindowToSeries(built.seriesB, window)
  };
};

