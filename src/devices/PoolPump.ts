import { Device, DevicePlan, EnvContext } from './Device';

export interface PoolWindow {
  startHour: number;
  endHour: number;
}

export interface PoolPumpParams {
  power_kW: number;
  minHoursPerDay: number;
  preferredWindows: PoolWindow[];
  catchUpStartHour: number;
}

const SECONDS_PER_DAY = 86400;

const clamp = (value: number, min: number, max: number): number => Math.min(Math.max(value, min), max);

export class PoolPump implements Device {
  public readonly id: string;

  public readonly label: string;

  public readonly capabilities = ['shiftable-load'] as const;

  private readonly params: PoolPumpParams;

  private runtimeSeconds = 0;

  private dayIndex = 0;

  private clock_s = 0;

  private lastPower_kW = 0;

  public constructor(id: string, label: string, params: PoolPumpParams) {
    this.id = id;
    this.label = label;
    this.params = { ...params, preferredWindows: params.preferredWindows.map((win) => ({ ...win })) };
  }

  private normalizeHour(time_s: number): number {
    const mod = ((time_s % SECONDS_PER_DAY) + SECONDS_PER_DAY) % SECONDS_PER_DAY;
    return mod / 3600;
  }

  private resetIfNeeded(time_s: number): void {
    const currentDay = Math.floor(time_s / SECONDS_PER_DAY);
    if (currentDay !== this.dayIndex) {
      this.dayIndex = currentDay;
      this.runtimeSeconds = 0;
    }
  }

  private isInsidePreferredWindow(hour: number): boolean {
    if (this.params.preferredWindows.length === 0) {
      return false;
    }
    return this.params.preferredWindows.some((window) => {
      const start = clamp(window.startHour, 0, 24);
      const end = clamp(window.endHour, 0, 24);
      if (end === start) {
        return false;
      }
      if (end > start) {
        return hour >= start && hour < end;
      }
      // window spanning midnight
      return hour >= start || hour < end;
    });
  }

  private remainingHours(): number {
    return Math.max(0, this.params.minHoursPerDay - this.runtimeSeconds / 3600);
  }

  public plan(dt_s: number, ctx: EnvContext): DevicePlan {
    const nextTime = ctx.time_s !== undefined ? ctx.time_s : this.clock_s + dt_s;
    this.clock_s = nextTime;
    this.resetIfNeeded(nextTime);

    const remainingHours = this.remainingHours();
    if (remainingHours <= 0 || this.params.power_kW <= 0) {
      return {};
    }

    const hour = this.normalizeHour(nextTime);
    const withinPreferred = this.isInsidePreferredWindow(hour);
    const timeLeftDay_h = ((this.dayIndex + 1) * SECONDS_PER_DAY - nextTime) / 3600;
    const catchUp = hour >= this.params.catchUpStartHour || timeLeftDay_h <= remainingHours + 1e-3;
    if (!withinPreferred && !catchUp) {
      return {};
    }

    const priority = catchUp ? 95 : 60;
    return {
      request: {
        maxAccept_kW: this.params.power_kW,
        need: 'toLoad',
        priorityHint: priority
      }
    };
  }

  public apply(power_kW: number, dt_s: number, ctx: EnvContext): void {
    this.clock_s = ctx.time_s ?? this.clock_s + dt_s;
    this.resetIfNeeded(this.clock_s);
    const delivered = Math.max(0, power_kW);
    this.lastPower_kW = delivered;
    if (this.params.power_kW > 0 && delivered > 0) {
      const runFraction = Math.min(1, delivered / this.params.power_kW);
      this.runtimeSeconds += dt_s * runFraction;
    }
  }

  public state(): Record<string, number | boolean> {
    const hoursRun = this.runtimeSeconds / 3600;
    return {
      hours_run: hoursRun,
      hours_remaining: Math.max(0, this.params.minHoursPerDay - hoursRun),
      running: this.lastPower_kW > 1e-3
    };
  }
}
