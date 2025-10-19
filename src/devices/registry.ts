import { Battery, BatteryParams } from './Battery';
import { Device } from './Device';
import { DHWTank, DHWTankParams, WaterDrawEvent } from './DHWTank';
import { EVCharger, EVChargerParams } from './EVCharger';
import { Heating, HeatingParams } from './Heating';
import { PoolPump, PoolPumpParams } from './PoolPump';

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
  params: HeatingParams;
}

export interface PoolPumpDeviceConfig extends BaseDeviceConfig {
  type: 'pool-pump';
  params: PoolPumpParams;
}

export interface EVChargerDeviceConfig extends BaseDeviceConfig {
  type: 'ev-charger';
  params: EVChargerParams;
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
      return new Heating(config.id, config.label, config.params);
    case 'pool-pump':
      return new PoolPump(config.id, config.label, config.params);
    case 'ev-charger':
      return new EVCharger(config.id, config.label, config.params);
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

/**
 * Profils de puisage d'eau chaude sanitaire types
 */
export const waterDrawProfiles = {
  /** Aucun puisage (pour tests ou scénarios sans consommation) */
  none: [] as WaterDrawEvent[],

  /** Profil léger : célibataire ou couple sans enfant (120 L/jour) */
  light: [
    { hour: 7.5, volume_L: 50, coldWaterTemp_C: 15 },   // Douche matin
    { hour: 12.0, volume_L: 10, coldWaterTemp_C: 15 },  // Vaisselle midi (petite)
    { hour: 19.5, volume_L: 40, coldWaterTemp_C: 15 },  // Douche soir
    { hour: 20.5, volume_L: 20, coldWaterTemp_C: 15 }   // Vaisselle soir
  ] as WaterDrawEvent[],

  /** Profil moyen : famille de 3-4 personnes (160 L/jour) */
  medium: [
    { hour: 7.0, volume_L: 80, coldWaterTemp_C: 15 },   // Douches matin (2 personnes)
    { hour: 12.5, volume_L: 20, coldWaterTemp_C: 15 },  // Vaisselle midi
    { hour: 19.5, volume_L: 60, coldWaterTemp_C: 15 }   // Douches + vaisselle soir
  ] as WaterDrawEvent[],

  /** Profil élevé : famille nombreuse (220 L/jour) */
  heavy: [
    { hour: 7.0, volume_L: 100, coldWaterTemp_C: 15 },  // Douches matin (3-4 personnes)
    { hour: 12.0, volume_L: 30, coldWaterTemp_C: 15 },  // Vaisselle midi
    { hour: 19.0, volume_L: 70, coldWaterTemp_C: 15 },  // Douches soir (3-4 personnes)
    { hour: 21.0, volume_L: 20, coldWaterTemp_C: 15 }   // Vaisselle soir
  ] as WaterDrawEvent[]
};

export const defaultDHWTankParams = (): DHWTankParams => ({
  volume_L: 250,
  resistivePower_kW: 2.0,
  efficiency: 0.95,
  lossCoeff_W_per_K: 10,
  ambientTemp_C: 20,
  targetTemp_C: 55,
  initialTemp_C: 45,
  drawProfile: waterDrawProfiles.medium  // Par défaut : profil moyen
});

export const defaultHeatingParams = (): HeatingParams => ({
  maxPower_kW: 6,
  thermalCapacity_kWh_per_K: 2.5,
  lossCoeff_W_per_K: 180,
  ambientTemp_C: 18,
  comfortDay_C: 20.5,
  comfortNight_C: 18.5,
  dayStartHour: 6,
  nightStartHour: 22,
  hysteresis_K: 0.5,
  initialTemp_C: 19
});

export const defaultPoolParams = (): PoolPumpParams => ({
  power_kW: 1.2,
  minHoursPerDay: 6,
  preferredWindows: [{ startHour: 10, endHour: 16 }],
  catchUpStartHour: 18
});

export const defaultEVParams = (): EVChargerParams => ({
  maxPower_kW: 7.4,
  session: {
    arrivalHour: 18,
    departureHour: 7,
    energyNeed_kWh: 18
  }
});
