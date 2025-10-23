import { DHWTank } from '../src/devices/DHWTank';
import type { EnvContext } from '../src/devices/Device';

describe('DHWTank - Puisage eau chaude', () => {
  it('refroidit le ballon lors d un puisage', () => {
    const tank = new DHWTank('tank1', 'Ballon ECS', {
      volume_L: 300,
      resistivePower_kW: 2.6,
      efficiency: 0.95,
      lossCoeff_W_per_K: 4,
      ambientTemp_C: 20,
      targetTemp_C: 55,
      initialTemp_C: 55,  // Ballon chaud au départ
      drawProfile: [
        { hour: 7.0, volume_L: 80, coldWaterTemp_C: 15 }  // Puisage matin
      ]
    });

    const ctx: EnvContext = { pv_kW: 0, baseLoad_kW: 0, time_s: 7 * 3600, ambientTemp_C: 20 };  // 7h du matin
    const dt_s = 900;  // 15 minutes

    // Température avant puisage
    expect(tank.temperature).toBe(55);

    // Simulation sans chauffage (power = 0) pour isoler l'effet du puisage
    tank.apply(0, dt_s, ctx);

    // Après le puisage de 80L à 15°C dans un ballon de 300L à 55°C
    // Température attendue (mélange) : (55 * 220 + 15 * 80) / 300 = (12100 + 1200) / 300 = 44.33°C
    const expectedTemp = (55 * 220 + 15 * 80) / 300;

    // On accepte une petite marge pour les déperditions thermiques
    expect(Math.abs(tank.temperature - expectedTemp)).toBeLessThan(0.5);
  });

  it('applique plusieurs puisages dans la journée', () => {
    const tank = new DHWTank('tank1', 'Ballon ECS', {
      volume_L: 300,
      resistivePower_kW: 2.6,
      efficiency: 0.95,
      lossCoeff_W_per_K: 4,
      ambientTemp_C: 20,
      targetTemp_C: 55,
      initialTemp_C: 55,
      drawProfile: [
        { hour: 7.0, volume_L: 80, coldWaterTemp_C: 15 },   // Matin
        { hour: 19.5, volume_L: 60, coldWaterTemp_C: 15 }  // Soir
      ]
    });

    const dt_s = 900;

    // Puisage du matin à 7h
    tank.apply(0, dt_s, { pv_kW: 0, baseLoad_kW: 0, time_s: 7 * 3600, ambientTemp_C: 20 });
    const tempAfterMorning = tank.temperature;

    // La température doit avoir baissé
    expect(tempAfterMorning).toBeLessThan(55);
    expect(tempAfterMorning).toBeGreaterThan(40);

    // Recharger le ballon
    tank.apply(2.6, 3600 * 4, { pv_kW: 0, baseLoad_kW: 0, time_s: 10 * 3600, ambientTemp_C: 20 });

    // Le ballon devrait être remonté proche de 55°C
    expect(tank.temperature).toBeGreaterThan(52);

    // Puisage du soir à 19h30
    tank.apply(0, dt_s, { pv_kW: 0, baseLoad_kW: 0, time_s: 19.5 * 3600, ambientTemp_C: 20 });

    // La température doit avoir à nouveau baissé
    expect(tank.temperature).toBeLessThan(52);
  });

  it('ne puise pas deux fois le même événement dans la même journée', () => {
    const tank = new DHWTank('tank1', 'Ballon ECS', {
      volume_L: 300,
      resistivePower_kW: 2.6,
      efficiency: 0.95,
      lossCoeff_W_per_K: 4,
      ambientTemp_C: 20,
      targetTemp_C: 55,
      initialTemp_C: 55,
      drawProfile: [
        { hour: 7.0, volume_L: 80, coldWaterTemp_C: 15 }
      ]
    });

    const dt_s = 900;

    // Premier passage à 7h - puisage doit avoir lieu
    tank.apply(0, dt_s, { pv_kW: 0, baseLoad_kW: 0, time_s: 7 * 3600, ambientTemp_C: 20 });
    const tempAfterFirstDraw = tank.temperature;
    expect(tempAfterFirstDraw).toBeLessThan(55);

    // Deuxième passage immédiat à 7h05 - pas de nouveau puisage
    tank.apply(0, dt_s, { pv_kW: 0, baseLoad_kW: 0, time_s: 7.083 * 3600, ambientTemp_C: 20 });
    const tempAfterSecondCall = tank.temperature;

    // Température ne devrait presque pas avoir changé (juste déperditions minimes)
    expect(Math.abs(tempAfterSecondCall - tempAfterFirstDraw)).toBeLessThan(0.2);
  });

  it('réinitialise les puisages chaque jour', () => {
    const tank = new DHWTank('tank1', 'Ballon ECS', {
      volume_L: 300,
      resistivePower_kW: 2.6,
      efficiency: 0.95,
      lossCoeff_W_per_K: 4,
      ambientTemp_C: 20,
      targetTemp_C: 55,
      initialTemp_C: 55,
      drawProfile: [
        { hour: 7.0, volume_L: 80, coldWaterTemp_C: 15 }
      ]
    });

    const dt_s = 900;

    // Jour 1 - puisage à 7h
    tank.apply(0, dt_s, { pv_kW: 0, baseLoad_kW: 0, time_s: 7 * 3600, ambientTemp_C: 20 });
    const tempDay1 = tank.temperature;

    // Remonter la température
    tank.apply(2.6, 3600, { pv_kW: 0, baseLoad_kW: 0, time_s: 10 * 3600, ambientTemp_C: 20 });
    expect(tank.temperature).toBeCloseTo(55, 0);

    // Jour 2 - puisage à 7h (7h + 24h = 31h)
    tank.apply(0, dt_s, { pv_kW: 0, baseLoad_kW: 0, time_s: (24 + 7) * 3600, ambientTemp_C: 20 });
    const tempDay2 = tank.temperature;

    // Les deux puisages doivent avoir eu le même effet
    expect(Math.abs(tempDay1 - tempDay2)).toBeLessThan(0.5);
  });
});
