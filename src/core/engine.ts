import { Battery } from '../devices/Battery';
import { Device, EnvContext } from '../devices/Device';
import { DHWTank, WATER_HEAT_CAPACITY_WH_PER_L_PER_K } from '../devices/DHWTank';
import { computeKPIs, KPIInput, SimulationKPIs, SimulationKPIsCore } from './kpis';
import { pvUsedOnSite_kW, sumPositive } from './power-graph';
import { Strategy, StrategyContext, StrategyRequest } from './strategy';
import type { StepFlows } from '../data/types';
import {
  defaultEcsServiceContract,
  mergeEcsServiceContract,
  resolveTargetTemperature,
  type EcsServiceContract
} from '../data/ecs-service';
import { createEcsHelperState, processEcsRequests } from './ecs/helpers';



export interface SimulationStepDevice {
  id: string;
  label: string;
  power_kW: number;
  state: Record<string, number | boolean>;
}

export interface SimulationStep {
  time_s: number;
  pv_kW: number;
  baseLoad_kW: number;
  pvUsedOnSite_kW: number;
  gridImport_kW: number;
  gridExport_kW: number;
  deviceStates: SimulationStepDevice[];
}

export interface SimulationResult {
  dt_s: number;
  steps: SimulationStep[];
  flows: StepFlows[];
  totals: {
    pvProduction_kWh: number;
    consumption_kWh: number;
    gridImport_kWh: number;
    gridExport_kWh: number;
    batteryDelta_kWh: number;
    ecsRescue_kWh: number;
    ecsEnergy_kWh: number;
    ecsDeficit_K: number;
    ecsPenalty_EUR: number;
  };
  kpis: SimulationKPIs;
}

export interface SimulationInput {
  dt_s: number;
  pvSeries_kW: readonly number[];
  baseLoadSeries_kW: readonly number[];
  devices: readonly Device[];
  strategy: Strategy;
  ambientTemp_C?: number;
  importPrices_EUR_per_kWh?: readonly number[];
  exportPrices_EUR_per_kWh?: readonly number[];
  ecsService?: Partial<EcsServiceContract>;
}

const energyFromPowerSeries = (series: readonly number[], dt_s: number): number => {
  let sum = 0;
  for (const value of series) {
    sum += value;
  }
  return (sum * dt_s) / 3600;
};

const fillPriceSeries = (values: readonly number[] | undefined, steps: number): number[] => {
  const series = new Array<number>(steps);
  let lastValue = 0;
  if (values && values.length > 0) {
    lastValue = Number.isFinite(values[0]) ? Number(values[0]) : 0;
  }
  for (let index = 0; index < steps; index += 1) {
    if (values && values[index] !== undefined) {
      const current = Number(values[index]);
      if (Number.isFinite(current)) {
        lastValue = current;
      }
    }
    series[index] = lastValue;
  }
  return series;
};

export const runSimulation = (input: SimulationInput): SimulationResult => {
  const { dt_s, pvSeries_kW, baseLoadSeries_kW } = input;
  if (pvSeries_kW.length !== baseLoadSeries_kW.length) {
    throw new Error('Les séries PV et consommation doivent avoir la même longueur.');
  }
  const stepsCount = pvSeries_kW.length;
  const ambientTemp = input.ambientTemp_C ?? 20;
  const importPriceSeries = fillPriceSeries(input.importPrices_EUR_per_kWh, stepsCount);
  const exportPriceSeries = fillPriceSeries(input.exportPrices_EUR_per_kWh, stepsCount);

  const batteries = input.devices.filter((device): device is Battery => device instanceof Battery);
  const dhwTanks = input.devices.filter((device): device is DHWTank => device instanceof DHWTank);

  const baseServiceContract = defaultEcsServiceContract();
  let ecsService: EcsServiceContract = mergeEcsServiceContract(
    baseServiceContract,
    input.ecsService
  );
  ecsService = resolveTargetTemperature(ecsService, dhwTanks[0]);

  const batteryCapacity = batteries.reduce((acc, battery) => acc + battery.usableCapacity_kWh, 0);
  const batterySoc = new Map<string, number>(
    batteries.map((battery) => [battery.id, battery.soc_kWhValue])
  );

  const steps: SimulationStep[] = [];
  const deviceConsumptionSeries: number[] = [];
  const pvUsedSeries: number[] = [];
  const gridImportSeries: number[] = [];
  const gridExportSeries: number[] = [];
  const batteryDeltaSeries: number[] = [];
  const batteryDischargeSeries: number[] = [];
  const ecsTempSeries: number[] = [];
  const flowsSeries: StepFlows[] = [];

  const devicesById = new Map(input.devices.map((device) => [device.id, device]));
  const envCtx: EnvContext = {
    pv_kW: 0,
    baseLoad_kW: 0,
    ambientTemp_C: ambientTemp
  };

  const rescueEnergyPerTank_kWh = new Map<string, number>();
  const ecsHelperState = createEcsHelperState();

  for (let index = 0; index < stepsCount; index += 1) {
    const pv_kW = pvSeries_kW[index];
    const baseLoad_kW = baseLoadSeries_kW[index];
    const time_s = index * dt_s;
    envCtx.pv_kW = pv_kW;
    envCtx.baseLoad_kW = baseLoad_kW;
    envCtx.priceImport_EUR_per_kWh = importPriceSeries[index];
    envCtx.priceExport_EUR_per_kWh = exportPriceSeries[index];

    const plans = input.devices.map((device) => ({ device, plan: device.plan(dt_s, envCtx) }));

    let requests: StrategyRequest[] = plans
      .filter((entry) => entry.plan.request)
      .map((entry) => ({
        device: entry.device,
        request: entry.plan.request!,
        state: entry.device.state()
      }));

    const offers = plans.filter((entry) => entry.plan.offer);

    let surplus_kW = Math.max(pv_kW - baseLoad_kW, 0);
    let deficit_kW = Math.max(baseLoad_kW - pv_kW, 0);

    const devicePower = new Map<string, number>();

    const processedRequests = processEcsRequests(
      {
        requests,
        contract: ecsService,
        dt_s,
        time_s,
        surplus_kW
      },
      ecsHelperState
    );

    for (const forced of processedRequests.forcedAllocations) {
      forced.device.apply(forced.power_kW, dt_s, envCtx);
      devicePower.set(
        forced.device.id,
        (devicePower.get(forced.device.id) ?? 0) + forced.power_kW
      );
    }

    surplus_kW = processedRequests.remainingSurplus_kW;
    requests = processedRequests.requests;

    const strategyContext: StrategyContext = {
      surplus_kW,
      requests,
      time_s,
      dt_s
    };
    const allocations = input.strategy(strategyContext);

    const requestMap = new Map(requests.map((req) => [req.device.id, req]));

    for (const allocation of allocations) {
      const request = requestMap.get(allocation.deviceId);
      if (!request || surplus_kW <= 0) {
        continue;
      }
      const desiredPower = Math.max(allocation.power_kW, 0);
      if (desiredPower <= 0) {
        continue;
      }
      const power = Math.min(request.request.maxAccept_kW, desiredPower, surplus_kW);
      if (power <= 0) {
        continue;
      }
      request.device.apply(power, dt_s, envCtx);
      devicePower.set(request.device.id, (devicePower.get(request.device.id) ?? 0) + power);
      surplus_kW -= power;
    }

    const sortedOffers = offers
      .map((entry) => ({
        device: entry.device,
        offer: entry.plan.offer!,
        state: entry.device.state()
      }))
      .sort((a, b) => (a.offer.costPenalty ?? 0) - (b.offer.costPenalty ?? 0));

    for (const offer of sortedOffers) {
      if (deficit_kW <= 0) {
        break;
      }
      const power = Math.min(offer.offer.maxSupply_kW, deficit_kW);
      if (power <= 0) {
        continue;
      }
      offer.device.apply(-power, dt_s, envCtx);
      devicePower.set(offer.device.id, (devicePower.get(offer.device.id) ?? 0) - power);
      deficit_kW -= power;
    }

    const deviceStates: SimulationStepDevice[] = input.devices.map((device) => ({
      id: device.id,
      label: device.label,
      power_kW: devicePower.get(device.id) ?? 0,
      state: device.state()
    }));

    const deviceConsumption_kW = sumPositive(devicePower.values());
    const instantLoad = {
      pv_kW,
      baseLoad_kW,
      deviceConsumption_kW
    };
    const pvUsed = pvUsedOnSite_kW(instantLoad);

    const gridExport_kW = surplus_kW;

    const batteryCharge_kW = batteries.reduce((acc, battery) => {
      const power = devicePower.get(battery.id) ?? 0;
      return acc + Math.max(power, 0);
    }, 0);
    const batteryDischarge_kW = batteries.reduce((acc, battery) => {
      const power = devicePower.get(battery.id) ?? 0;
      return acc + Math.max(-power, 0);
    }, 0);
    batteryDischargeSeries.push(batteryDischarge_kW);
    const ecsConsumption_kW = dhwTanks.reduce((acc, tank) => {
      const power = devicePower.get(tank.id) ?? 0;
      return acc + Math.max(power, 0);
    }, 0);

    const pvToLoad_kW = Math.min(pv_kW, baseLoad_kW);
    let pvRemainder_kW = Math.max(pv_kW - pvToLoad_kW, 0);
    const pvToEcs_kW = Math.min(ecsConsumption_kW, pvRemainder_kW);
    pvRemainder_kW -= pvToEcs_kW;
    const pvToBatt_kW = Math.min(batteryCharge_kW, pvRemainder_kW);
    pvRemainder_kW -= pvToBatt_kW;
    const pvToGrid_kW = gridExport_kW;

    const loadDeficitAfterPV_kW = Math.max(baseLoad_kW - pvToLoad_kW, 0);
    const battToLoad_kW = Math.min(batteryDischarge_kW, loadDeficitAfterPV_kW);
    const gridToLoad_kW = Math.max(loadDeficitAfterPV_kW - battToLoad_kW, 0);
    const ecsDeficitAfterPV_kW = Math.max(ecsConsumption_kW - pvToEcs_kW, 0);
    const battRemaining_kW = Math.max(batteryDischarge_kW - battToLoad_kW, 0);
    const battToEcs_kW = Math.min(battRemaining_kW, ecsDeficitAfterPV_kW);
    const gridImport_kW = deficit_kW;
    const gridToEcsPotential_kW = Math.max(ecsDeficitAfterPV_kW - battToEcs_kW, 0);
    const gridToEcs_kW = Math.min(gridToEcsPotential_kW, Math.max(gridImport_kW - gridToLoad_kW, 0));

    let batteryDelta_kWh = 0;
    for (const battery of batteries) {
      const before = batterySoc.get(battery.id) ?? battery.soc_kWhValue;
      const after = battery.soc_kWhValue;
      batteryDelta_kWh += after - before;
      batterySoc.set(battery.id, after);
    }

    if (dhwTanks.length > 0) {
      const avgTemp = dhwTanks.reduce((acc, tank) => acc + tank.temperature, 0) / dhwTanks.length;
      ecsTempSeries.push(avgTemp);
    }

    deviceConsumptionSeries.push(deviceConsumption_kW);
    pvUsedSeries.push(pvUsed);
    gridImportSeries.push(gridImport_kW);
    gridExportSeries.push(gridExport_kW);
    batteryDeltaSeries.push(batteryDelta_kWh);
    flowsSeries.push({
      pv_to_load_kW: pvToLoad_kW,
      pv_to_ecs_kW: pvToEcs_kW,
      pv_to_batt_kW: pvToBatt_kW,
      pv_to_grid_kW: pvToGrid_kW,
      batt_to_load_kW: battToLoad_kW,
      batt_to_ecs_kW: battToEcs_kW,
      grid_to_load_kW: gridToLoad_kW,
      grid_to_ecs_kW: gridToEcs_kW
    });

    steps.push({
      time_s,
      pv_kW,
      baseLoad_kW,
      pvUsedOnSite_kW: pvUsed,
      gridImport_kW,
      gridExport_kW,
      deviceStates
    });
  }

  if (dhwTanks.length === 0) {
    ecsTempSeries.length = 0;
  }

  let ecsRescue_kWh = 0;
  if (dhwTanks.length > 0 && ecsService.mode === 'force') {
    for (const tank of dhwTanks) {
      const deficit_K = tank.targetTemp - tank.temperature;
      if (deficit_K > 1e-6) {
        const rescue_Wh = deficit_K * tank.volume_L * WATER_HEAT_CAPACITY_WH_PER_L_PER_K;
        const rescue_kWh = rescue_Wh / 1000;
        if (rescue_kWh > 0) {
          rescueEnergyPerTank_kWh.set(tank.id, rescue_kWh);
          ecsRescue_kWh += rescue_kWh;
          tank.enforceTargetTemperature();
        }
      }
    }

    if (ecsRescue_kWh > 0 && steps.length > 0) {
      const rescuePower_kW = (ecsRescue_kWh * 3600) / dt_s;
      const lastIndex = steps.length - 1;

      deviceConsumptionSeries[lastIndex] += rescuePower_kW;
      gridImportSeries[lastIndex] += rescuePower_kW;
      steps[lastIndex] = {
        ...steps[lastIndex],
        gridImport_kW: steps[lastIndex].gridImport_kW + rescuePower_kW,
        deviceStates: steps[lastIndex].deviceStates.map((deviceState) => {
          const rescueForDevice_kWh = rescueEnergyPerTank_kWh.get(deviceState.id) ?? 0;
          const rescueForDevice_kW = (rescueForDevice_kWh * 3600) / dt_s;
          const device = devicesById.get(deviceState.id);
          return {
            ...deviceState,
            power_kW: deviceState.power_kW + rescueForDevice_kW,
            state: device ? device.state() : deviceState.state
          };
        })
      };

      flowsSeries[lastIndex] = {
        ...flowsSeries[lastIndex],
        grid_to_ecs_kW: flowsSeries[lastIndex].grid_to_ecs_kW + rescuePower_kW
      };

      const updatedAvgTemp =
        dhwTanks.reduce((acc, tank) => acc + tank.temperature, 0) / dhwTanks.length;
      if (ecsTempSeries.length > 0) {
        ecsTempSeries[ecsTempSeries.length - 1] = updatedAvgTemp;
      }
    }
  }


  let ecsDeficit_K = 0;
  let ecsPenalty_EUR = 0;
  if (ecsTempSeries.length > 0) {
    const deadlineStep = Math.floor((ecsService.deadlineHour * 3600) / dt_s);
    const index = Math.min(Math.max(deadlineStep, 0), ecsTempSeries.length - 1);
    const observedTemp = ecsTempSeries[index];
    ecsDeficit_K = Math.max(0, ecsService.targetCelsius - observedTemp);
    if (ecsService.mode === 'force') {
      ecsDeficit_K = 0;
    } else if (ecsService.mode === 'penalize') {
      const rate = ecsService.penaltyPerKelvin ?? 0;
      ecsPenalty_EUR = ecsDeficit_K * rate;
    }
  }

  const baseAndDeviceEnergy_kWh = energyFromPowerSeries(
    baseLoadSeries_kW.map((value, idx) => value + deviceConsumptionSeries[idx]),
    dt_s
  );
  let batteryDelta_kWh = 0;
  let batteryChargeDelta_kWh = 0;
  let batteryDischargeDelta_kWh = 0;
  for (const delta of batteryDeltaSeries) {
    batteryDelta_kWh += delta;
    if (delta > 0) {
      batteryChargeDelta_kWh += delta;
    } else if (delta < 0) {
      batteryDischargeDelta_kWh += -delta;
    }
  }
  const batteryDischargeEnergy_kWh = energyFromPowerSeries(batteryDischargeSeries, dt_s);
  const batteryDischargeLosses_kWh = Math.max(
    batteryDischargeDelta_kWh - batteryDischargeEnergy_kWh,
    0
  );
  const consumption_kWh = Math.max(
    baseAndDeviceEnergy_kWh - batteryChargeDelta_kWh + batteryDischargeLosses_kWh,
    0
  );

  const totals = {
    pvProduction_kWh: energyFromPowerSeries(pvSeries_kW, dt_s),
    consumption_kWh,
    gridImport_kWh: energyFromPowerSeries(gridImportSeries, dt_s),
    gridExport_kWh: energyFromPowerSeries(gridExportSeries, dt_s),
    batteryDelta_kWh,
    ecsRescue_kWh,
    ecsEnergy_kWh: flowsSeries.reduce((acc, flow) => {
      return (
        acc +
        ((flow.pv_to_ecs_kW + flow.batt_to_ecs_kW + flow.grid_to_ecs_kW) * dt_s) / 3600
      );
    }, 0),
    ecsDeficit_K,
    ecsPenalty_EUR
  };

  const kpiInput: KPIInput = {
    dt_s,
    pvSeries_kW,
    baseLoadSeries_kW,
    deviceConsumptionSeries_kW: deviceConsumptionSeries,
    pvUsedOnSiteSeries_kW: pvUsedSeries,
    batteryDelta_kWh: batteryDeltaSeries,
    batteryCapacity_kWh: batteryCapacity,
    ecsTempSeries_C: ecsTempSeries,
    ecsTargetTemp_C: ecsService.targetCelsius ?? 0,
    flows: flowsSeries,
    importPrices_EUR_per_kWh: importPriceSeries,
    exportPrices_EUR_per_kWh: exportPriceSeries
  };

  const baseKpis: SimulationKPIsCore = computeKPIs(kpiInput);
  const net_cost_with_penalties = baseKpis.euros.net_cost + ecsPenalty_EUR;

  const hasDeadlineEvaluation = ecsTempSeries.length > 0;
  const ecsHitRate = hasDeadlineEvaluation ? (ecsDeficit_K <= 1e-6 ? 1 : 0) : 0;
  const ecsAvgDeficit = hasDeadlineEvaluation ? ecsDeficit_K : 0;
  const ecsPenaltiesTotal = ecsPenalty_EUR;

  const kpis: SimulationKPIs = {
    ...baseKpis,
    euros: { ...baseKpis.euros, net_cost_with_penalties },
    ecs_rescue_used: ecsRescue_kWh > 0,
    ecs_rescue_kWh: ecsRescue_kWh,
    ecs_deficit_K: ecsDeficit_K,
    ecs_penalty_EUR: ecsPenalty_EUR,
    ecs_hit_rate: ecsHitRate,
    ecs_avg_deficit_K: ecsAvgDeficit,
    ecs_penalties_total_EUR: ecsPenaltiesTotal,
    net_cost_with_penalties
  };

  return {
    dt_s,
    steps,
    flows: flowsSeries,
    totals,
    kpis
  };
};
