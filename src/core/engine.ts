import { Battery } from '../devices/Battery';
import { Device, EnvContext } from '../devices/Device';
import { DHWTank } from '../devices/DHWTank';
import { computeKPIs, KPIInput, SimulationKPIs } from './kpis';
import { pvUsedOnSite_kW, sumPositive } from './power-graph';
import { Strategy, StrategyContext, StrategyRequest } from './strategy';

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
  totals: {
    pvProduction_kWh: number;
    consumption_kWh: number;
    gridImport_kWh: number;
    gridExport_kWh: number;
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
}

const energyFromPowerSeries = (series: readonly number[], dt_s: number): number => {
  let sum = 0;
  for (const value of series) {
    sum += value;
  }
  return (sum * dt_s) / 3600;
};

export const runSimulation = (input: SimulationInput): SimulationResult => {
  const { dt_s, pvSeries_kW, baseLoadSeries_kW } = input;
  if (pvSeries_kW.length !== baseLoadSeries_kW.length) {
    throw new Error('Les séries PV et consommation doivent avoir la même longueur.');
  }
  const stepsCount = pvSeries_kW.length;
  const ambientTemp = input.ambientTemp_C ?? 20;

  const batteries = input.devices.filter((device): device is Battery => device instanceof Battery);
  const dhwTanks = input.devices.filter((device): device is DHWTank => device instanceof DHWTank);

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
  const ecsTempSeries: number[] = [];

  const envCtx: EnvContext = {
    pv_kW: 0,
    baseLoad_kW: 0,
    ambientTemp_C: ambientTemp
  };

  for (let index = 0; index < stepsCount; index += 1) {
    const pv_kW = pvSeries_kW[index];
    const baseLoad_kW = baseLoadSeries_kW[index];
    envCtx.pv_kW = pv_kW;
    envCtx.baseLoad_kW = baseLoad_kW;

    const plans = input.devices.map((device) => ({ device, plan: device.plan(dt_s, envCtx) }));

    const requests: StrategyRequest[] = plans
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

    const strategyContext: StrategyContext = {
      surplus_kW,
      requests
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

    const gridImport_kW = deficit_kW;
    const gridExport_kW = surplus_kW;

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

    steps.push({
      time_s: index * dt_s,
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

  const totals = {
    pvProduction_kWh: energyFromPowerSeries(pvSeries_kW, dt_s),
    consumption_kWh: energyFromPowerSeries(
      baseLoadSeries_kW.map((value, idx) => value + deviceConsumptionSeries[idx]),
      dt_s
    ),
    gridImport_kWh: energyFromPowerSeries(gridImportSeries, dt_s),
    gridExport_kWh: energyFromPowerSeries(gridExportSeries, dt_s)
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
    ecsTargetTemp_C: dhwTanks[0]?.targetTemp ?? 0
  };

  const kpis = computeKPIs(kpiInput);

  return {
    dt_s,
    steps,
    totals,
    kpis
  };
};
