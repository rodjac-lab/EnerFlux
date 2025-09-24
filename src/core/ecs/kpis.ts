import type { EcsServiceMode } from '../../data/ecs-service';

const SECONDS_PER_DAY = 86400;
const EPSILON = 1e-6;

export interface DailyEcsDeadlineKpi {
  dayIndex: number;
  observedTemp_C: number;
  deficit_K: number;
  penalty_EUR: number;
  hit: boolean;
}

export interface AggregatedEcsDeadlineKpis {
  daily: DailyEcsDeadlineKpi[];
  hitRate: number;
  averageDeficit_K: number;
  totalPenalty_EUR: number;
}

export interface AggregateEcsDeadlineParams {
  temps_C: readonly number[];
  dt_s: number;
  targetCelsius: number;
  deadlineHour: number;
  penaltyPerKelvin: number;
  mode: EcsServiceMode;
  toleranceSteps?: number;
}

const clamp = (value: number, min: number, max: number): number => {
  if (value < min) {
    return min;
  }
  if (value > max) {
    return max;
  }
  return value;
};

export const aggregateEcsDeadlineKpis = (
  params: AggregateEcsDeadlineParams
): AggregatedEcsDeadlineKpis => {
  const {
    temps_C,
    dt_s,
    targetCelsius,
    deadlineHour,
    penaltyPerKelvin,
    mode,
    toleranceSteps = 1
  } = params;

  if (!Number.isFinite(dt_s) || dt_s <= 0 || temps_C.length === 0) {
    return { daily: [], hitRate: 0, averageDeficit_K: 0, totalPenalty_EUR: 0 };
  }

  const lastTime_s = (temps_C.length - 1) * dt_s;
  if (lastTime_s < 0) {
    return { daily: [], hitRate: 0, averageDeficit_K: 0, totalPenalty_EUR: 0 };
  }

  const tolerance_s = toleranceSteps * dt_s + EPSILON;
  const deadlineSeconds = clamp(deadlineHour, 0, 24) * 3600;
  const totalDays = Math.floor(lastTime_s / SECONDS_PER_DAY) + 1;
  const evaluations: DailyEcsDeadlineKpi[] = [];

  for (let day = 0; day < totalDays; day += 1) {
    const targetTime_s = day * SECONDS_PER_DAY + deadlineSeconds;
    if (targetTime_s - tolerance_s > lastTime_s) {
      break;
    }
    const approxIndex = Math.round(targetTime_s / dt_s);
    let observedTemp = Number.NEGATIVE_INFINITY;
    let hasSample = false;

    for (let offset = -toleranceSteps; offset <= toleranceSteps; offset += 1) {
      const index = approxIndex + offset;
      if (index < 0 || index >= temps_C.length) {
        continue;
      }
      const sampleTime_s = index * dt_s;
      if (Math.abs(sampleTime_s - targetTime_s) <= tolerance_s) {
        hasSample = true;
        const value = temps_C[index];
        if (Number.isFinite(value) && value > observedTemp) {
          observedTemp = value;
        }
      }
    }

    if (!hasSample) {
      continue;
    }

    const safeObserved = Number.isFinite(observedTemp) ? observedTemp : 0;
    let deficit_K = Math.max(0, targetCelsius - safeObserved);
    if (mode === 'force') {
      deficit_K = 0;
    }
    const hit = deficit_K <= EPSILON;
    const penalty_EUR = mode === 'penalize' ? deficit_K * Math.max(penaltyPerKelvin, 0) : 0;

    evaluations.push({
      dayIndex: day,
      observedTemp_C: safeObserved,
      deficit_K,
      penalty_EUR,
      hit
    });
  }

  if (evaluations.length === 0) {
    return { daily: [], hitRate: 0, averageDeficit_K: 0, totalPenalty_EUR: 0 };
  }

  const totalPenalty_EUR = evaluations.reduce((acc, entry) => acc + entry.penalty_EUR, 0);
  const totalDeficit = evaluations.reduce((acc, entry) => acc + entry.deficit_K, 0);
  const totalHits = evaluations.reduce((acc, entry) => acc + (entry.hit ? 1 : 0), 0);
  const count = evaluations.length;

  return {
    daily: evaluations,
    hitRate: totalHits / count,
    averageDeficit_K: totalDeficit / count,
    totalPenalty_EUR
  };
};
