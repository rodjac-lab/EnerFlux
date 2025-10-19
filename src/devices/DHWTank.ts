import { Device, EnvContext, PowerRequest } from './Device';

/**
 * Événement de puisage d'eau chaude sanitaire.
 * Représente un tirage d'eau chaude (douche, vaisselle, etc.)
 */
export interface WaterDrawEvent {
  /** Heure de la journée (0-24) où le puisage se produit */
  hour: number;
  /** Volume d'eau chaude puisée en litres */
  volume_L: number;
  /** Température de l'eau froide de remplacement en °C (typiquement 10-15°C) */
  coldWaterTemp_C: number;
}

export interface DHWTankParams {
  volume_L: number;
  resistivePower_kW: number;
  efficiency: number;
  lossCoeff_W_per_K: number;
  ambientTemp_C: number;
  targetTemp_C: number;
  initialTemp_C: number;
  /** Profil de puisage journalier (optionnel, par défaut aucun puisage) */
  drawProfile?: WaterDrawEvent[];
}

export const WATER_HEAT_CAPACITY_WH_PER_L_PER_K = 1.163;

/**
 * Modèle de ballon ECS (stockage thermique).
 * Inclut : chauffage électrique résistif, déperditions thermiques, et puisage d'eau chaude.
 */
export class DHWTank implements Device {
  public readonly id: string;

  public readonly label: string;

  public readonly capabilities = ['thermal-storage'] as const;

  private readonly params: DHWTankParams;

  private temp_C: number;

  private clock_s = 0;

  private dayIndex = 0;

  private processedDrawsToday = new Set<number>();

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

  private normalizeHour(time_s: number): number {
    const SECONDS_PER_DAY = 86400;
    const mod = ((time_s % SECONDS_PER_DAY) + SECONDS_PER_DAY) % SECONDS_PER_DAY;
    return mod / 3600;
  }

  private resetDayIfNeeded(time_s: number): void {
    const SECONDS_PER_DAY = 86400;
    const currentDay = Math.floor(time_s / SECONDS_PER_DAY);
    if (currentDay !== this.dayIndex) {
      this.dayIndex = currentDay;
      this.processedDrawsToday.clear();
    }
  }

  private applyWaterDraw(time_s: number): void {
    if (!this.params.drawProfile || this.params.drawProfile.length === 0) {
      return;
    }

    const currentHour = this.normalizeHour(time_s);

    for (let i = 0; i < this.params.drawProfile.length; i++) {
      const draw = this.params.drawProfile[i];

      // Si ce puisage a déjà été traité aujourd'hui, passer au suivant
      if (this.processedDrawsToday.has(i)) {
        continue;
      }

      // Vérifier si l'heure actuelle correspond au puisage (avec tolérance de 15 min = 0.25h)
      const timeDiff = Math.abs(currentHour - draw.hour);
      const tolerance = 0.25;

      if (timeDiff < tolerance) {
        // Appliquer le puisage : mélange eau chaude + eau froide
        const hotWaterDrawn_L = Math.min(draw.volume_L, this.params.volume_L);
        const coldWaterAdded_L = hotWaterDrawn_L;

        // Température après mélange (conservation de l'énergie thermique)
        const totalVolume = this.params.volume_L;
        const hotWaterRemaining_L = totalVolume - hotWaterDrawn_L;

        const newTemp = (this.temp_C * hotWaterRemaining_L + draw.coldWaterTemp_C * coldWaterAdded_L) / totalVolume;

        this.temp_C = Math.max(newTemp, this.params.ambientTemp_C);

        // Marquer ce puisage comme traité
        this.processedDrawsToday.add(i);
      }
    }
  }

  public apply(power_kW: number, dt_s: number, ctx: EnvContext): void {
    const time_s = ctx.time_s ?? this.clock_s;
    this.clock_s = time_s + dt_s;

    this.resetDayIfNeeded(time_s);

    // 1. Appliquer le puisage d'eau chaude si applicable
    this.applyWaterDraw(time_s);

    // 2. Appliquer le chauffage électrique
    const ambient = ctx.ambientTemp_C ?? this.params.ambientTemp_C;
    const energyGain_Wh = (power_kW * dt_s * this.params.efficiency * 1000) / 3600;
    const heatGain_C = energyGain_Wh / (WATER_HEAT_CAPACITY_WH_PER_L_PER_K * this.params.volume_L);

    // 3. Appliquer les déperditions thermiques
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
