import { ScenarioPreset, ScenarioSeries } from './types';

const SECONDS_PER_DAY = 24 * 3600;

const SUMMER_PARAMS = {
  sunrise_s: 6 * 3600,
  sunset_s: 20 * 3600,
  peakPV_kW: 6,
  baseLoad_kW: 0.6,
  eveningPeak_kW: 1.5
} as const;

const WINTER_PARAMS = {
  sunrise_s: 8 * 3600,
  sunset_s: 16 * 3600,
  peakPV_kW: 2.5,
  baseLoad_kW: 0.9,
  eveningPeak_kW: 1.8
} as const;

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
    const noise = noise_kW ? (Math.sin((t / SECONDS_PER_DAY) * 12 * Math.PI) * noise_kW) : 0;
    load[i] = base_kW + morningBump * 0.3 + eveningBump * eveningPeak_kW + noise;
  }
  return load;
};

const makeSeries = (dt_s: number, pv: number[], load: number[]): ScenarioSeries => ({
  dt_s,
  pvSeries_kW: pv,
  baseLoadSeries_kW: load
});

const summerSunny: ScenarioPreset = {
  id: 'summer_sunny',
  label: 'Été ensoleillé',
  description: 'Production PV soutenue avec un foyer présent le soir.',
  tags: ['été', 'ensoleillé'],
  generate: (dt_s: number) =>
    makeSeries(
      dt_s,
      generatePVSeries(dt_s, SUMMER_PARAMS.sunrise_s, SUMMER_PARAMS.sunset_s, SUMMER_PARAMS.peakPV_kW),
      generateBaseLoadSeries(dt_s, SUMMER_PARAMS.baseLoad_kW, SUMMER_PARAMS.eveningPeak_kW, 0.1)
    )
};

const winterOvercast: ScenarioPreset = {
  id: 'winter_overcast',
  label: 'Hiver couvert',
  description: 'Faible production PV et chauffage de base renforcé.',
  tags: ['hiver', 'couvert'],
  generate: (dt_s: number) =>
    makeSeries(
      dt_s,
      generatePVSeries(
        dt_s,
        WINTER_PARAMS.sunrise_s,
        WINTER_PARAMS.sunset_s,
        WINTER_PARAMS.peakPV_kW,
        0.6
      ),
      generateBaseLoadSeries(dt_s, WINTER_PARAMS.baseLoad_kW, WINTER_PARAMS.eveningPeak_kW, 0.05)
    )
};

export const scenarioPresets: readonly ScenarioPreset[] = [summerSunny, winterOvercast];

export const getScenarioById = (id: string): ScenarioPreset | undefined =>
  scenarioPresets.find((preset) => preset.id === id);
