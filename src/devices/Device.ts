/**
 * Contrat commun pour tous les équipements connectés au moteur.
 * Les unités suivent la convention : puissance en kW, énergie en kWh, temps en secondes.
 */
export type Capability =
  | 'electrical-storage'
  | 'thermal-storage'
  | 'shiftable-load'
  | 'vehicle-charger';

export interface EnvContext {
  pv_kW: number;
  baseLoad_kW: number;
  priceImport_EUR_per_kWh?: number;
  priceExport_EUR_per_kWh?: number;
  ambientTemp_C?: number;
  time_s?: number;
}

export interface PowerRequest {
  maxAccept_kW: number;
  minAccept_kW?: number;
  need: 'toStore' | 'toHeat' | 'toLoad';
  priorityHint?: number;
}

export interface PowerOffer {
  maxSupply_kW: number;
  costPenalty?: number;
}

export interface DevicePlan {
  request?: PowerRequest;
  offer?: PowerOffer;
}

export interface Device {
  id: string;
  label: string;
  capabilities: Capability[];
  plan(dt_s: number, ctx: EnvContext): DevicePlan;
  apply(power_kW: number, dt_s: number, ctx: EnvContext): void;
  state(): Record<string, number | boolean>;
}
