import { Device, DevicePlan, EnvContext } from './Device';

/**
 * Stub pour une pompe de piscine (charge pilotable).
 */
export class PoolPump implements Device {
  public readonly id: string;

  public readonly label: string;

  public readonly capabilities = ['shiftable-load'] as const;

  public constructor(id: string, label: string) {
    this.id = id;
    this.label = label;
  }

  public plan(_dt_s: number, _ctx: EnvContext): DevicePlan {
    return {};
  }

  public apply(_power_kW: number, _dt_s: number, _ctx: EnvContext): void {
    // Stub : pas de comportement
  }

  public state(): Record<string, number | boolean> {
    return {};
  }
}
