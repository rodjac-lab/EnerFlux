import type {
  HeatingSystemConfig,
  ScenarioConfig,
  ScenarioDefaults,
  ScenarioPreset,
  ScenarioSeries,
  Tariffs
} from './types';
import { cloneTariffs, defaultTariffs, deriveTouConfig } from './tariffs';
import { defaultHeatingParams } from '../devices/registry';

export enum PresetId {
  EteEnsoleille = 'ete',
  HiverCouvert = 'hiver',
  MatinFroid = 'matin_froid',
  BallonConfort = 'ballon_confort',
  BatterieVide = 'batt_vide',
  Seuils = 'seuils'
}

const SECONDS_PER_DAY = 24 * 3600;

const clamp01 = (value: number): number => Math.max(0, Math.min(1, value));

const generatePVSeries = (
  dt_s: number,
  sunrise_s: number,
  sunset_s: number,
  peak_kW: number,
  cloudAttenuation = 1
): number[] => {
  const steps = Math.round(SECONDS_PER_DAY / dt_s);
  const pv: number[] = new Array(steps);
  for (let i = 0; i < steps; i += 1) {
    const t = i * dt_s;
    if (t < sunrise_s || t > sunset_s) {
      pv[i] = 0;
      continue;
    }
    const norm = clamp01((t - sunrise_s) / (sunset_s - sunrise_s));
    const shaped = Math.sin(Math.PI * norm) ** 1.3;
    pv[i] = shaped * peak_kW * cloudAttenuation;
  }
  return pv;
};

const generateBaseLoadSeries = (
  dt_s: number,
  base_kW: number,
  eveningPeak_kW: number,
  noise_kW = 0
): number[] => {
  const steps = Math.round(SECONDS_PER_DAY / dt_s);
  const load: number[] = new Array(steps);
  for (let i = 0; i < steps; i += 1) {
    const t = i * dt_s;
    const hour = t / 3600;
    const morningBump = Math.exp(-((hour - 7) ** 2) / 3);
    const eveningBump = Math.exp(-((hour - 19) ** 2) / 2);
    const noise = noise_kW ? Math.sin((t / SECONDS_PER_DAY) * 12 * Math.PI) * noise_kW : 0;
    load[i] = base_kW + morningBump * 0.3 + eveningBump * eveningPeak_kW + noise;
  }
  return load;
};

const generateDualLevelLoadSeries = (
  dt_s: number,
  dayLevel_kW: number,
  eveningLevel_kW: number
): number[] => {
  const steps = Math.round(SECONDS_PER_DAY / dt_s);
  const load: number[] = new Array(steps);
  for (let i = 0; i < steps; i += 1) {
    const hour = (i * dt_s) / 3600;
    let base = dayLevel_kW;
    if (hour >= 18 || hour < 6) {
      base = eveningLevel_kW;
    } else if (hour >= 6 && hour < 8) {
      const blend = clamp01((hour - 6) / 2);
      const easing = 1 - blend ** 1.4;
      base = dayLevel_kW + (eveningLevel_kW - dayLevel_kW) * easing;
    } else if (hour >= 17 && hour < 18) {
      const blend = (hour - 17) / 1;
      base = dayLevel_kW + (eveningLevel_kW - dayLevel_kW) * blend;
    }
    const eveningGap_kW = Math.max(0, eveningLevel_kW - dayLevel_kW);
    const morningBoost = eveningGap_kW * 0.35 * Math.exp(-((hour - 7.3) ** 2) / 0.45);
    load[i] = base + morningBoost;
  }
  return load;
};

const makeSeries = (dt_s: number, pv: number[], load: number[]): ScenarioSeries => ({
  dt_s,
  pvSeries_kW: pv,
  baseLoadSeries_kW: load
});

const cloneHeatingConfig = (
  config: HeatingSystemConfig | undefined
): HeatingSystemConfig | undefined =>
  config
    ? {
        enabled: config.enabled,
        params: { ...config.params }
      }
    : undefined;

const cloneDefaults = (defaults: ScenarioDefaults): ScenarioDefaults => ({
  batteryConfig: { ...defaults.batteryConfig },
  ecsConfig: { ...defaults.ecsConfig },
  heatingConfig: cloneHeatingConfig(defaults.heatingConfig),
  tariffs: cloneTariffs(defaults.tariffs)
});

const createTouTariffs = (onPeakHours: number[], onPeakPrice: number, offPeakPrice: number): Tariffs => {
  const base = cloneTariffs(defaultTariffs);
  base.mode = 'tou';
  const tou = deriveTouConfig(onPeakHours);
  base.tou = {
    ...tou,
    onpeak_price: onPeakPrice,
    offpeak_price: offPeakPrice
  };
  return base;
};

const heatingDefaults = (
  overrides: Partial<ReturnType<typeof defaultHeatingParams>>,
  enabled: boolean
): HeatingSystemConfig => ({
  enabled,
  params: { ...defaultHeatingParams(), ...overrides }
});

const summerDefaults: ScenarioDefaults = {
  batteryConfig: {
    capacity_kWh: 10,
    pMax_kW: 4,
    etaCharge: 0.95,
    etaDischarge: 0.95,
    socInit_kWh: 5,
    socMin_kWh: 1,
    socMax_kWh: 10
  },
  ecsConfig: {
    volume_L: 250,
    resistivePower_kW: 2.0,
    efficiency: 0.95,
    lossCoeff_W_per_K: 10,
    ambientTemp_C: 20,
    targetTemp_C: 55,
    initialTemp_C: 45
  },
  heatingConfig: heatingDefaults(
    {
      ambientTemp_C: 24,
      comfortDay_C: 24,
      comfortNight_C: 22,
      initialTemp_C: 24,
      maxPower_kW: 0
    },
    false
  ),
  tariffs: cloneTariffs(defaultTariffs)
};

const winterDefaults: ScenarioDefaults = {
  batteryConfig: {
    capacity_kWh: 8,
    pMax_kW: 3,
    etaCharge: 0.94,
    etaDischarge: 0.94,
    socInit_kWh: 4,
    socMin_kWh: 0.5,
    socMax_kWh: 8
  },
  ecsConfig: {
    volume_L: 300,
    resistivePower_kW: 3.0,
    efficiency: 0.95,
    lossCoeff_W_per_K: 12,
    ambientTemp_C: 20,
    targetTemp_C: 55,
    initialTemp_C: 35
  },
  heatingConfig: heatingDefaults(
    {
      ambientTemp_C: 5,
      comfortDay_C: 20,
      comfortNight_C: 17,
      initialTemp_C: 18,
      maxPower_kW: 6
    },
    true
  ),
  tariffs: cloneTariffs(defaultTariffs)
};

const coldMorningDefaults: ScenarioDefaults = {
  batteryConfig: {
    capacity_kWh: 10,
    pMax_kW: 1,
    etaCharge: 0.95,
    etaDischarge: 0.95,
    socInit_kWh: 6,
    socMin_kWh: 0,
    socMax_kWh: 10
  },
  ecsConfig: {
    volume_L: 300,
    resistivePower_kW: 2.6,
    efficiency: 0.95,
    lossCoeff_W_per_K: 4,
    ambientTemp_C: 20,
    targetTemp_C: 55,
    initialTemp_C: 15
  },
  heatingConfig: heatingDefaults(
    {
      ambientTemp_C: 4,
      comfortDay_C: 20,
      comfortNight_C: 17.5,
      initialTemp_C: 17,
      maxPower_kW: 6.5
    },
    true
  ),
  tariffs: createTouTariffs([6, 7, 8, 9, 19, 20, 21], 0.34, 0.17)
};

const emptyBatteryDefaults: ScenarioDefaults = {
  batteryConfig: {
    capacity_kWh: 10,
    pMax_kW: 2,
    etaCharge: 0.95,
    etaDischarge: 0.95,
    socInit_kWh: 0.5,  // Résolu : batterie plus vide (0.5 vs 1)
    socMin_kWh: 0,     // Résolu : SOC minimum plus bas (0 vs 0.5)
    socMax_kWh: 10
  },
  ecsConfig: {
    volume_L: 300,
    resistivePower_kW: 3,
    efficiency: 0.95,
    lossCoeff_W_per_K: 4,
    ambientTemp_C: 20,
    targetTemp_C: 55,
    initialTemp_C: 35  // Résolu : température ECS ajustée pour divergence
  },
  heatingConfig: heatingDefaults(
    {
      ambientTemp_C: 6,
      comfortDay_C: 20.5,
      comfortNight_C: 18,
      initialTemp_C: 17.5,
      maxPower_kW: 6.5
    },
    true
  ),
  tariffs: cloneTariffs(defaultTariffs)
};

const comfortEveningDefaults: ScenarioDefaults = {
  batteryConfig: {
    capacity_kWh: 12,
    pMax_kW: 3.2,
    etaCharge: 0.95,
    etaDischarge: 0.95,
    socInit_kWh: 7,
    socMin_kWh: 1,
    socMax_kWh: 12
  },
  ecsConfig: {
    volume_L: 270,
    resistivePower_kW: 2.8,
    efficiency: 0.95,
    lossCoeff_W_per_K: 6,
    ambientTemp_C: 20,
    targetTemp_C: 58,
    initialTemp_C: 48
  },
  heatingConfig: heatingDefaults(
    {
      ambientTemp_C: 12,
      comfortDay_C: 21,
      comfortNight_C: 19,
      initialTemp_C: 20,
      maxPower_kW: 4
    },
    false
  ),
  tariffs: createTouTariffs([7, 8, 9, 18, 19, 20, 21, 22], 0.32, 0.16)
};

const summerSunny: ScenarioPreset = {
  id: PresetId.EteEnsoleille,
  label: 'Été ensoleillé',
  description: 'Production PV soutenue avec un foyer présent le soir.',
  tags: ['été', 'ensoleillé'],
  defaultDt_s: 900,
  defaults: summerDefaults,
  generate: (dt_s: number) =>
    makeSeries(
      dt_s,
      generatePVSeries(dt_s, 6 * 3600, 20 * 3600, 6),
      generateBaseLoadSeries(dt_s, 0.6, 1.5, 0.1)
    )
};

const winterOvercast: ScenarioPreset = {
  id: PresetId.HiverCouvert,
  label: 'Hiver couvert',
  description: 'Faible production PV et chauffage de base renforcé.',
  tags: ['hiver', 'couvert'],
  defaultDt_s: 900,
  defaults: winterDefaults,
  generate: (dt_s: number) =>
    makeSeries(
      dt_s,
      generatePVSeries(dt_s, 8 * 3600, 16 * 3600, 2.5, 0.6),
      generateBaseLoadSeries(dt_s, 0.9, 1.8, 0.05)
    )
};

const coldMorning: ScenarioPreset = {
  id: PresetId.MatinFroid,
  label: 'Matin froid',
  description: 'Matin glacial : PV tardif, tarif matinée cher, ballon à remonter tôt.',
  tags: ['hiver', 'ecs', 'contrat'],
  defaultDt_s: 900,
  defaults: coldMorningDefaults,
  generate: (dt_s: number) =>
    makeSeries(
      dt_s,
      generatePVSeries(dt_s, 8 * 3600, 18 * 3600, 3.2),
      generateDualLevelLoadSeries(dt_s, 0.35, 1.1)
    )
};

const comfortBalloon: ScenarioPreset = {
  id: PresetId.BallonConfort,
  label: 'Ballon confort',
  description: 'Confort soir : préchauffe ECS avant les douches, tarifs pointe renforcés.',
  tags: ['ecs', 'soirée', 'contrat'],
  defaultDt_s: 900,
  defaults: comfortEveningDefaults,
  generate: (dt_s: number) =>
    makeSeries(
      dt_s,
      generatePVSeries(dt_s, 7 * 3600, 19 * 3600, 4.2, 0.9),
      generateDualLevelLoadSeries(dt_s, 0.5, 1.25)
    )
};

const emptyBattery: ScenarioPreset = {
  id: PresetId.BatterieVide,
  label: 'Batterie vide',
  description: 'Même profil solaire mais batterie quasi vide.',
  tags: ['hiver', 'batterie'],
  defaultDt_s: 900,
  defaults: emptyBatteryDefaults,
  generate: (dt_s: number) =>
    makeSeries(
      dt_s,
      generatePVSeries(dt_s, 8 * 3600, 18 * 3600, 3.8),
      generateDualLevelLoadSeries(dt_s, 0, 0.8)
    )
};

const thresholdScenario: ScenarioPreset = {
  id: PresetId.Seuils,
  label: 'Seuils (40 vs 80)',
  description: 'Référence pour comparer deux seuils de SOC.',
  tags: ['mix', 'seuil'],
  defaultDt_s: coldMorning.defaultDt_s,
  defaults: coldMorningDefaults,
  generate: coldMorning.generate
};

export const scenarioPresets: readonly ScenarioPreset[] = [
  summerSunny,
  winterOvercast,
  coldMorning,
  comfortBalloon,
  emptyBattery,
  thresholdScenario
];

export const getScenarioPreset = (id: string): ScenarioPreset | undefined =>
  scenarioPresets.find((preset) => preset.id === id);

export const getScenario = (preset: PresetId): ScenarioConfig => {
  const definition = getScenarioPreset(preset);
  if (!definition) {
    throw new Error(`Scénario inconnu: ${preset}`);
  }
  const series = definition.generate(definition.defaultDt_s);
  return {
    dt: series.dt_s,
    pv: series.pvSeries_kW,
    load_base: series.baseLoadSeries_kW,
    defaults: cloneDefaults(definition.defaults),
    tariffs: cloneTariffs(definition.defaults.tariffs)
  };
};

export const getScenarioById = getScenarioPreset;
