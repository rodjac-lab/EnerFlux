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
import PVLoadChart from '../charts/PVLoadChart';
import SocChart from '../charts/SocChart';
import { HELP } from '../help';
import { StrategySelection } from '../panels/StrategyPanel';
import type { HeatingFormState, PoolFormState, EVFormState } from '../types';
import {
  downloadCSV,
  downloadJSON,
  formatCycles,
  formatDelta,
  formatEUR,
  formatKWh,
  formatPct,
  formatYears
} from '../utils/ui';
import CondensedKpiGrid, { CondensedKpiGroup, CondensedKpiRow } from './CondensedKpiGrid';

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
  strategyB
}) => {
  const sanitizedBattery = useMemo(() => sanitizeBattery(battery), [battery]);
  const sanitizedHeating = useMemo(() => sanitizeHeating(heating), [heating]);
  const sanitizedPool = useMemo(() => sanitizePool(pool), [pool]);
  const sanitizedEv = useMemo(() => sanitizeEv(ev), [ev]);
  const deviceConfigs = useMemo(
    () => buildDeviceConfigs(sanitizedBattery, { ...dhw }, sanitizedHeating, sanitizedPool, sanitizedEv),
    [sanitizedBattery, dhw, sanitizedHeating, sanitizedPool, sanitizedEv]
  );

  const [resultA, setResultA] = useState<SimulationResult | null>(null);
  const [resultB, setResultB] = useState<SimulationResult | null>(null);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const workerRef = useRef<Worker | null>(null);
  const pendingRunId = useRef<string | null>(null);

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
      ecsService
    };
    pendingRunId.current = payload.runId ?? null;
    setRunning(true);
    setError(null);
    workerRef.current.postMessage(payload);
  };

  const scenario = getScenarioPreset(scenarioId);

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
    if ((resultA?.kpis.ecs_deficit_K ?? 0) > 0) {
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
    if ((resultB?.kpis.ecs_deficit_K ?? 0) > 0) {
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
      deltaThreshold: 0.001
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

  const euroRows: CondensedKpiRow[] = [
    {
      label: 'Investissement estimé',
      valueA: resultA?.kpis.euros.estimated_investment,
      valueB: resultB?.kpis.euros.estimated_investment,
      formatter: (value: number) => formatEUR(value, 0),
      deltaFormatter: (delta: number) => formatDelta(delta, 0, '€'),
      deltaThreshold: Number.POSITIVE_INFINITY,
      preferHigher: false,
      helpKey: 'investment'
    },
    {
      label: 'Investissement estimé',
      valueA: resultA?.kpis.euros.estimated_investment,
      valueB: resultB?.kpis.euros.estimated_investment,
      formatter: (value: number) => formatEUR(value, 0),
      deltaFormatter: (delta: number) => formatDelta(delta, 0, '€'),
      deltaThreshold: Number.POSITIVE_INFINITY,
      preferHigher: false,
      helpKey: 'investment'
    },
    {
      label: 'Coût import',
      valueA: resultA?.kpis.euros.cost_import,
      valueB: resultB?.kpis.euros.cost_import,
      formatter: (value: number) => formatEUR(value),
      deltaFormatter: (delta: number) => formatDelta(delta, 2, '€'),
      deltaThreshold: 0.1,
      preferHigher: false
    },
    {
      label: 'Revenu export',
      valueA: resultA?.kpis.euros.revenue_export,
      valueB: resultB?.kpis.euros.revenue_export,
      formatter: (value: number) => formatEUR(value),
      deltaFormatter: (delta: number) => formatDelta(delta, 2, '€'),
      deltaThreshold: 0.1,
      preferHigher: true
    },
    {
      label: 'Coût net',
      valueA: resultA?.kpis.euros.net_cost,
      valueB: resultB?.kpis.euros.net_cost,
      formatter: (value: number) => formatEUR(value),
      deltaFormatter: (delta: number) => formatDelta(delta, 2, '€'),
      deltaThreshold: 0.1,
      preferHigher: false,
      helpKey: 'netCost'
    },
    {
      label: 'Coût net (avec pénalités)',
      valueA: resultA?.kpis.net_cost_with_penalties,
      valueB: resultB?.kpis.net_cost_with_penalties,
      formatter: (value: number) => formatEUR(value),
      deltaFormatter: (delta: number) => formatDelta(delta, 2, '€'),
      deltaThreshold: 0.1,
      preferHigher: false
    },
    {
      label: 'Coût réseau seul',
      valueA: resultA?.kpis.euros.grid_only_cost,
      valueB: resultB?.kpis.euros.grid_only_cost,
      formatter: (value: number) => formatEUR(value),
      deltaFormatter: (delta: number) => formatDelta(delta, 2, '€'),
      deltaThreshold: Number.POSITIVE_INFINITY,
      preferHigher: false,
      helpKey: 'gridOnlyCost'
    },
    {
      label: 'Δ vs réseau seul',
      valueA: resultA?.kpis.euros.delta_vs_grid_only,
      valueB: resultB?.kpis.euros.delta_vs_grid_only,
      formatter: (value: number) => formatEUR(value),
      deltaFormatter: (delta: number) => formatDelta(delta, 2, '€'),
      deltaThreshold: 0.1,
      preferHigher: true,
      helpKey: 'deltaGrid'
    },
    {
      label: 'Taux d’économie vs réseau seul',
      valueA: resultA?.kpis.euros.savings_rate,
      valueB: resultB?.kpis.euros.savings_rate,
      formatter: (value: number) => formatPct(value, 1),
      deltaFormatter: (delta: number) => formatDelta(delta * 100, 1, ' %'),
      deltaThreshold: 0.005,
      preferHigher: true,
      helpKey: 'savingsRate'
    },
    {
      label: 'Temps de retour estimé',
      valueA: resultA?.kpis.euros.simple_payback_years ?? undefined,
      valueB: resultB?.kpis.euros.simple_payback_years ?? undefined,
      formatter: (value: number) => formatYears(value, 1),
      deltaFormatter: (delta: number) => formatDelta(delta, 1, ' ans'),
      deltaThreshold: 0.05,
      preferHigher: false,
      helpKey: 'payback'
    }
  ];

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

  const exportJson = () => {
    downloadJSON('enerflux_results.json', {
      scenario: scenario?.id,
      dt_s,
      tariffs,
      ecsService,
      strategyA,
      strategyB,
      resultA,
      resultB
    });
  };

  const exportCsv = () => {
    if (!resultA || !resultB) {
      return;
    }
    const length = Math.max(resultA.steps.length, resultB.steps.length);
    const rows: (string | number)[][] = [];
    for (let i = 0; i < length; i += 1) {
      const stepA = resultA.steps[i];
      const stepB = resultB.steps[i];
      const time = stepA?.time_s ?? stepB?.time_s ?? i * dt_s;
      const pv = stepA?.pv_kW ?? stepB?.pv_kW ?? 0;
      const load = stepA?.baseLoad_kW ?? stepB?.baseLoad_kW ?? 0;
      const socA = stepA ? extractSocPercent(stepA) ?? '' : '';
      const socB = stepB ? extractSocPercent(stepB) ?? '' : '';
      const heatingA = stepA ? extractHeatingState(stepA) : { temp: null, power: null };
      const heatingB = stepB ? extractHeatingState(stepB) : { temp: null, power: null };
      const poolA = stepA ? extractPoolState(stepA) : { hoursRun: null, hoursRemaining: null, running: false };
      const poolB = stepB ? extractPoolState(stepB) : { hoursRun: null, hoursRemaining: null, running: false };
      const evA = stepA ? extractEvState(stepA) : { energyRemaining: null, charging: false, power: null };
      const evB = stepB ? extractEvState(stepB) : { energyRemaining: null, charging: false, power: null };
      rows.push([
        time,
        pv,
        load,
        stepA?.pvUsedOnSite_kW ?? '',
        stepA?.gridImport_kW ?? '',
        stepB?.gridImport_kW ?? '',
        socA,
        socB,
        heatingA.temp ?? '',
        heatingA.power ?? '',
        heatingB.temp ?? '',
        heatingB.power ?? '',
        poolA.hoursRun ?? '',
        poolA.hoursRemaining ?? '',
        poolA.running ? 1 : 0,
        poolB.hoursRun ?? '',
        poolB.hoursRemaining ?? '',
        poolB.running ? 1 : 0,
        evA.energyRemaining ?? '',
        evA.power ?? '',
        evA.charging ? 1 : 0,
        evB.energyRemaining ?? '',
        evB.power ?? '',
        evB.charging ? 1 : 0
      ]);
    }
    downloadCSV(
      'enerflux_results.csv',
      [
        'time_s',
        'pv_kW',
        'load_kW',
        'pv_used_A_kW',
        'grid_import_A_kW',
        'grid_import_B_kW',
        'soc_A_percent',
        'soc_B_percent',
        'heating_temp_A_C',
        'heating_power_A_kW',
        'heating_temp_B_C',
        'heating_power_B_kW',
        'pool_hours_run_A_h',
        'pool_hours_remaining_A_h',
        'pool_running_A',
        'pool_hours_run_B_h',
        'pool_hours_remaining_B_h',
        'pool_running_B',
        'ev_energy_remaining_A_kWh',
        'ev_power_A_kW',
        'ev_charging_A',
        'ev_energy_remaining_B_kWh',
        'ev_power_B_kW',
        'ev_charging_B'
      ],
      rows
    );
  };

  return (
    <section className="bg-white shadow rounded p-4 space-y-6">
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-slate-800">Comparaison A/B</h2>
          <p className="text-sm text-slate-500">{scenario?.label} — pas {Math.round(dt_s / 60)} min</p>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            className="rounded bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700 disabled:opacity-50"
            onClick={runSimulation}
            disabled={running}
          >
            {running ? 'Simulation en cours…' : 'Lancer la simulation'}
          </button>
          <button
            type="button"
            className="rounded border border-slate-300 px-4 py-2 text-sm text-slate-700 hover:bg-slate-100"
            onClick={exportJson}
            disabled={!resultA || !resultB}
          >
            Export JSON
          </button>
          <button
            type="button"
            className="rounded border border-slate-300 px-4 py-2 text-sm text-slate-700 hover:bg-slate-100"
            onClick={exportCsv}
            disabled={!resultA || !resultB}
          >
            Export CSV
          </button>
        </div>
      </div>

      {error ? <p className="text-sm text-red-600">{error}</p> : null}

      <div className="flex flex-wrap gap-2">{badges}</div>

      <div className="space-y-2">
        <h3 className="text-sm font-semibold text-slate-600">Indicateurs condensés</h3>
        {HELP.compare?.overview ? (
          <p className="text-xs text-slate-500">{HELP.compare.overview}</p>
        ) : null}
        <CondensedKpiGrid groups={condensedGroups} />
      </div>

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

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
        <div>
          <h3 className="mb-2 text-sm font-semibold text-slate-600">PV vs Charge</h3>
          <PVLoadChart result={resultA ?? resultB ?? undefined} />
        </div>
        <div>
          <h3 className="mb-2 text-sm font-semibold text-slate-600">SOC Batterie</h3>
          <SocChart resultA={resultA ?? undefined} resultB={resultB ?? undefined} />
        </div>
      </div>

      <div className="space-y-2">
        <h3 className="text-sm font-semibold text-slate-600">Flux moyens (kW)</h3>
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
    </section>
  );
};

export default CompareAB;




