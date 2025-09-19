import { Tariffs } from './types';

const SECONDS_PER_DAY = 24 * 3600;

const normalizeHour = (hour: number): number => {
  const normalized = Math.floor(hour);
  if (!Number.isFinite(normalized)) {
    return 0;
  }
  const mod = normalized % 24;
  return mod < 0 ? mod + 24 : mod;
};

const complementHours = (hours: number[]): number[] => {
  const set = new Set(hours.map(normalizeHour));
  const result: number[] = [];
  for (let hour = 0; hour < 24; hour += 1) {
    if (!set.has(hour)) {
      result.push(hour);
    }
  }
  return result;
};

const repeatValue = (value: number, steps: number): number[] => {
  const arr = new Array(steps);
  for (let i = 0; i < steps; i += 1) {
    arr[i] = value;
  }
  return arr;
};

const projectProfile = (profile: number[], steps: number, dt_s: number): number[] => {
  if (profile.length === 0) {
    return repeatValue(0, steps);
  }
  if (profile.length === steps) {
    return profile.slice();
  }
  const projected = new Array(steps);
  for (let i = 0; i < steps; i += 1) {
    const time_s = (i * dt_s) % SECONDS_PER_DAY;
    const ratio = time_s / SECONDS_PER_DAY;
    const rawIndex = Math.floor(ratio * profile.length);
    const index = Math.min(profile.length - 1, rawIndex);
    projected[i] = profile[index];
  }
  return projected;
};

const ensureArray = (input: number | number[] | undefined, steps: number, dt_s: number): number[] => {
  if (Array.isArray(input)) {
    return projectProfile(input, steps, dt_s);
  }
  if (typeof input === 'number' && Number.isFinite(input)) {
    return repeatValue(input, steps);
  }
  return repeatValue(0, steps);
};

export const cloneTariffs = (tariffs: Tariffs): Tariffs => ({
  mode: tariffs.mode,
  import_EUR_per_kWh: Array.isArray(tariffs.import_EUR_per_kWh)
    ? [...tariffs.import_EUR_per_kWh]
    : tariffs.import_EUR_per_kWh,
  export_EUR_per_kWh: Array.isArray(tariffs.export_EUR_per_kWh)
    ? [...tariffs.export_EUR_per_kWh]
    : tariffs.export_EUR_per_kWh,
  tou: tariffs.tou
    ? {
        onpeak_hours: [...tariffs.tou.onpeak_hours],
        offpeak_hours: [...tariffs.tou.offpeak_hours],
        onpeak_price: tariffs.tou.onpeak_price,
        offpeak_price: tariffs.tou.offpeak_price
      }
    : undefined
});

export const defaultTariffs: Tariffs = {
  mode: 'fixed',
  import_EUR_per_kWh: 0.25,
  export_EUR_per_kWh: 0.1,
  tou: {
    onpeak_hours: [7, 8, 9, 18, 19, 20, 21, 22],
    offpeak_hours: complementHours([7, 8, 9, 18, 19, 20, 21, 22]),
    onpeak_price: 0.3,
    offpeak_price: 0.18
  }
};

export const resolvePrices = (
  tariffs: Tariffs,
  steps: number,
  dt_s: number
): { importPrices: number[]; exportPrices: number[] } => {
  if (steps <= 0 || dt_s <= 0) {
    return { importPrices: [], exportPrices: [] };
  }

  const safeSteps = Math.floor(steps);

  if (tariffs.mode === 'tou') {
    const tou = tariffs.tou ?? defaultTariffs.tou!;
    const onPeakSet = new Set((tou.onpeak_hours ?? []).map(normalizeHour));

    const importPrices = new Array(safeSteps);
    for (let i = 0; i < safeSteps; i += 1) {
      const hour = normalizeHour(Math.floor(((i * dt_s) / 3600) % 24));
      importPrices[i] = onPeakSet.has(hour) ? tou.onpeak_price : tou.offpeak_price;
    }

    return {
      importPrices,
      exportPrices: ensureArray(tariffs.export_EUR_per_kWh, safeSteps, dt_s)
    };
  }

  if (tariffs.mode === 'profile') {
    return {
      importPrices: ensureArray(tariffs.import_EUR_per_kWh, safeSteps, dt_s),
      exportPrices: ensureArray(tariffs.export_EUR_per_kWh, safeSteps, dt_s)
    };
  }

  return {
    importPrices: ensureArray(tariffs.import_EUR_per_kWh, safeSteps, dt_s),
    exportPrices: ensureArray(tariffs.export_EUR_per_kWh, safeSteps, dt_s)
  };
};

export const deriveTouConfig = (onPeak: number[]): Tariffs['tou'] => ({
  onpeak_hours: onPeak.map(normalizeHour),
  offpeak_hours: complementHours(onPeak),
  onpeak_price: defaultTariffs.tou!.onpeak_price,
  offpeak_price: defaultTariffs.tou!.offpeak_price
});
