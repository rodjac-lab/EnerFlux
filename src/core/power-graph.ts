/**
 * Petites fonctions utilitaires pour raisonner sur les flux de puissance instantanés.
 */
export interface PowerInstant {
  pv_kW: number;
  baseLoad_kW: number;
  deviceConsumption_kW: number;
}

export const loadOnSite_kW = (instant: PowerInstant): number =>
  instant.baseLoad_kW + instant.deviceConsumption_kW;

export const pvUsedOnSite_kW = (instant: PowerInstant): number =>
  Math.min(instant.pv_kW, loadOnSite_kW(instant));

export const sumPositive = (values: Iterable<number>): number => {
  let acc = 0;
  for (const value of values) {
    if (value > 0) {
      acc += value;
    }
  }
  return acc;
};

export const sumAbsolute = (values: Iterable<number>): number => {
  let acc = 0;
  for (const value of values) {
    acc += Math.abs(value);
  }
  return acc;
};
