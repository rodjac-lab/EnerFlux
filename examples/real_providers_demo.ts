/**
 * Démonstration des providers Phase 4 (APIs réelles).
 *
 * Ce fichier montre comment utiliser:
 * - DataProviderFactory avec différents modes
 * - OpenWeather + RTE Tempo (payant)
 * - PVGIS + RTE Tempo (gratuit)
 * - Fallback automatique
 *
 * **Usage**:
 * ```bash
 * # Mode Mock (pas d'API)
 * npx tsx examples/real_providers_demo.ts mock
 *
 * # Mode Free (PVGIS + RTE, gratuit)
 * npx tsx examples/real_providers_demo.ts free
 *
 * # Mode Real (OpenWeather + RTE, API key requise)
 * OPENWEATHER_API_KEY=your-key npx tsx examples/real_providers_demo.ts real
 * ```
 *
 * @module examples/real_providers_demo
 */

import { DataProviderFactory } from '../src/core/mpc';

async function main() {
  const mode = process.argv[2] || 'mock';
  const apiKey = process.env.OPENWEATHER_API_KEY;

  console.log('='.repeat(60));
  console.log('🌤️  EnerFlux - Data Providers Demo (Phase 4)');
  console.log('='.repeat(60));
  console.log(`Mode: ${mode.toUpperCase()}`);
  console.log('');

  // Configuration PV system
  const pvSystem = {
    peakPower_kWp: 6,
    efficiency: 0.75,
    tilt_deg: 30,
    azimuth_deg: 180
  };

  const location = '48.8566,2.3522'; // Paris
  const startDate = '2025-03-17'; // Week start date

  let provider;

  // Create provider based on mode
  if (mode === 'mock') {
    console.log('📦 Using Mock Providers (deterministic presets)');
    console.log('   - Weather: sunny-week preset (202 kWh)');
    console.log('   - Tariff: tempo-spring preset (mostly BLUE, 1 RED)');
    console.log('');

    provider = DataProviderFactory.createMock();
  } else if (mode === 'free') {
    console.log('🆓 Using Free Providers (PVGIS + RTE Tempo)');
    console.log('   - Weather: PVGIS Typical Meteorological Year');
    console.log('   - Tariff: RTE Tempo Official API');
    console.log('   - Location: Paris (48.8566°N, 2.3522°E)');
    console.log('   - PV System: 6 kWp, 30° tilt, South-facing');
    console.log('');

    provider = DataProviderFactory.createFree(pvSystem, location);
  } else if (mode === 'real') {
    if (!apiKey) {
      console.error('❌ Error: OPENWEATHER_API_KEY environment variable required for real mode');
      console.log('');
      console.log('Usage:');
      console.log('  OPENWEATHER_API_KEY=your-key npx tsx examples/real_providers_demo.ts real');
      process.exit(1);
    }

    console.log('☁️  Using Real Providers (OpenWeather + RTE Tempo)');
    console.log('   - Weather: OpenWeather Solar Irradiance API');
    console.log('   - Tariff: RTE Tempo Official API');
    console.log('   - Location: Paris (48.8566°N, 2.3522°E)');
    console.log('   - PV System: 6 kWp, 30° tilt, South-facing');
    console.log('');

    provider = DataProviderFactory.createReal(apiKey, pvSystem, location);
  } else {
    console.error(`❌ Unknown mode: ${mode}`);
    console.log('Available modes: mock, free, real');
    process.exit(1);
  }

  // Fetch forecast
  console.log('🔄 Fetching weekly forecast...');
  console.log('');

  try {
    const forecast = await provider.fetchWeeklyForecast(startDate, {
      location: mode === 'mock' ? 'sunny-week' : location,
      tariffType: 'tempo'
    });

    console.log('✅ Forecast retrieved successfully!');
    console.log('');

    // Display weather summary
    console.log('📅 Weekly Weather Forecast:');
    console.log('─'.repeat(60));

    for (const day of forecast.weather) {
      const dateStr = new Date(day.date).toLocaleDateString('fr-FR', {
        weekday: 'short',
        day: '2-digit',
        month: 'short'
      });
      console.log(
        `${day.icon}  ${dateStr}  ${day.description.padEnd(30)} ${day.pvTotal_kWh.toFixed(1)} kWh`
      );
    }

    const totalPV = forecast.weather.reduce((sum, d) => sum + d.pvTotal_kWh, 0);
    console.log('─'.repeat(60));
    console.log(`   Total PV Production: ${totalPV.toFixed(1)} kWh`);
    console.log('');

    // Display tariff summary
    console.log('💶 Weekly Tariff Schedule (Tempo):');
    console.log('─'.repeat(60));

    for (const day of forecast.tariffs) {
      const dateStr = new Date(day.date).toLocaleDateString('fr-FR', {
        weekday: 'short',
        day: '2-digit',
        month: 'short'
      });

      const colorIcon = day.tempoColor === 'BLUE' ? '🔵' : day.tempoColor === 'WHITE' ? '⚪' : '🔴';
      const colorName = day.tempoColor?.padEnd(6) || 'N/A   ';
      const peakPrice = day.peakPrice_eur_kWh.toFixed(4);

      console.log(`${colorIcon}  ${dateStr}  ${colorName}  HP: ${peakPrice} €/kWh`);
    }

    const redDays = forecast.tariffs.filter((t) => t.tempoColor === 'RED').length;
    console.log('─'.repeat(60));
    console.log(`   RED Days: ${redDays}/7 (expensive!)`);
    console.log('');

    // Display sample hourly data for first day
    console.log('🔬 Sample Hourly Data (Day 1):');
    console.log('─'.repeat(60));

    const day1 = forecast.weather[0];
    const tariff1 = forecast.tariffs[0];

    console.log('Hour | PV (kW) | Temp (°C) | Price (€/kWh)');
    console.log('─'.repeat(60));

    for (let h = 0; h < 24; h += 3) {
      // Sample every 3 hours
      const pvPower = day1.pvProfile_kW[h].toFixed(2).padStart(5);
      const temp = day1.ambientTempProfile_C[h].toFixed(1).padStart(4);
      const price = tariff1.importPriceSeries_eur_kWh[h].toFixed(4);

      console.log(`${String(h).padStart(2)}h  | ${pvPower}   | ${temp}     | ${price}`);
    }

    console.log('');
    console.log('✨ Demo completed successfully!');
    console.log('');
    console.log('Next steps:');
    console.log('  - Run weekly simulation with MPC strategy');
    console.log('  - Generate AI narrative insights');
    console.log('  - Compare vs baseline (no forecast)');
    console.log('');
  } catch (error) {
    console.error('❌ Error fetching forecast:', error);
    console.log('');

    if (mode === 'real') {
      console.log('Possible causes:');
      console.log('  - Invalid OpenWeather API key');
      console.log('  - Rate limit exceeded');
      console.log('  - Network error');
      console.log('');
      console.log('Try free mode instead:');
      console.log('  npx tsx examples/real_providers_demo.ts free');
    }

    process.exit(1);
  }
}

main().catch(console.error);
