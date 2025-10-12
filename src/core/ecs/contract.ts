import type { DHWTank } from '../../devices/DHWTank';

export type EcsServiceMode = 'force' | 'hysteresis' | 'penalize' | 'off';

export interface EcsHelpersConfig {
  /** Active le helper d'hystérésis pour éviter les yo-yo autour de la cible. */
  hysteresisEnabled: boolean;
  /**
   * Bande d'hystérésis (K) entre le seuil bas et la cible. Plus la valeur est élevée,
   * plus le ballon laisse baisser sa température avant de redemander de l'énergie.
   */
  hysteresisBand_K: number;
  /** Active le helper de préchauffe avant la deadline. */
  deadlineEnabled: boolean;
  /**
   * Fenêtre (heures) pendant laquelle le helper de deadline peut lancer un appoint
   * anticipé afin d'éviter une pénalité ou un secours réseau massif.
   */
  deadlinePreheatWindowHours: number;
}

export interface EcsServiceContract {
  mode: EcsServiceMode;
  targetCelsius: number;
  deadlineHour: number;
  penaltyPerKelvin: number;
  helpers: EcsHelpersConfig;
}

export const defaultEcsHelpersConfig = (): EcsHelpersConfig => ({
  hysteresisEnabled: true,
  hysteresisBand_K: 1.5,
  deadlineEnabled: true,
  deadlinePreheatWindowHours: 1
});

export const defaultEcsServiceContract = (): EcsServiceContract => ({
  mode: 'force',
  targetCelsius: 55,
  deadlineHour: 21,
  penaltyPerKelvin: 0.08,
  helpers: defaultEcsHelpersConfig()
});

export const cloneEcsServiceContract = (contract: EcsServiceContract): EcsServiceContract => ({
  mode: contract.mode,
  targetCelsius: contract.targetCelsius,
  deadlineHour: contract.deadlineHour,
  penaltyPerKelvin: contract.penaltyPerKelvin,
  helpers: { ...contract.helpers }
});

const sanitizeNumber = (value: unknown, fallback: number): number => {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }
  return fallback;
};

const sanitizeMode = (mode: unknown, fallback: EcsServiceMode): EcsServiceMode => {
  if (mode === 'force' || mode === 'hysteresis' || mode === 'penalize' || mode === 'off') {
    return mode;
  }
  return fallback;
};

const sanitizeHelpers = (base: EcsHelpersConfig, override?: Partial<EcsHelpersConfig>): EcsHelpersConfig => ({
  hysteresisEnabled: override?.hysteresisEnabled ?? base.hysteresisEnabled,
  hysteresisBand_K: Math.max(0.1, sanitizeNumber(override?.hysteresisBand_K, base.hysteresisBand_K)),
  deadlineEnabled: override?.deadlineEnabled ?? base.deadlineEnabled,
  deadlinePreheatWindowHours: Math.max(
    0,
    sanitizeNumber(override?.deadlinePreheatWindowHours, base.deadlinePreheatWindowHours)
  )
});

export const mergeEcsServiceContract = (
  base: EcsServiceContract,
  override?: Partial<EcsServiceContract>
): EcsServiceContract => {
  if (!override) {
    return cloneEcsServiceContract(base);
  }
  const merged: EcsServiceContract = {
    mode: sanitizeMode(override.mode, base.mode),
    targetCelsius: sanitizeNumber(override.targetCelsius, base.targetCelsius),
    deadlineHour: Math.max(0, sanitizeNumber(override.deadlineHour, base.deadlineHour)),
    penaltyPerKelvin: Math.max(0, sanitizeNumber(override.penaltyPerKelvin, base.penaltyPerKelvin)),
    helpers: sanitizeHelpers(base.helpers, override.helpers)
  };
  return merged;
};

export const resolveTargetTemperature = (
  contract: EcsServiceContract,
  tank?: DHWTank
): EcsServiceContract => {
  if (Number.isFinite(contract.targetCelsius)) {
    return contract;
  }
  if (tank) {
    return { ...contract, targetCelsius: tank.targetTemp };
  }
  return { ...contract, targetCelsius: defaultEcsServiceContract().targetCelsius };
};
