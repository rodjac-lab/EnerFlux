import { Device, DevicePlan, EnvContext } from './Device';

export interface EVChargeSession {
  arrivalHour: number;
  departureHour: number;
  energyNeed_kWh: number;
}

export interface EVChargerParams {
  maxPower_kW: number;
  session: EVChargeSession;
}

const SECONDS_PER_DAY = 86400;

const clamp = (value: number, min: number, max: number): number =>
  Math.min(Math.max(value, min), max);

const normalizeHour = (hour: number): number => {
  if (!Number.isFinite(hour)) {
    return 0;
  }
  const normalized = ((hour % 24) + 24) % 24;
  return normalized;
};

export class EVCharger implements Device {
  public readonly id: string;

  public readonly label: string;

  public readonly capabilities = ['vehicle-charger'] as const;

  private readonly params: EVChargerParams;

  private sessionStartTime_s: number | null = null;

  private deliveredThisSession_kWh = 0;

  private lastPower_kW = 0;

  private clock_s = 0;

  public constructor(id: string, label: string, params: EVChargerParams) {
    this.id = id;
    this.label = label;
    this.params = {
      maxPower_kW: Math.max(0, params.maxPower_kW),
      session: {
        arrivalHour: normalizeHour(params.session.arrivalHour),
        departureHour: normalizeHour(params.session.departureHour),
        energyNeed_kWh: Math.max(0, params.session.energyNeed_kWh)
      }
    };
  }

  private sessionDuration_s(): number {
    const arrival = this.params.session.arrivalHour;
    const departure = this.params.session.departureHour;
    if (this.params.session.energyNeed_kWh <= 0 || this.params.maxPower_kW <= 0) {
      return 0;
    }
    if (departure === arrival) {
      return SECONDS_PER_DAY;
    }
    if (departure > arrival) {
      return (departure - arrival) * 3600;
    }
    return (24 - arrival + departure) * 3600;
  }

  private ensureSession(time_s: number): void {
    const duration_s = this.sessionDuration_s();
    if (duration_s <= 0) {
      this.sessionStartTime_s = null;
      this.deliveredThisSession_kWh = 0;
      return;
    }

    if (this.sessionStartTime_s !== null) {
      const sessionEnd = this.sessionStartTime_s + duration_s;
      if (time_s >= sessionEnd - 1e-6) {
        this.sessionStartTime_s = null;
        this.deliveredThisSession_kWh = 0;
      }
    }

    if (this.sessionStartTime_s === null) {
      const arrival_s = this.params.session.arrivalHour * 3600;
      let start = Math.floor((time_s - arrival_s) / SECONDS_PER_DAY) * SECONDS_PER_DAY + arrival_s;
      if (time_s < start) {
        start -= SECONDS_PER_DAY;
      }
      const tentativeEnd = start + duration_s;
      if (time_s >= tentativeEnd) {
        start += SECONDS_PER_DAY;
      }
      if (time_s >= start && time_s < start + duration_s) {
        this.sessionStartTime_s = start;
      }
    }
  }

  private remainingEnergy_kWh(): number {
    return Math.max(0, this.params.session.energyNeed_kWh - this.deliveredThisSession_kWh);
  }

  private sessionTimeBounds(time_s: number): { start: number; end: number } | null {
    const duration_s = this.sessionDuration_s();
    if (duration_s <= 0 || this.sessionStartTime_s === null) {
      return null;
    }
    const start = this.sessionStartTime_s;
    const end = start + duration_s;
    if (time_s < start || time_s > end) {
      return null;
    }
    return { start, end };
  }

  private nextSessionStart(time_s: number): number | null {
    const duration_s = this.sessionDuration_s();
    if (duration_s <= 0) {
      return null;
    }

    const arrival_s = this.params.session.arrivalHour * 3600;
    const dayStart = Math.floor(time_s / SECONDS_PER_DAY) * SECONDS_PER_DAY;
    const candidates = [
      dayStart - SECONDS_PER_DAY + arrival_s,
      dayStart + arrival_s,
      dayStart + SECONDS_PER_DAY + arrival_s
    ];

    let nextStart: number | null = null;

    for (const start of candidates) {
      const end = start + duration_s;
      if (time_s >= start - 1e-6 && time_s < end - 1e-6) {
        return start;
      }
      if (start >= time_s - 1e-6) {
        if (nextStart === null || start < nextStart) {
          nextStart = start;
        }
      }
    }

    return nextStart;
  }

  public plan(dt_s: number, ctx: EnvContext): DevicePlan {
    const nextTime = ctx.time_s !== undefined ? ctx.time_s : this.clock_s + dt_s;
    this.clock_s = nextTime;
    this.ensureSession(nextTime);
    const bounds = this.sessionTimeBounds(nextTime);
    const remainingEnergy = this.remainingEnergy_kWh();

    if (!bounds || remainingEnergy <= 0 || this.params.maxPower_kW <= 0) {
      this.lastPower_kW = 0;
      return {};
    }

    const timeRemaining_s = Math.max(bounds.end - nextTime, 0);
    if (timeRemaining_s <= 1e-6) {
      return {};
    }

    const dt_h = dt_s / 3600;
    const requiredPower_kW = remainingEnergy / (timeRemaining_s / 3600);
    const cappedRequiredPower = clamp(requiredPower_kW, 0, this.params.maxPower_kW);
    const priority = timeRemaining_s <= 3600 ? 95 : 70;

    const maxAccept_kW = Math.max(
      0,
      Math.min(this.params.maxPower_kW, remainingEnergy / Math.max(dt_h, 1e-6))
    );

    if (maxAccept_kW <= 0) {
      return {};
    }

    return {
      request: {
        maxAccept_kW,
        need: 'toLoad',
        priorityHint: priority + Math.round((cappedRequiredPower / this.params.maxPower_kW) * 5)
      }
    };
  }

  public apply(power_kW: number, dt_s: number, ctx: EnvContext): void {
    const time_s = ctx.time_s ?? this.clock_s + dt_s;
    this.clock_s = time_s;
    this.ensureSession(time_s);
    const bounds = this.sessionTimeBounds(time_s);
    if (!bounds || this.params.maxPower_kW <= 0) {
      this.lastPower_kW = 0;
      return;
    }

    const remainingEnergy = this.remainingEnergy_kWh();
    if (remainingEnergy <= 0) {
      this.lastPower_kW = 0;
      return;
    }

    const dt_h = dt_s / 3600;
    const maxDeliverablePower_kW = remainingEnergy / dt_h;
    const appliedPower_kW = Math.max(0, Math.min(power_kW, this.params.maxPower_kW, maxDeliverablePower_kW));
    this.lastPower_kW = appliedPower_kW;
    const delivered_kWh = appliedPower_kW * dt_h;
    this.deliveredThisSession_kWh = Math.min(
      this.params.session.energyNeed_kWh,
      this.deliveredThisSession_kWh + delivered_kWh
    );
  }

  public state(): Record<string, number | boolean> {
    const remaining = this.remainingEnergy_kWh();
    const time_s = this.clock_s;
    const bounds = this.sessionTimeBounds(time_s);
    const active = Boolean(bounds && time_s >= bounds.start - 1e-6 && time_s < bounds.end + 1e-6 && remaining > 0);
    const timeRemaining_s = bounds ? Math.max(bounds.end - time_s, 0) : 0;
    const nextStart = this.nextSessionStart(time_s);
    const timeToStart_s = active
      ? 0
      : nextStart !== null
        ? Math.max(nextStart - time_s, 0)
        : Number.POSITIVE_INFINITY;
    const sessionDuration_h = this.sessionDuration_s() / 3600;
    return {
      charging: this.lastPower_kW > 1e-3,
      charging_power_kW: this.lastPower_kW,
      energy_remaining_kWh: remaining,
      session_active: active,
      session_time_remaining_h: timeRemaining_s / 3600,
      session_time_to_start_h: timeToStart_s === Number.POSITIVE_INFINITY ? Number.POSITIVE_INFINITY : timeToStart_s / 3600,
      session_energy_need_kWh: this.params.session.energyNeed_kWh,
      session_duration_h: sessionDuration_h,
      session_max_power_kW: this.params.maxPower_kW
    };
  }
}
