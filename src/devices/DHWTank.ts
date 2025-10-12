import { Device, EnvContext, PowerRequest } from './Device';

export interface DHWTankParams {
  volume_L: number;
  resistivePower_kW: number;
  efficiency: number;
  lossCoeff_W_per_K: number;
  ambientTemp_C: number;
  targetTemp_C: number;
  initialTemp_C: number;
}

export const WATER_HEAT_CAPACITY_WH_PER_L_PER_K = 1.163;

/**
 * Modèle simple de ballon ECS (stockage thermique).
 */
export class DHWTank implements Device {
  public readonly id: string;

  public readonly label: string;

  public readonly capabilities = ['thermal-storage'] as const;

  private readonly params: DHWTankParams;

  private temp_C: number;

  public constructor(id: string, label: string, params: DHWTankParams) {
    this.id = id;
    this.label = label;
    this.params = params;
    this.temp_C = params.initialTemp_C;
  }

  public plan(dt_s: number, _ctx: EnvContext): { request?: PowerRequest } {
    if (this.temp_C >= this.params.targetTemp_C) {
      return {};
    }
    return {
      request: {
        maxAccept_kW: this.params.resistivePower_kW,
        need: 'toHeat',
        priorityHint: 80
      }
    };
  }

  public apply(power_kW: number, dt_s: number, ctx: EnvContext): void {
    const ambient = ctx.ambientTemp_C ?? this.params.ambientTemp_C;
    const energyGain_Wh = (power_kW * dt_s * this.params.efficiency * 1000) / 3600;
    const heatGain_C = energyGain_Wh / (WATER_HEAT_CAPACITY_WH_PER_L_PER_K * this.params.volume_L);
    const lossPower_W = this.params.lossCoeff_W_per_K * (this.temp_C - ambient);
    const energyLoss_Wh = (lossPower_W * dt_s) / 3600;
    const heatLoss_C = -energyLoss_Wh / (WATER_HEAT_CAPACITY_WH_PER_L_PER_K * this.params.volume_L);
    const nextTemp = this.temp_C + heatGain_C + heatLoss_C;
    this.temp_C = Math.min(this.params.targetTemp_C, Math.max(nextTemp, ambient));
  }

  public state(): Record<string, number | boolean> {
    const hot = this.temp_C >= this.params.targetTemp_C - 0.5;
    return {
      temp_C: this.temp_C,
      isHot: hot
    };
  }

  public get temperature(): number {
    return this.temp_C;
  }

  public get targetTemp(): number {
    return this.params.targetTemp_C;
  }

  public get maxPower_kW(): number {
    return this.params.resistivePower_kW;
  }

  public get volume_L(): number {
    return this.params.volume_L;
  }

  public enforceTargetTemperature(): void {
    this.temp_C = this.params.targetTemp_C;
  }

  public powerToReachTarget(dt_s: number, ambientTemp_C?: number): number {
    const ambient = ambientTemp_C ?? this.params.ambientTemp_C;
    const target = this.params.targetTemp_C;
    if (this.temp_C >= target - 1e-6) {
      return 0;
    }
    const lossPower_W = this.params.lossCoeff_W_per_K * (this.temp_C - ambient);
    const lossEnergy_Wh = (lossPower_W * dt_s) / 3600;
    const thermalCapacity = WATER_HEAT_CAPACITY_WH_PER_L_PER_K * this.params.volume_L;
    const lossEffect_C = -lossEnergy_Wh / thermalCapacity;
    const requiredGain_C = target - this.temp_C - lossEffect_C;
    if (requiredGain_C <= 0) {
      return 0;
    }
    const requiredEnergy_Wh = requiredGain_C * thermalCapacity;
    const requiredPower_kW = (requiredEnergy_Wh * 3600) / (dt_s * 1000 * this.params.efficiency);
    if (!Number.isFinite(requiredPower_kW)) {
      return 0;
    }
    return Math.max(0, Math.min(requiredPower_kW, this.params.resistivePower_kW));
  }
}

export type DHWTankState = ReturnType<DHWTank['state']>;
