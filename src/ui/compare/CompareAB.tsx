import React, { useEffect, useMemo, useRef, useState } from 'react';
import type { SimulationResult } from '../../core/engine';
import type { WorkerRequest, WorkerResponse } from '../../workers/sim.worker';
import { getScenarioPreset, PresetId } from '../../data/scenarios';
import { BatteryParams } from '../../devices/Battery';
import { DHWTankParams } from '../../devices/DHWTank';
import { DeviceConfig } from '../../devices/registry';
import { summarizeFlows } from '../../core/kpis';
import type { StepFlows, Tariffs } from '../../data/types';
import type { EcsServiceContract } from '../../data/ecs-service';
import { HELP } from '../help';
import { StrategySelection } from '../panels/StrategyPanel';
import type { HeatingFormState, PoolFormState, EVFormState } from '../types';
import { formatCycles, formatDelta, formatKWh, formatPct } from '../utils/ui';
import CondensedKpiGrid, { CondensedKpiGroup, CondensedKpiRow } from './CondensedKpiGrid';
import { buildEconomicRows } from './economicRows';
import { buildExportV1, exportCSV as triggerCSVDownload, exportJSON as triggerJSONDownload, type Trace as ExportTrace } from '../../core/exporter';
import type { ExportMetaV1, ExportV1 } from '../../types/export';
import ABCompareLayout from '../ABCompareLayout';

interface CompareABProps {
  scenarioId: PresetId;
  dt_s: number;
  battery: BatteryParams;
  dhw: DHWTankParams;
  heating: HeatingFormState;
  pool: PoolFormState;
  ev: EVFormState;
  ecsService: EcsServiceContract;
  tariffs: Tariffs;
  strategyA: StrategySelection;
  strategyB: StrategySelection;
  onExportReady?: (exportData: ExportV1 | null) => void;
}

const sanitizeBattery = (params: BatteryParams): BatteryParams => {
  const capacity = Math.max(params.capacity_kWh, 0);
  const socMax = Math.min(Math.max(params.socMax_kWh, 0), capacity || params.socMax_kWh);
  const socMin = Math.min(Math.max(params.socMin_kWh, 0), socMax);
  const socInit = Math.min(Math.max(params.socInit_kWh, socMin), socMax);
  return { ...params, capacity_kWh: capacity, socMax_kWh: socMax, socMin_kWh: socMin, socInit_kWh: socInit };
};

const clamp = (value: number, min: number, max: number): number => Math.min(Math.max(value, min), max);

const sanitizeHeating = (config: HeatingFormState): HeatingFormState => {
  const params = { ...config.params };
  params.maxPower_kW = Math.max(0, params.maxPower_kW);
  params.thermalCapacity_kWh_per_K = Math.max(0.1, params.thermalCapacity_kWh_per_K);
  params.lossCoeff_W_per_K = Math.max(0, params.lossCoeff_W_per_K);
  params.hysteresis_K = Math.max(0.05, params.hysteresis_K);
  params.dayStartHour = clamp(params.dayStartHour, 0, 24);
  params.nightStartHour = clamp(params.nightStartHour, 0, 24);
  params.ambientTemp_C = clamp(params.ambientTemp_C, -30, 40);
  params.comfortDay_C = clamp(params.comfortDay_C, -5, 30);
  params.comfortNight_C = clamp(params.comfortNight_C, -5, 30);
  params.initialTemp_C = clamp(params.initialTemp_C, -10, 35);
  return {
    enabled: config.enabled && params.maxPower_kW > 0,
    params
  };
};

const sanitizePool = (config: PoolFormState): PoolFormState => {
  const params = { ...config.params };
  params.power_kW = Math.max(0, params.power_kW);
  params.minHoursPerDay = clamp(params.minHoursPerDay, 0, 24);
  params.catchUpStartHour = clamp(params.catchUpStartHour, 0, 24);
  const windows =
    params.preferredWindows.length > 0
      ? params.preferredWindows
      : [{ startHour: 10, endHour: 16 }];
  params.preferredWindows = windows.map((window) => ({
    startHour: clamp(window.startHour, 0, 24),
    endHour: clamp(window.endHour, 0, 24)
  }));
  return {
    enabled: config.enabled && params.power_kW > 0 && params.minHoursPerDay > 0,
    params
  };
};

const sanitizeEv = (config: EVFormState): EVFormState => {
  const params = { ...config.params };
  params.maxPower_kW = Math.max(0, params.maxPower_kW);
  const session = { ...params.session };
  session.arrivalHour = clamp(session.arrivalHour, 0, 24);
  session.departureHour = clamp(session.departureHour, 0, 24);
  session.energyNeed_kWh = Math.max(0, session.energyNeed_kWh);
  params.session = session;
  const enabled = config.enabled && params.maxPower_kW > 0 && session.energyNeed_kWh > 0;
  return {
    enabled,
    params
  };
};

const buildDeviceConfigs = (
  battery: BatteryParams,
  dhw: DHWTankParams,
  heating: HeatingFormState,
  pool: PoolFormState,
  ev: EVFormState
): DeviceConfig[] => {
  const configs: DeviceConfig[] = [];
  if (battery.capacity_kWh > 0) {
    configs.push({ id: 'battery', label: 'Batterie', type: 'battery', params: { ...battery } });
  }
  configs.push({ id: 'dhw', label: 'Ballon ECS', type: 'dhw-tank', params: { ...dhw } });
  if (heating.enabled && heating.params.maxPower_kW > 0) {
    configs.push({ id: 'heating', label: 'Chauffage', type: 'heating', params: { ...heating.params } });
  }
  if (pool.enabled && pool.params.power_kW > 0) {
    configs.push({
      id: 'pool',
      label: 'Pompe piscine',
      type: 'pool-pump',
      params: { ...pool.params, preferredWindows: pool.params.preferredWindows.map((window) => ({ ...window })) }
    });
  }
  if (ev.enabled && ev.params.maxPower_kW > 0 && ev.params.session.energyNeed_kWh > 0) {
    configs.push({
      id: 'ev',
      label: 'Borne VE',
      type: 'ev-charger',
      params: { ...ev.params, session: { ...ev.params.session } }
    });
  }
  return configs;
};

const extractSocPercent = (step: SimulationResult['steps'][number]): number | undefined => {
  const device = step.deviceStates.find((state) => typeof state.state.soc_percent === 'number');
  if (!device) {
    return undefined;
  }
  return Number(device.state.soc_percent);
};

const extractHeatingState = (
  step: SimulationResult['steps'][number]
): { temp: number | null; power: number | null } => {
  const device = step.deviceStates.find((state) => state.id === 'heating');
  if (!device) {
    return { temp: null, power: null };
  }
  const temp =
    typeof device.state.temp_C === 'number' && Number.isFinite(device.state.temp_C)
      ? Number(device.state.temp_C)
      : null;
  const power =
    typeof device.state.heating_power_kW === 'number' && Number.isFinite(device.state.heating_power_kW)
      ? Number(device.state.heating_power_kW)
      : null;
  return { temp, power };
};

const extractPoolState = (
  step: SimulationResult['steps'][number]
): { hoursRun: number | null; hoursRemaining: number | null; running: boolean } => {
  const device = step.deviceStates.find((state) => state.id === 'pool');
  if (!device) {
    return { hoursRun: null, hoursRemaining: null, running: false };
  }
  const hoursRun =
    typeof device.state.hours_run === 'number' && Number.isFinite(device.state.hours_run)
      ? Number(device.state.hours_run)
      : null;
  const hoursRemaining =
    typeof device.state.hours_remaining === 'number' && Number.isFinite(device.state.hours_remaining)
      ? Number(device.state.hours_remaining)
      : null;
  const running = Boolean(device.state.running);
  return { hoursRun, hoursRemaining, running };
};

const extractEvState = (
  step: SimulationResult['steps'][number]
): { energyRemaining: number | null; charging: boolean; power: number | null } => {
  const device = step.deviceStates.find((state) => state.id === 'ev');
  if (!device) {
    return { energyRemaining: null, charging: false, power: null };
  }
  const remaining =
    typeof device.state.energy_remaining_kWh === 'number'
      ? Number(device.state.energy_remaining_kWh)
      : null;
  const charging = Boolean(device.state.charging);
  const power =
    typeof device.state.charging_power_kW === 'number'
      ? Number(device.state.charging_power_kW)
      : null;
  return { energyRemaining: remaining, charging, power };
};

const renderDeltaBadge = (
  delta: number,
  threshold: number,
  formatter: (delta: number) => string,
  preferHigher = true
): JSX.Element | null => {
  if (!Number.isFinite(threshold)) {
    return null;
  }
  const magnitude = Math.abs(delta);
  let color = 'bg-slate-200 text-slate-700';
  if (magnitude >= threshold) {
    const isImprovement = preferHigher ? delta > 0 : delta < 0;
    color = isImprovement ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800';
  }
  return (
    <span className={`ml-2 inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold ${color}`}>
      Δ {formatter(delta)}
    </span>
  );
};

const formatKW = (value: number): string => `${value.toFixed(2)} kW`;

const toScalar = (value: number | number[] | undefined): number => {
  if (Array.isArray(value)) {
    return value.length > 0 ? Number(value[0]) || 0 : 0;
  }
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }
  return 0;
};

const buildTariffsMeta = (tariffs: Tariffs): ExportMetaV1['tariffs'] => {
  if (tariffs.mode === 'tou') {
    const tou = tariffs.tou ?? {
      onpeak_hours: [],
      offpeak_hours: [],
      onpeak_price: toScalar(tariffs.import_EUR_per_kWh),
      offpeak_price: toScalar(tariffs.export_EUR_per_kWh)
    };
    return {
      mode: 'tou',
      import_EUR_per_kWh: toScalar(tariffs.import_EUR_per_kWh),
      export_EUR_per_kWh: toScalar(tariffs.export_EUR_per_kWh),
      tou: {
        onpeak_hours: [...(tou.onpeak_hours ?? [])],
        offpeak_hours: [...(tou.offpeak_hours ?? [])],
        onpeak_price: tou.onpeak_price,
        offpeak_price: tou.offpeak_price
      }
    };
  }
  return {
    mode: 'fixed',
    import_EUR_per_kWh: toScalar(tariffs.import_EUR_per_kWh),
    export_EUR_per_kWh: toScalar(tariffs.export_EUR_per_kWh)
  };
};

const buildBatteryMeta = (battery: BatteryParams): ExportMetaV1['batteryConfig'] => ({
  socMin_kWh: battery.socMin_kWh,
  socMax_kWh: battery.socMax_kWh,
  maxCharge_kW: battery.pMax_kW,
  maxDischarge_kW: battery.pMax_kW,
  efficiency: battery.etaCharge * battery.etaDischarge
});

const buildDhwMeta = (ecsService: EcsServiceContract): ExportMetaV1['dhwConfig'] => ({
  mode: ecsService.mode,
  targetCelsius: ecsService.targetCelsius,
  deadlineHour: ecsService.mode === 'off' ? undefined : ecsService.deadlineHour,
  hysteresis_K: ecsService.helpers?.hysteresisBand_K
});

const toExportTrace = (result: SimulationResult | null): ExportTrace | null => {
  if (!result) {
    return null;
  }
  return {
    dt_s: result.dt_s,
    steps: result.trace.steps,
    totals: result.totals,
    kpis: result.kpis
  };
};

const CompareAB: React.FC<CompareABProps> = ({
  scenarioId,
  dt_s,
  battery,
  dhw,
  heating,
  pool,
  ev,
  ecsService,
  tariffs,
  strategyA,
  strategyB,
  onExportReady
}) => {
  const sanitizedBattery = useMemo(() => sanitizeBattery(battery), [battery]);
  const sanitizedHeating = useMemo(() => sanitizeHeating(heating), [heating]);
  const sanitizedPool = useMemo(() => sanitizePool(pool), [pool]);
  const sanitizedEv = useMemo(() => sanitizeEv(ev), [ev]);
  const deviceConfigs = useMemo(
    () => buildDeviceConfigs(sanitizedBattery, { ...dhw }, sanitizedHeating, sanitizedPool, sanitizedEv),
    [sanitizedBattery, dhw, sanitizedHeating, sanitizedPool, sanitizedEv]
  );
  const scenario = getScenarioPreset(scenarioId);

  const [resultA, setResultA] = useState<SimulationResult | null>(null);
  const [resultB, setResultB] = useState<SimulationResult | null>(null);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [debugTrace, setDebugTrace] = useState(false);
  const [exportsOpen, setExportsOpen] = useState(false);
  const [uploadedExport, setUploadedExport] = useState<ExportV1 | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const workerRef = useRef<Worker | null>(null);
  const pendingRunId = useRef<string | null>(null);
  const exportsRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const worker = new Worker(new URL('../../workers/sim.worker.ts', import.meta.url), { type: 'module' });
    workerRef.current = worker;
    const handleMessage = (event: MessageEvent<WorkerResponse | { error: string; runId?: string }>) => {
      const data = event.data;
      if ('error' in data) {
        if (!pendingRunId.current || data.runId === pendingRunId.current) {
          setError(data.error);
          setRunning(false);
          pendingRunId.current = null;
        }
        return;
      }
      if (pendingRunId.current && data.runId && data.runId !== pendingRunId.current) {
        return;
      }
      setResultA(data.resultA);
      setResultB(data.resultB);
      setRunning(false);
      setError(null);
      pendingRunId.current = null;
    };
    worker.addEventListener('message', handleMessage as EventListener);
    return () => {
      worker.removeEventListener('message', handleMessage as EventListener);
      worker.terminate();
    };
  }, []);

  useEffect(() => {
    if (!exportsOpen) {
      return;
    }
    const handleClick = (event: MouseEvent) => {
      if (!exportsRef.current) {
        return;
      }
      const target = event.target as Node | null;
      if (target && !exportsRef.current.contains(target)) {
        setExportsOpen(false);
      }
    };
    if (typeof document !== 'undefined') {
      document.addEventListener('mousedown', handleClick);
    }
    return () => {
      if (typeof document !== 'undefined') {
        document.removeEventListener('mousedown', handleClick);
      }
    };
  }, [exportsOpen]);

  const runSimulation = () => {
    if (!workerRef.current) {
      return;
    }
    const payload: WorkerRequest = {
      runId: `${Date.now()}`,
      scenarioId,
      dt_s,
      devicesConfig: deviceConfigs,
      strategyA: { id: strategyA.id, thresholdPercent: strategyA.thresholdPercent },
      strategyB: { id: strategyB.id, thresholdPercent: strategyB.thresholdPercent },
      tariffs,
      ecsService,
      debugTrace
    };
    pendingRunId.current = payload.runId ?? null;
    setRunning(true);
    setError(null);
    workerRef.current.postMessage(payload);
  };

  const handleImportExport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }
    try {
      const text = await file.text();
      const parsed = JSON.parse(text) as ExportV1;
      if (!parsed?.meta || !Array.isArray(parsed.steps)) {
        throw new Error('Invalid export');
      }
      setUploadedExport(parsed);
      setUploadError(null);
    } catch (err) {
      setUploadError("Impossible d'analyser le fichier export.");
      setUploadedExport(null);
    } finally {
      event.target.value = '';
    }
  };

  const clearImportedExport = () => {
    setUploadedExport(null);
    setUploadError(null);
  };

  const exportMeta = useMemo<ExportMetaV1>(
    () => ({
      version: '1.0',
      scenario: scenario?.id ?? scenarioId,
      dt_s,
      tariffs: buildTariffsMeta(tariffs),
      batteryConfig: buildBatteryMeta(sanitizedBattery),
      dhwConfig: buildDhwMeta(ecsService),
      strategyA: { id: strategyA.id },
      strategyB: { id: strategyB.id }
    }),
    [scenario?.id, scenarioId, dt_s, tariffs, sanitizedBattery, ecsService, strategyA.id, strategyB.id]
  );

  const simulationExport = useMemo<ExportV1 | null>(() => {
    const traceA = toExportTrace(resultA);
    const traceB = toExportTrace(resultB);
    if (!traceA || !traceB) {
      return null;
    }
    return buildExportV1(traceA, traceB, exportMeta);
  }, [resultA, resultB, exportMeta]);

  useEffect(() => {
    if (onExportReady) {
      onExportReady(simulationExport);
    }
  }, [simulationExport, onExportReady]);

  const activeExport = uploadedExport ?? simulationExport;

  const handleExportJson = () => {
    const traceA = toExportTrace(resultA);
    const traceB = toExportTrace(resultB);
    if (!traceA || !traceB) {
      return;
    }
    const payload = buildExportV1(traceA, traceB, exportMeta);
    triggerJSONDownload(payload);
    setExportsOpen(false);
  };

  const handleExportCsv = () => {
    const traceA = toExportTrace(resultA);
    const traceB = toExportTrace(resultB);
    if (!traceA || !traceB) {
      return;
    }
    const payload = buildExportV1(traceA, traceB, exportMeta);
    triggerCSVDownload(payload);
    setExportsOpen(false);
  };

  const badges: JSX.Element[] = [];
  if (ecsService.mode === 'force') {
    if (resultA?.kpis.ecs_rescue_used) {
      badges.push(
        <span
          key="rescue-a"
          className="inline-flex items-center rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-800"
        >
          A · Secours réseau ECS : {formatKWh(resultA.kpis.ecs_rescue_kWh, 2)}
        </span>
      );
    }
    if (resultB?.kpis.ecs_rescue_used) {
      badges.push(
        <span
          key="rescue-b"
          className="inline-flex items-center rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-800"
        >
          B · Secours réseau ECS : {formatKWh(resultB.kpis.ecs_rescue_kWh, 2)}
        </span>
      );
    }
  } else if (ecsService.mode === 'penalize') {
    if (resultA && (resultA.kpis.ecs_deficit_K ?? 0) > 0) {
      badges.push(
        <span
          key="penalty-a"
          className="inline-flex items-center rounded-full bg-red-100 px-3 py-1 text-xs font-semibold text-red-800"
        >
          A · Déficit ECS : {resultA.kpis.ecs_deficit_K.toFixed(1)} K (pénalité
          {` ${resultA.kpis.ecs_penalty_EUR.toFixed(2)} €`})
        </span>
      );
    }
    if (resultB && (resultB.kpis.ecs_deficit_K ?? 0) > 0) {
      badges.push(
        <span
          key="penalty-b"
          className="inline-flex items-center rounded-full bg-red-100 px-3 py-1 text-xs font-semibold text-red-800"
        >
          B · Déficit ECS : {resultB.kpis.ecs_deficit_K.toFixed(1)} K (pénalité
          {` ${resultB.kpis.ecs_penalty_EUR.toFixed(2)} €`})
        </span>
      );
    }
  }

  const kpiRows: CondensedKpiRow[] = [
    {
      label: 'Autoconsommation',
      valueA: resultA?.kpis.selfConsumption,
      valueB: resultB?.kpis.selfConsumption,
      formatter: (value: number) => formatPct(value),
      deltaFormatter: (delta: number) => formatDelta(delta * 100, 1, ' %'),
      deltaThreshold: 0.001,
      helpKey: 'selfConsumption'
    },
    {
      label: 'Autoproduction',
      valueA: resultA?.kpis.selfProduction,
      valueB: resultB?.kpis.selfProduction,
      formatter: (value: number) => formatPct(value),
      deltaFormatter: (delta: number) => formatDelta(delta * 100, 1, ' %'),
      deltaThreshold: 0.001,
      helpKey: 'selfProduction'
    },
    {
      label: 'Cycles batterie (proxy)',
      valueA: resultA?.kpis.batteryCycles,
      valueB: resultB?.kpis.batteryCycles,
      formatter: (value: number) => formatCycles(value),
      deltaFormatter: (delta: number) => formatDelta(delta, 2),
      deltaThreshold: 0.05,
      helpKey: 'cycles'
    },
    {
      label: 'Temps ECS ≥ cible',
      valueA: resultA?.kpis.ecsTargetUptime,
      valueB: resultB?.kpis.ecsTargetUptime,
      formatter: (value: number) => formatPct(value),
      deltaFormatter: (delta: number) => formatDelta(delta * 100, 1, ' %'),
      deltaThreshold: 0.001,
      helpKey: 'ecsTargetUptime'
    },
    {
      label: 'Confort chauffage',
      valueA: resultA?.kpis.heating_comfort_ratio ?? undefined,
      valueB: resultB?.kpis.heating_comfort_ratio ?? undefined,
      formatter: (value: number) => formatPct(value),
      deltaFormatter: (delta: number) => formatDelta(delta * 100, 1, ' %'),
      deltaThreshold: 0.01,
      helpKey: 'heatingComfort'
    },
    {
      label: 'Filtration piscine',
      valueA: resultA?.kpis.pool_filtration_completion ?? undefined,
      valueB: resultB?.kpis.pool_filtration_completion ?? undefined,
      formatter: (value: number) => formatPct(value),
      deltaFormatter: (delta: number) => formatDelta(delta * 100, 1, ' %'),
      deltaThreshold: 0.02,
      helpKey: 'poolCompletion'
    },
    {
      label: 'Sessions VE servies',
      valueA: resultA?.kpis.ev_charge_completion ?? undefined,
      valueB: resultB?.kpis.ev_charge_completion ?? undefined,
      formatter: (value: number) => formatPct(value),
      deltaFormatter: (delta: number) => formatDelta(delta * 100, 1, ' %'),
      deltaThreshold: 0.02,
      helpKey: 'evCompletion'
    }
  ];

  const euroRows = buildEconomicRows(resultA, resultB);

  type FlowKey = keyof StepFlows;
  const flowRows: { key: FlowKey; label: string }[] = [
    { key: 'pv_to_load_kW', label: 'PV -> Charge base' },
    { key: 'pv_to_ecs_kW', label: 'PV -> ECS' },
    { key: 'pv_to_heat_kW', label: 'PV -> Chauffage' },
    { key: 'pv_to_pool_kW', label: 'PV -> Piscine' },
    { key: 'pv_to_ev_kW', label: 'PV -> VE' },
    { key: 'pv_to_batt_kW', label: 'PV -> Batterie' },
    { key: 'pv_to_grid_kW', label: 'PV -> Reseau' },
    { key: 'batt_to_load_kW', label: 'Batterie -> Charge base' },
    { key: 'batt_to_ecs_kW', label: 'Batterie -> ECS' },
    { key: 'batt_to_heat_kW', label: 'Batterie -> Chauffage' },
    { key: 'batt_to_pool_kW', label: 'Batterie -> Piscine' },
    { key: 'batt_to_ev_kW', label: 'Batterie -> VE' },
    { key: 'grid_to_load_kW', label: 'Reseau -> Charge base' },
    { key: 'grid_to_ecs_kW', label: 'Reseau -> ECS' },
    { key: 'grid_to_heat_kW', label: 'Reseau -> Chauffage' },
    { key: 'grid_to_pool_kW', label: 'Reseau -> Piscine' },
    { key: 'grid_to_ev_kW', label: 'Reseau -> VE' }
  ];
  const flowSummaryA = resultA ? summarizeFlows(resultA.flows, resultA.dt_s) : null;
  const flowSummaryB = resultB ? summarizeFlows(resultB.flows, resultB.dt_s) : null;
  const heatingEnergyA =
    flowSummaryA?.total_kWh.pv_to_heat_kW !== undefined
      ? flowSummaryA.total_kWh.pv_to_heat_kW +
        flowSummaryA.total_kWh.batt_to_heat_kW +
        flowSummaryA.total_kWh.grid_to_heat_kW
      : undefined;
  const heatingEnergyB =
    flowSummaryB?.total_kWh.pv_to_heat_kW !== undefined
      ? flowSummaryB.total_kWh.pv_to_heat_kW +
        flowSummaryB.total_kWh.batt_to_heat_kW +
        flowSummaryB.total_kWh.grid_to_heat_kW
      : undefined;
  const poolEnergyA =
    flowSummaryA?.total_kWh.pv_to_pool_kW !== undefined
      ? flowSummaryA.total_kWh.pv_to_pool_kW +
        flowSummaryA.total_kWh.batt_to_pool_kW +
        flowSummaryA.total_kWh.grid_to_pool_kW
      : undefined;
  const poolEnergyB =
    flowSummaryB?.total_kWh.pv_to_pool_kW !== undefined
      ? flowSummaryB.total_kWh.pv_to_pool_kW +
        flowSummaryB.total_kWh.batt_to_pool_kW +
        flowSummaryB.total_kWh.grid_to_pool_kW
      : undefined;
  const evEnergyA =
    flowSummaryA?.total_kWh.pv_to_ev_kW !== undefined
      ? flowSummaryA.total_kWh.pv_to_ev_kW +
        flowSummaryA.total_kWh.batt_to_ev_kW +
        flowSummaryA.total_kWh.grid_to_ev_kW
      : undefined;
  const evEnergyB =
    flowSummaryB?.total_kWh.pv_to_ev_kW !== undefined
      ? flowSummaryB.total_kWh.pv_to_ev_kW +
        flowSummaryB.total_kWh.batt_to_ev_kW +
        flowSummaryB.total_kWh.grid_to_ev_kW
      : undefined;

  const condensedGroups: CondensedKpiGroup[] = [
    {
      id: 'core-kpis',
      title: 'Performance globale',
      description: 'Autoconsommation, autoproduction, cycles batterie et service ECS.',
      variant: 'cards',
      rows: kpiRows
    },
    {
      id: 'economics',
      title: 'Impact economique',
      description: 'Lecture rapide des couts import/export et du temps de retour.',
      variant: 'cards',
      rows: euroRows
    }
  ];

  const totalsRows = [
    {
      label: 'PV produit',
      valueA: resultA ? formatKWh(resultA.totals.pvProduction_kWh) : '-',
      valueB: resultB ? formatKWh(resultB.totals.pvProduction_kWh) : '-'
    },
    {
      label: 'Consommation',
      valueA: resultA ? formatKWh(resultA.totals.consumption_kWh) : '-',
      valueB: resultB ? formatKWh(resultB.totals.consumption_kWh) : '-'
    },
    {
      label: 'Delta SOC batterie',
      valueA: resultA ? formatDelta(resultA.totals.batteryDelta_kWh, 1, 'kWh') : '-',
      valueB: resultB ? formatDelta(resultB.totals.batteryDelta_kWh, 1, 'kWh') : '-'
    },
    {
      label: 'Import reseau',
      valueA: resultA ? formatKWh(resultA.totals.gridImport_kWh) : '-',
      valueB: resultB ? formatKWh(resultB.totals.gridImport_kWh) : '-'
    },
    {
      label: 'Export reseau',
      valueA: resultA ? formatKWh(resultA.totals.gridExport_kWh) : '-',
      valueB: resultB ? formatKWh(resultB.totals.gridExport_kWh) : '-'
    },
    {
      label: 'Chauffage total',
      valueA: heatingEnergyA !== undefined ? formatKWh(heatingEnergyA) : '-',
      valueB: heatingEnergyB !== undefined ? formatKWh(heatingEnergyB) : '-'
    },
    {
      label: 'Pompe piscine',
      valueA: poolEnergyA !== undefined ? formatKWh(poolEnergyA) : '-',
      valueB: poolEnergyB !== undefined ? formatKWh(poolEnergyB) : '-'
    },
    {
      label: 'Recharge VE',
      valueA: evEnergyA !== undefined ? formatKWh(evEnergyA) : '-',
      valueB: evEnergyB !== undefined ? formatKWh(evEnergyB) : '-'
    },
    {
      label: 'Secours ECS',
      valueA: resultA ? formatKWh(resultA.totals.ecsRescue_kWh) : '-',
      valueB: resultB ? formatKWh(resultB.totals.ecsRescue_kWh) : '-'
    }
  ];


  const scenarioLabel = scenario?.label ?? 'Comparaison A/B';
  const scenarioDescription =
    scenario?.description ?? 'Sélectionnez un scénario pour visualiser la production et la charge.';

  return (
    <section className="space-y-6 rounded bg-white p-5 shadow">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Comparaison A/B</p>
          <h2 className="text-xl font-semibold text-slate-900">{scenarioLabel}</h2>
          <p className="text-sm text-slate-500">{scenarioDescription}</p>
          <p className="text-xs text-slate-400">Pas {Math.round(dt_s / 60)} min</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            className="rounded bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700 disabled:opacity-50"
            onClick={runSimulation}
            disabled={running}
          >
            {running ? 'Simulation en cours…' : 'Lancer la simulation'}
          </button>
          <label className="flex items-center gap-2 rounded border border-slate-300 px-3 py-2 text-xs font-medium text-slate-600">
            <input
              type="checkbox"
              className="h-3 w-3 rounded border-slate-300"
              checked={debugTrace}
              onChange={(event) => setDebugTrace(event.target.checked)}
            />
            DEBUG trace
          </label>
          <label className="flex cursor-pointer items-center gap-2 rounded border border-slate-300 px-3 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100">
            <input type="file" accept="application/json" className="hidden" onChange={handleImportExport} />
            Import JSON v1
          </label>
          {uploadedExport ? (
            <button
              type="button"
              className="rounded border border-emerald-300 px-3 py-2 text-xs font-medium text-emerald-700 hover:bg-emerald-50"
              onClick={clearImportedExport}
            >
              Utiliser la simulation courante
            </button>
          ) : null}
          <div className="relative" ref={exportsRef}>
            <button
              type="button"
              className="flex items-center gap-2 rounded border border-slate-300 px-4 py-2 text-sm text-slate-700 hover:bg-slate-100 disabled:opacity-50"
              onClick={() => setExportsOpen((value) => !value)}
              disabled={!simulationExport}
            >
              Exports
              <span className="text-xs">▾</span>
            </button>
            {exportsOpen ? (
              <div className="absolute right-0 z-10 mt-2 w-48 rounded border border-slate-200 bg-white py-1 text-sm shadow-lg">
                <button
                  type="button"
                  className="block w-full px-4 py-2 text-left text-slate-700 hover:bg-slate-100"
                  onClick={handleExportJson}
                  disabled={!simulationExport}
                >
                  Export JSON (A+B)
                </button>
                <button
                  type="button"
                  className="block w-full px-4 py-2 text-left text-slate-700 hover:bg-slate-100"
                  onClick={handleExportCsv}
                  disabled={!simulationExport}
                >
                  Export CSV (A+B)
                </button>
              </div>
            ) : null}
          </div>
        </div>
      </div>

      {error ? <p className="text-sm text-red-600">{error}</p> : null}
      {uploadError ? <p className="text-sm text-red-600">{uploadError}</p> : null}

      {activeExport ? (
        <div className="space-y-4">
          <h3 className="text-sm font-semibold text-slate-600">Diagnostic A/B détaillé</h3>
          <ABCompareLayout trace={activeExport} />
        </div>
      ) : null}

      {badges.length ? <div className="flex flex-wrap gap-2">{badges}</div> : null}

      <div className="space-y-2">
        <h3 className="text-sm font-semibold text-slate-600">Indicateurs condensés</h3>
        {HELP.compare?.overview ? (
          <p className="text-xs text-slate-500">{HELP.compare.overview}</p>
        ) : null}
        <CondensedKpiGrid groups={condensedGroups} />
      </div>

      <details className="rounded border border-slate-200 bg-slate-50/80">
        <summary className="flex cursor-pointer items-center justify-between gap-2 px-4 py-3 text-sm font-semibold text-slate-700">
          <span>Tableaux détaillés</span>
          <span className="text-xs font-normal text-slate-500">Bilans énergie & flux moyens</span>
        </summary>
        <div className="space-y-6 border-t border-slate-200 px-4 py-4">
          <div className="space-y-2">
            <h4 className="text-xs font-semibold uppercase tracking-wide text-slate-500">Bilans énergie</h4>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200 text-sm">
                <thead>
                  <tr className="text-left text-slate-600">
                    <th className="py-2 font-medium">Énergie</th>
                    <th className="py-2 font-medium">Stratégie A</th>
                    <th className="py-2 font-medium">Stratégie B</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {totalsRows.map((row) => (
                    <tr key={row.label}>
                      <td className="py-2 font-medium text-slate-700">{row.label}</td>
                      <td className="py-2 text-slate-800">{row.valueA}</td>
                      <td className="py-2 text-slate-800">{row.valueB}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="space-y-2">
            <h4 className="text-xs font-semibold uppercase tracking-wide text-slate-500">Flux moyens (kW)</h4>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200 text-sm">
                <thead>
                  <tr className="text-left text-slate-600">
                    <th className="py-2 font-medium">Flux</th>
                    <th className="py-2 font-medium">Stratégie A</th>
                    <th className="py-2 font-medium">Stratégie B</th>
                    <th className="py-2 font-medium">Δ (A−B)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {flowRows.map((row) => {
                    const valueA = flowSummaryA?.avg_kW[row.key];
                    const valueB = flowSummaryB?.avg_kW[row.key];
                    const delta =
                      valueA !== undefined && valueB !== undefined ? valueA - valueB : undefined;
                    return (
                      <tr key={row.key}>
                        <td className="py-2 font-medium text-slate-700">{row.label}</td>
                        <td className="py-2 text-slate-800">{valueA !== undefined ? formatKW(valueA) : '—'}</td>
                        <td className="py-2 text-slate-800">{valueB !== undefined ? formatKW(valueB) : '—'}</td>
                        <td className="py-2 text-slate-800">
                          {delta !== undefined ? formatDelta(delta, 2, ' kW') : '—'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </details>
    </section>
  );
};

export default CompareAB;




