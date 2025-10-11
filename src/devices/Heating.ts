import { Device, DevicePlan, EnvContext } from './Device';

export interface HeatingParams {
  maxPower_kW: number;
  thermalCapacity_kWh_per_K: number;
  lossCoeff_W_per_K: number;
  ambientTemp_C: number;
  comfortDay_C: number;
  comfortNight_C: number;
  dayStartHour: number;
  nightStartHour: number;
  hysteresis_K: number;
  initialTemp_C: number;
}

const SECONDS_PER_DAY = 86400;
const W_TO_KW = 1 / 1000;

export class Heating implements Device {
  public readonly id: string;

  public readonly label: string;

  public readonly capabilities = ['thermal-storage'] as const;

  private readonly params: HeatingParams;

  private temperature_C: number;

  private lastSetpoint_C: number;

  private lastPower_kW: number;

  private clock_s = 0;

  public constructor(id: string, label: string, params: HeatingParams) {
    this.id = id;
    this.label = label;
    this.params = { ...params };
    this.temperature_C = params.initialTemp_C;
    this.lastSetpoint_C = params.comfortDay_C;
    this.lastPower_kW = 0;
  }

  private normalizeHour(time_s: number): number {
    const mod = ((time_s % SECONDS_PER_DAY) + SECONDS_PER_DAY) % SECONDS_PER_DAY;
    return mod / 3600;
  }

  private setpointAt(time_s: number): number {
    const hour = this.normalizeHour(time_s);
    const { dayStartHour, nightStartHour, comfortDay_C, comfortNight_C } = this.params;
    if (dayStartHour === nightStartHour) {
      return comfortDay_C;
    }
    if (dayStartHour < nightStartHour) {
      if (hour >= dayStartHour && hour < nightStartHour) {
        return comfortDay_C;
      }
      return comfortNight_C;
    }
    if (hour >= dayStartHour || hour < nightStartHour) {
      return comfortDay_C;
    }
    return comfortNight_C;
  }

  public plan(dt_s: number, ctx: EnvContext): DevicePlan {
    const time_s =
      ctx.time_s !== undefined ? ctx.time_s : ((this.clock_s + dt_s + SECONDS_PER_DAY) % SECONDS_PER_DAY);
    this.clock_s = time_s;

    const setpoint = this.setpointAt(time_s);
    this.lastSetpoint_C = setpoint;

    const hysteresis = Math.max(0.1, this.params.hysteresis_K);
    const threshold = setpoint - hysteresis;
    if (this.temperature_C >= threshold) {
      return {};
    }

    const dt_h = dt_s / 3600;
    const requiredRise_K = setpoint - this.temperature_C;
    const requiredEnergy_kWh = requiredRise_K * this.params.thermalCapacity_kWh_per_K;
    const nominalPower_kW = requiredEnergy_kWh > 0 ? requiredEnergy_kWh / dt_h : 0;
    const requestedPower_kW = Math.min(this.params.maxPower_kW, Math.max(0, nominalPower_kW));

    if (requestedPower_kW <= 0) {
      return {};
    }

    return {
      request: {
        maxAccept_kW: requestedPower_kW,
        need: 'toHeat',
        priorityHint: requiredRise_K
      }
    };
  }

  public apply(power_kW: number, dt_s: number, ctx: EnvContext): void {
    const dt_h = dt_s / 3600;
    const deliveredPower_kW = Math.max(0, power_kW);
    const gainEnergy_kWh = deliveredPower_kW * dt_h;
    const gain_K = gainEnergy_kWh / this.params.thermalCapacity_kWh_per_K;

    const ambient = ctx.ambientTemp_C ?? this.params.ambientTemp_C;
    const coeff_kW_per_K = this.params.lossCoeff_W_per_K * W_TO_KW;
    const deltaAmbient_K = this.temperature_C - ambient;
    const lossPower_kW = coeff_kW_per_K * deltaAmbient_K;
    const lossEnergy_kWh = lossPower_kW * dt_h;
    const loss_K = lossEnergy_kWh / this.params.thermalCapacity_kWh_per_K;

    const nextTemp = this.temperature_C + gain_K - loss_K;

    this.temperature_C = Number.isFinite(nextTemp)
      ? Math.max(-50, Math.min(60, nextTemp))
      : this.temperature_C;
    this.lastPower_kW = deliveredPower_kW;
  }

  public state(): Record<string, number | boolean> {
    const deficit = Math.max(0, this.lastSetpoint_C - this.temperature_C);
    const comfortLowerBound_C = this.lastSetpoint_C - this.params.hysteresis_K;
    return {
      temp_C: this.temperature_C,
      target_C: this.lastSetpoint_C,
      comfort_lower_bound_C: comfortLowerBound_C,
      hysteresis_K: this.params.hysteresis_K,
      call_for_heat: deficit > this.params.hysteresis_K * 0.5,
      heating_power_kW: this.lastPower_kW
    };
  }
}
