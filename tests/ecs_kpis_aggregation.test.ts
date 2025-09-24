import { describe, expect, it } from 'vitest';
import { aggregateEcsDeadlineKpis } from '../src/core/ecs/kpis';

describe('Agrégation journalière des KPI ECS', () => {
  it('calcule un hit_rate moyen et la somme des pénalités sur plusieurs jours', () => {
    const dt_s = 3600; // 1 h
    const days = 3;
    const hoursPerDay = 24;
    const totalSteps = days * hoursPerDay;
    const temps: number[] = new Array(totalSteps).fill(58);

    const deadlineHour = 21;
    const indexFor = (day: number, hour: number) => day * hoursPerDay + hour;

    // Jour 0 : atteint la cible
    temps[indexFor(0, deadlineHour - 1)] = 56;
    temps[indexFor(0, deadlineHour)] = 56;
    temps[indexFor(0, deadlineHour + 1)] = 56;
    // Jour 1 : déficit de 5 K
    temps[indexFor(1, deadlineHour - 1)] = 50;
    temps[indexFor(1, deadlineHour)] = 50;
    temps[indexFor(1, deadlineHour + 1)] = 50;
    // Jour 2 : juste à la cible
    temps[indexFor(2, deadlineHour - 1)] = 55;
    temps[indexFor(2, deadlineHour)] = 55;
    temps[indexFor(2, deadlineHour + 1)] = 55;

    const penaltyPerKelvin = 0.1;
    const aggregation = aggregateEcsDeadlineKpis({
      temps_C: temps,
      dt_s,
      targetCelsius: 55,
      deadlineHour,
      penaltyPerKelvin,
      mode: 'penalize'
    });

    expect(aggregation.daily).toHaveLength(3);
    expect(aggregation.hitRate).toBeCloseTo(2 / 3, 6);
    expect(aggregation.averageDeficit_K).toBeCloseTo((0 + 5 + 0) / 3, 6);

    const expectedPenalty = 5 * penaltyPerKelvin;
    expect(aggregation.totalPenalty_EUR).toBeCloseTo(expectedPenalty, 6);

    const sumDailyPenalties = aggregation.daily.reduce((acc, day) => acc + day.penalty_EUR, 0);
    expect(sumDailyPenalties).toBeCloseTo(aggregation.totalPenalty_EUR, 6);
  });
});
