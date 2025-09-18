import React, { useEffect, useMemo, useRef, useState } from 'react';
import type { SimulationResult } from '../../core/engine';
import type { WorkerRequest, WorkerResponse } from '../../workers/sim.worker';
import { getScenarioById } from '../../data/scenarios';
import { BatteryParams } from '../../devices/Battery';
import { DHWTankParams } from '../../devices/DHWTank';
import { DeviceConfig } from '../../devices/registry';
import PVLoadChart from '../charts/PVLoadChart';
import SocChart from '../charts/SocChart';
import { StrategySelection } from '../panels/StrategyPanel';
import { downloadCSV, downloadJSON, formatCycles, formatKWh, formatPercent } from '../utils/ui';

interface CompareABProps {
  scenarioId: string;
  dt_s: number;
  battery: BatteryParams;
  dhw: DHWTankParams;
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

const buildDeviceConfigs = (battery: BatteryParams, dhw: DHWTankParams): DeviceConfig[] => {
  const configs: DeviceConfig[] = [];
  if (battery.capacity_kWh > 0) {
    configs.push({ id: 'battery', label: 'Batterie', type: 'battery', params: { ...battery } });
  }
  configs.push({ id: 'dhw', label: 'Ballon ECS', type: 'dhw-tank', params: { ...dhw } });
  return configs;
};

const extractSocPercent = (step: SimulationResult['steps'][number]): number | undefined => {
  const device = step.deviceStates.find((state) => typeof state.state.soc_percent === 'number');
  if (!device) {
    return undefined;
  }
  return Number(device.state.soc_percent);
};

const CompareAB: React.FC<CompareABProps> = ({ scenarioId, dt_s, battery, dhw, strategyA, strategyB }) => {
  const sanitizedBattery = useMemo(() => sanitizeBattery(battery), [battery]);
  const deviceConfigs = useMemo(
    () => buildDeviceConfigs(sanitizedBattery, { ...dhw }),
    [sanitizedBattery, dhw]
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
      strategyB: { id: strategyB.id, thresholdPercent: strategyB.thresholdPercent }
    };
    pendingRunId.current = payload.runId ?? null;
    setRunning(true);
    setError(null);
    workerRef.current.postMessage(payload);
  };

  const scenario = getScenarioById(scenarioId);

  const kpiRows = [
    {
      label: 'Autoconsommation',
      valueA: resultA?.kpis.selfConsumption,
      valueB: resultB?.kpis.selfConsumption,
      formatter: formatPercent
    },
    {
      label: 'Autoproduction',
      valueA: resultA?.kpis.selfProduction,
      valueB: resultB?.kpis.selfProduction,
      formatter: formatPercent
    },
    {
      label: 'Cycles batterie (proxy)',
      valueA: resultA?.kpis.batteryCycles,
      valueB: resultB?.kpis.batteryCycles,
      formatter: formatCycles
    },
    {
      label: 'Temps ECS ≥ cible',
      valueA: resultA?.kpis.ecsTargetUptime,
      valueB: resultB?.kpis.ecsTargetUptime,
      formatter: formatPercent
    }
  ] as const;

  const totalsRows = [
    {
      label: 'PV produit',
      valueA: resultA ? formatKWh(resultA.totals.pvProduction_kWh) : '—',
      valueB: resultB ? formatKWh(resultB.totals.pvProduction_kWh) : '—'
    },
    {
      label: 'Consommation',
      valueA: resultA ? formatKWh(resultA.totals.consumption_kWh) : '—',
      valueB: resultB ? formatKWh(resultB.totals.consumption_kWh) : '—'
    },
    {
      label: 'Import réseau',
      valueA: resultA ? formatKWh(resultA.totals.gridImport_kWh) : '—',
      valueB: resultB ? formatKWh(resultB.totals.gridImport_kWh) : '—'
    },
    {
      label: 'Export réseau',
      valueA: resultA ? formatKWh(resultA.totals.gridExport_kWh) : '—',
      valueB: resultB ? formatKWh(resultB.totals.gridExport_kWh) : '—'
    }
  ];

  const exportJson = () => {
    downloadJSON('enerflux_results.json', {
      scenario: scenario?.id,
      dt_s,
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
      rows.push([
        time,
        pv,
        load,
        stepA?.pvUsedOnSite_kW ?? '',
        stepA?.gridImport_kW ?? '',
        stepB?.gridImport_kW ?? '',
        socA,
        socB
      ]);
    }
    downloadCSV('enerflux_results.csv', ['time_s', 'pv_kW', 'load_kW', 'pv_used_A_kW', 'grid_import_A_kW', 'grid_import_B_kW', 'soc_A_%', 'soc_B_%'], rows);
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

      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-slate-200 text-sm">
          <thead>
            <tr className="text-left text-slate-600">
              <th className="py-2 font-medium">KPI</th>
              <th className="py-2 font-medium">Stratégie A</th>
              <th className="py-2 font-medium">Stratégie B</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {kpiRows.map((row) => (
              <tr key={row.label}>
                <td className="py-2 font-medium text-slate-700">{row.label}</td>
                <td className="py-2 text-slate-800">
                  {row.valueA !== undefined ? row.formatter(row.valueA) : '—'}
                </td>
                <td className="py-2 text-slate-800">
                  {row.valueB !== undefined ? row.formatter(row.valueB) : '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
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
    </section>
  );
};

export default CompareAB;
