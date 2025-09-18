import { Battery, BatteryParams } from './Battery';
import { Device } from './Device';
import { DHWTank, DHWTankParams } from './DHWTank';
import { EVCharger } from './EVCharger';
import { Heating } from './Heating';
import { PoolPump } from './PoolPump';

export type DeviceKind = 'battery' | 'dhw-tank' | 'heating' | 'pool-pump' | 'ev-charger';

export interface BaseDeviceConfig {
  id: string;
  label: string;
  type: DeviceKind;
}

export interface BatteryDeviceConfig extends BaseDeviceConfig {
  type: 'battery';
  params: BatteryParams;
}

export interface DHWDeviceConfig extends BaseDeviceConfig {
  type: 'dhw-tank';
  params: DHWTankParams;
}

export interface HeatingDeviceConfig extends BaseDeviceConfig {
  type: 'heating';
}

export interface PoolPumpDeviceConfig extends BaseDeviceConfig {
  type: 'pool-pump';
}

export interface EVChargerDeviceConfig extends BaseDeviceConfig {
  type: 'ev-charger';
}

export type DeviceConfig =
  | BatteryDeviceConfig
  | DHWDeviceConfig
  | HeatingDeviceConfig
  | PoolPumpDeviceConfig
  | EVChargerDeviceConfig;

export const createDevice = (config: DeviceConfig): Device => {
  switch (config.type) {
    case 'battery':
      return new Battery(config.id, config.label, config.params);
    case 'dhw-tank':
      return new DHWTank(config.id, config.label, config.params);
    case 'heating':
      return new Heating(config.id, config.label);
    case 'pool-pump':
      return new PoolPump(config.id, config.label);
    case 'ev-charger':
      return new EVCharger(config.id, config.label);
    default:
      return (() => {
        throw new Error(`Type d'équipement inconnu: ${(config as DeviceConfig).type}`);
      })();
  }
};

export const defaultBatteryParams = (): BatteryParams => ({
  capacity_kWh: 10,
  pMax_kW: 4,
  etaCharge: 0.95,
  etaDischarge: 0.95,
  socInit_kWh: 5,
  socMin_kWh: 1,
  socMax_kWh: 10
});

export const defaultDHWTankParams = (): DHWTankParams => ({
  volume_L: 250,
  resistivePower_kW: 2.0,
  efficiency: 0.95,
  lossCoeff_W_per_K: 10,
  ambientTemp_C: 20,
  targetTemp_C: 55,
  initialTemp_C: 45
});
