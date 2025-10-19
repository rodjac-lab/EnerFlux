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

/**
 * REMOVED: pvUsedOnSite_kW function
 *
 * This function was calculating PV used for DIRECT consumption only (without battery).
 * It was using the formula: min(PV, Load) which is DIFFERENT from the actual
 * pvUsedOnSite definition used by the engine.
 *
 * The engine uses: pvUsedOnSite = pv_kW - gridExport_kW (see engine.ts:508)
 * Which includes: PV direct to load + PV to battery + PV to all devices
 *
 * This function was never used and caused terminological confusion.
 * For the correct value, use pvUsedOnSite_kW from engine simulation results.
 */

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
