import { DHWTank } from '../src/devices/DHWTank';
import type { EnvContext } from '../src/devices/Device';

const roundTo = (value: number, digits: number) => {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
};

describe('Physique ECS — montée en température', () => {
  it('suit la loi énergétique attendue', () => {
    const params = {
      volume_L: 300,
      resistivePower_kW: 2,
      efficiency: 0.98,
      lossCoeff_W_per_K: 0,
      ambientTemp_C: 20,
      targetTemp_C: 80,
      initialTemp_C: 30
    };
    const tank = new DHWTank('dhw', 'Ballon test', params);
    const dt_s = 900;
    const env: EnvContext = { pv_kW: 0, baseLoad_kW: 0, ambientTemp_C: params.ambientTemp_C };

    const stepsPerHour = Math.round(3600 / dt_s);
    const energyPerStep_Wh = (params.resistivePower_kW * dt_s * params.efficiency * 1000) / 3600;
    const deltaPerStep_C = energyPerStep_Wh / (1.163 * params.volume_L);

    let theoreticalTemp = params.initialTemp_C;

    for (let step = 1; step <= stepsPerHour * 2; step += 1) {
      tank.apply(params.resistivePower_kW, dt_s, env);
      theoreticalTemp += deltaPerStep_C;
      if (step === stepsPerHour || step === stepsPerHour * 2) {
        const measured = tank.state().temp_C as number;
        const tolerance = theoreticalTemp * 0.02;
        expect(Math.abs(measured - theoreticalTemp)).toBeLessThanOrEqual(tolerance);
      }
    }

    expect(roundTo(tank.state().temp_C as number, 2)).toBeGreaterThan(roundTo(params.initialTemp_C, 2));
  });
});
