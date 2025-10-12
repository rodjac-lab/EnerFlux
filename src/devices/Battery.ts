import { Device, EnvContext, PowerOffer, PowerRequest } from './Device';

export interface BatteryParams {
  capacity_kWh: number;
  pMax_kW: number;
  etaCharge: number;
  etaDischarge: number;
  socInit_kWh: number;
  socMin_kWh: number;
  socMax_kWh: number;
}

const clamp = (value: number, min: number, max: number): number => Math.min(Math.max(value, min), max);
const NET_POWER_EPSILON_KW = 0.05;
const EPSILON = 1e-6;

/**
 * Modèle simplifié de batterie résidentielle.
 */
export class Battery implements Device {
  public readonly id: string;

  public readonly label: string;

  public readonly capabilities = ['electrical-storage'] as const;

  private readonly params: BatteryParams;

  private soc_kWh: number;

  public constructor(id: string, label: string, params: BatteryParams) {
    this.id = id;
    this.label = label;
    this.params = params;
    this.soc_kWh = clamp(params.socInit_kWh, params.socMin_kWh, params.socMax_kWh);
  }

  private getMaxChargePower(dt_s: number): number {
    const headroom_kWh = Math.max(this.params.socMax_kWh - this.soc_kWh, 0);
    if (headroom_kWh <= 0) {
      return 0;
    }
    const limitByEnergy = (headroom_kWh / this.params.etaCharge) * (3600 / dt_s);
    return clamp(limitByEnergy, 0, this.params.pMax_kW);
  }

  private getMaxDischargePower(dt_s: number): number {
    const available_kWh = Math.max(this.soc_kWh - this.params.socMin_kWh, 0);
    if (available_kWh <= 0) {
      return 0;
    }
    const limitByEnergy = available_kWh * this.params.etaDischarge * (3600 / dt_s);
    return clamp(limitByEnergy, 0, this.params.pMax_kW);
  }

  public plan(dt_s: number, ctx: EnvContext): { request?: PowerRequest; offer?: PowerOffer } {
    const netSurplus_kW = ctx.pv_kW - ctx.baseLoad_kW;
    const plan: { request?: PowerRequest; offer?: PowerOffer } = {};
    const shouldCharge =
      netSurplus_kW > NET_POWER_EPSILON_KW ||
      (netSurplus_kW > EPSILON && this.soc_kWh <= this.params.socMin_kWh + 1e-6);
    if (shouldCharge) {
      const maxCharge = this.getMaxChargePower(dt_s);
      if (maxCharge > 0) {
        plan.request = {
          maxAccept_kW: Math.min(maxCharge, netSurplus_kW),
          need: 'toStore',
          priorityHint: 60
        };
      }
    } else if (netSurplus_kW < -NET_POWER_EPSILON_KW) {
      const maxDischarge = this.getMaxDischargePower(dt_s);
      if (maxDischarge > 0) {
        plan.offer = {
          maxSupply_kW: Math.min(maxDischarge, -netSurplus_kW),
          costPenalty: 0.1
        };
      }
    }
    return plan;
  }

  public apply(power_kW: number, dt_s: number, _ctx: EnvContext): void {
    if (power_kW > 0) {
      const delta_kWh = (power_kW * dt_s * this.params.etaCharge) / 3600;
      this.soc_kWh += delta_kWh;
    } else if (power_kW < 0) {
      const delta_kWh = (power_kW * dt_s) / (3600 * this.params.etaDischarge);
      this.soc_kWh += delta_kWh;
    }
    this.soc_kWh = clamp(this.soc_kWh, this.params.socMin_kWh, this.params.socMax_kWh);
  }

  public state(): Record<string, number | boolean> {
    const socFraction =
      this.params.socMax_kWh === 0
        ? 0
        : (this.soc_kWh - this.params.socMin_kWh) /
          Math.max(this.params.socMax_kWh - this.params.socMin_kWh, 1e-6);
    return {
      soc_kWh: this.soc_kWh,
      soc_percent: clamp(socFraction, 0, 1) * 100
    };
  }

  public get socFraction(): number {
    return clamp(
      (this.soc_kWh - this.params.socMin_kWh) /
        Math.max(this.params.socMax_kWh - this.params.socMin_kWh, 1e-6),
      0,
      1
    );
  }

  public get soc_kWhValue(): number {
    return this.soc_kWh;
  }

  public get usableCapacity_kWh(): number {
    return Math.max(this.params.socMax_kWh - this.params.socMin_kWh, 0);
  }
}

export type BatteryState = ReturnType<Battery['state']>;
