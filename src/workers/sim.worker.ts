/// <reference lib="webworker" />

import { runSimulation } from '../core/engine';
import { resolveStrategy, StrategyId } from '../core/strategy';
import { getScenarioPreset, PresetId } from '../data/scenarios';
import type { Tariffs } from '../data/types';
import { resolvePrices } from '../data/tariffs';
import { DeviceConfig, createDevice } from '../devices/registry';
import type { EcsServiceContract } from '../data/ecs-service';
import { resolveEcsServiceForStrategy } from './strategy-contract';

export interface StrategyConfig {
  id: StrategyId;
  thresholdPercent?: number;
}

export interface WorkerRequest {
  runId?: string;
  scenarioId: PresetId;
  dt_s: number;
  devicesConfig: DeviceConfig[];
  strategyA: StrategyConfig;
  strategyB: StrategyConfig;
  tariffs: Tariffs;
  ecsService: EcsServiceContract;
}

export interface WorkerResponse {
  runId?: string;
  resultA: ReturnType<typeof runSimulation>;
  resultB: ReturnType<typeof runSimulation>;
}

const cloneConfig = (config: DeviceConfig): DeviceConfig => {
  switch (config.type) {
    case 'battery':
      return { ...config, params: { ...config.params } };
    case 'dhw-tank':
      return { ...config, params: { ...config.params } };
    case 'heating':
      return { ...config, params: { ...config.params } };
    case 'pool-pump':
      return {
        ...config,
        params: { ...config.params, preferredWindows: config.params.preferredWindows.map((window) => ({ ...window })) }
      };
    default:
      return { ...config } as DeviceConfig;
  }
};

const cloneDevices = (configs: DeviceConfig[]) => configs.map((config) => createDevice(cloneConfig(config)));

const handleMessage = (event: MessageEvent<WorkerRequest>) => {
  const { scenarioId, dt_s, devicesConfig, strategyA, strategyB, tariffs, runId, ecsService } = event.data;
  const preset = getScenarioPreset(scenarioId) ?? getScenarioPreset(PresetId.EteEnsoleille);
  if (!preset) {
    throw new Error('Aucun scénario valide trouvé.');
  }
  const series = preset.generate(dt_s);
  const { importPrices, exportPrices } = resolvePrices(tariffs, series.pvSeries_kW.length, series.dt_s);

  const run = (strategyConfig: StrategyConfig) => {
    const devices = cloneDevices(devicesConfig);
    const strategy = resolveStrategy(strategyConfig.id, {
      thresholdPercent: strategyConfig.thresholdPercent
    });
    const ecsContract = resolveEcsServiceForStrategy(ecsService, strategyConfig.id);
    return runSimulation({
      dt_s: series.dt_s,
      pvSeries_kW: series.pvSeries_kW,
      baseLoadSeries_kW: series.baseLoadSeries_kW,
      devices,
      strategy,
      ambientTemp_C: 20,
      importPrices_EUR_per_kWh: importPrices,
      exportPrices_EUR_per_kWh: exportPrices,
      ecsService: ecsContract
    });
  };

  const response: WorkerResponse = {
    runId,
    resultA: run(strategyA),
    resultB: run(strategyB)
  };

  (self as unknown as Worker).postMessage(response);
};

self.addEventListener('message', (event) => {
  try {
    handleMessage(event as MessageEvent<WorkerRequest>);
  } catch (error) {
    (self as unknown as Worker).postMessage({ error: (error as Error).message });
  }
});

export {}; // pour traiter le fichier comme module
