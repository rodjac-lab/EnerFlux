import { runSimulation } from '../src/core/engine';
import type { Device, EnvContext, DevicePlan } from '../src/devices/Device';
import { resolveStrategy } from '../src/core/strategy';
import { PoolPump } from '../src/devices/PoolPump';
import { EVCharger } from '../src/devices/EVCharger';
import type { PoolPumpParams } from '../src/devices/PoolPump';
import type { EVChargerParams } from '../src/devices/EVCharger';

type HeatingState = {
  temp_C: number;
  target_C: number;
  comfort_lower_bound_C: number;
  call_for_heat: boolean;
};

class ScriptedHeating implements Device {
  public readonly id = 'heat';

  public readonly label = 'Chauffage scripté';

  public readonly capabilities = ['thermal-storage'] as const;

  private stepIndex = -1;

  public constructor(private readonly comfortPattern: boolean[]) {}

  public plan(_dt_s: number, _ctx: EnvContext): DevicePlan {
    return {};
  }

  public apply(_power_kW: number, _dt_s: number, _ctx: EnvContext): void {
    this.stepIndex += 1;
  }

  public state(): HeatingState & { heating_power_kW: number } {
    const index = Math.max(0, Math.min(this.stepIndex, this.comfortPattern.length - 1));
    const comfortable = this.comfortPattern[index];
    return {
      temp_C: comfortable ? 21 : 19.6,
      target_C: 21,
      comfort_lower_bound_C: 20.5,
      call_for_heat: !comfortable,
      heating_power_kW: comfortable ? 0 : 2
    };
  }
}

describe('multi-equipment KPIs', () => {
  it('computes the heating comfort ratio over the simulation horizon', () => {
    const dt_s = 3600;
    const steps = 4;
    const pv = new Array(steps).fill(0);
    const load = new Array(steps).fill(0);
    const heating = new ScriptedHeating([true, true, false, true]);
    const result = runSimulation({
      dt_s,
      pvSeries_kW: pv,
      baseLoadSeries_kW: load,
      devices: [heating],
      strategy: resolveStrategy('ecs_first')
    });
    expect(result.kpis.heating_comfort_ratio).toBeCloseTo(0.75, 5);
  });

  it('reports pool and EV completion ratios for the multi-equipment strategy', () => {
    const dt_s = 3600;
    const steps = 24;
    const pv = new Array(steps).fill(0);
    pv[10] = 1;
    pv[11] = 1;
    pv[18] = 6;
    const load = new Array(steps).fill(0);

    const poolParams: PoolPumpParams = {
      power_kW: 1,
      minHoursPerDay: 4,
      preferredWindows: [{ startHour: 10, endHour: 14 }],
      catchUpStartHour: 18
    };
    const pool = new PoolPump('pool', 'Piscine', poolParams);

    const evParams: EVChargerParams = {
      maxPower_kW: 6,
      session: {
        arrivalHour: 18,
        departureHour: 22,
        energyNeed_kWh: 12
      }
    };
    const ev = new EVCharger('ev', 'Borne VE', evParams);

    const result = runSimulation({
      dt_s,
      pvSeries_kW: pv,
      baseLoadSeries_kW: load,
      devices: [pool, ev],
      strategy: resolveStrategy('multi_equipment_priority')
    });

    expect(result.kpis.pool_filtration_completion).toBeCloseTo(0.5, 2);
    expect(result.kpis.ev_charge_completion).toBeCloseTo(0.5, 2);
    expect(result.kpis.heating_comfort_ratio).toBeNull();
  });
});
