import React, { useState, useEffect } from 'react';
import type { BatteryParams } from '../../devices/Battery';
import type { DHWTankParams } from '../../devices/DHWTank';
import type { PoolFormState, HeatingFormState, EVFormState } from '../types';
import type { EcsServiceContract } from '../../data/ecs-service';
import type { Tariffs } from '../../data/types';
import type {
  WeeklySimulationInput,
  WeeklySimulationResult,
  WeeklyComparisonResult,
  MPCStrategy,
  MPCStrategyId,
  DataProvider,
  WeeklyForecast,
  WeeklyNarrative,
  PVSystemConfig
} from '../../core/mpc';
import {
  runWeeklySimulation,
  compareWeeklySimulations,
  resolveMPCStrategy,
  generateWeeklyNarrative,
  DataProviderFactory,
  mpcToReactiveStrategy
} from '../../core/mpc';
import { Battery } from '../../devices/Battery';
import { DHWTank } from '../../devices/DHWTank';
import { PoolPump } from '../../devices/PoolPump';
import { EVCharger } from '../../devices/EVCharger';
import { Heating } from '../../devices/Heating';
import { ecsFirstStrategy } from '../../core/strategy';
import WeekCalendar from './WeekCalendar';
import WeeklyKPICards from './WeeklyKPICards';
import NarrativeCards from './NarrativeCards';
import WeeklyComparisonChart from './WeeklyComparisonChart';

interface CoachViewProps {
  battery: BatteryParams;
  dhw: DHWTankParams;
  pool: PoolFormState;
  ev: EVFormState;
  heating: HeatingFormState;
  ecsService: EcsServiceContract;
  tariffs: Tariffs;
  dt_s: number;
}

type DataProviderMode = 'auto' | 'mock' | 'free' | 'paid';

// French cities with coordinates for weather APIs
const FRENCH_CITIES = [
  { name: 'Paris', coords: '48.8566,2.3522' },
  { name: 'Marseille', coords: '43.2965,5.3698' },
  { name: 'Lyon', coords: '45.7640,4.8357' },
  { name: 'Toulouse', coords: '43.6047,1.4442' },
  { name: 'Nice', coords: '43.7102,7.2620' },
  { name: 'Nantes', coords: '47.2184,-1.5536' },
  { name: 'Strasbourg', coords: '48.5734,7.7521' },
  { name: 'Montpellier', coords: '43.6108,3.8767' },
  { name: 'Bordeaux', coords: '44.8378,-0.5792' },
  { name: 'Lille', coords: '50.6292,3.0573' },
  { name: 'Rennes', coords: '48.1173,-1.6778' },
  { name: 'Reims', coords: '49.2583,4.0317' },
  { name: 'Le Havre', coords: '49.4944,0.1079' },
  { name: 'Saint-Étienne', coords: '45.4397,4.3872' },
  { name: 'Toulon', coords: '43.1242,5.9280' },
  { name: 'Grenoble', coords: '45.1885,5.7245' },
  { name: 'Dijon', coords: '47.3220,5.0415' },
  { name: 'Angers', coords: '47.4784,-0.5632' },
  { name: 'Nîmes', coords: '43.8367,4.3601' },
  { name: 'Villeurbanne', coords: '45.7667,4.8833' }
] as const;

const CoachView: React.FC<CoachViewProps> = ({
  battery,
  dhw,
  pool,
  ev,
  heating,
  ecsService,
  tariffs,
  dt_s
}) => {
  // Mode Coach state (isolated from Mode Labo)
  const [mpcStrategyId, setMpcStrategyId] = useState<MPCStrategyId>('mpc_balanced');
  const [dataProviderMode, setDataProviderMode] = useState<DataProviderMode>('auto');
  const [actualProviderUsed, setActualProviderUsed] = useState<string | null>(null);
  const [pvSystem, setPvSystem] = useState<PVSystemConfig>({
    peakPower_kWp: 6.0,
    efficiency: 0.75
  });
  const [selectedCity, setSelectedCity] = useState<string>('Paris');
  const [location, setLocation] = useState<string>('48.8566,2.3522'); // Paris par défaut
  const [apiKey, setApiKey] = useState<string>(''); // OpenWeather API key (paid mode)

  // Simulation state
  const [forecast, setForecast] = useState<WeeklyForecast | null>(null);
  const [weeklyResult, setWeeklyResult] = useState<WeeklySimulationResult | null>(null);
  const [comparisonResult, setComparisonResult] = useState<WeeklyComparisonResult | null>(null);
  const [narrative, setNarrative] = useState<WeeklyNarrative | null>(null);
  const [selectedDay, setSelectedDay] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Animation state
  const [showAnimation, setShowAnimation] = useState(false);

  /**
   * Run weekly simulation with MPC strategy
   */
  const runSimulation = async () => {
    setIsLoading(true);
    setError(null);
    setShowAnimation(false);

    try {
      // 1. Create data provider with auto-detection
      let provider: DataProvider;
      let providerName: string;

      if (dataProviderMode === 'auto') {
        // Auto mode: Try free → mock fallback
        try {
          provider = DataProviderFactory.createFree(pvSystem, location);
          providerName = 'PVGIS + RTE Tempo (gratuit)';
          console.log('[Auto] Using free providers (PVGIS + RTE)');
        } catch (error) {
          console.warn('[Auto] Free providers failed, fallback to mock:', error);
          const { MockDataProvider } = await import('../../data/providers');
          provider = new MockDataProvider();
          providerName = 'Mock (fallback)';
        }
      } else if (dataProviderMode === 'mock') {
        const { MockDataProvider } = await import('../../data/providers');
        provider = new MockDataProvider();
        providerName = 'Mock (test)';
      } else if (dataProviderMode === 'free') {
        provider = DataProviderFactory.createFree(pvSystem, location);
        providerName = 'PVGIS + RTE Tempo';
      } else {
        // paid mode
        if (!apiKey) {
          throw new Error('Clé API OpenWeather requise pour le mode payant');
        }
        provider = DataProviderFactory.createReal(apiKey, pvSystem, location);
        providerName = 'OpenWeather + RTE Tempo';
      }

      setActualProviderUsed(providerName);

      // 2. Fetch weekly forecast
      const today = new Date().toISOString().split('T')[0];
      const weeklyForecast = await provider.fetchWeeklyForecast(today, {
        location: (dataProviderMode === 'mock' || providerName.includes('Mock')) ? 'sunny-week' : location,
        tariffType: 'tempo'
      });

      setForecast(weeklyForecast);

      // 3. Build device instances
      const devices = [
        new Battery('battery', 'Batterie', {
          capacity_kWh: battery.capacity_kWh,
          pMax_kW: battery.pMax_kW,
          etaCharge: battery.etaCharge,
          etaDischarge: battery.etaDischarge,
          socInit_kWh: battery.socInit_kWh,
          socMin_kWh: battery.socMin_kWh,
          socMax_kWh: battery.socMax_kWh
        }),
        new DHWTank('dhw', 'Ballon ECS', {
          volume_L: dhw.volume_L,
          resistivePower_kW: dhw.resistivePower_kW,
          efficiency: dhw.efficiency,
          lossCoeff_W_per_K: dhw.lossCoeff_W_per_K,
          ambientTemp_C: dhw.ambientTemp_C,
          targetTemp_C: dhw.targetTemp_C,
          initialTemp_C: dhw.initialTemp_C
        })
      ];

      if (pool.enabled) {
        devices.push(new PoolPump('pool', 'Piscine', pool.params));
      }
      if (ev.enabled) {
        devices.push(new EVCharger('ev', 'VE', ev.params));
      }
      if (heating.enabled) {
        devices.push(new Heating('heating', 'Chauffage', heating.params));
      }

      // 4. Resolve MPC strategy
      const mpcStrategy: MPCStrategy = resolveMPCStrategy(mpcStrategyId);

      // 5. Run MPC simulation
      const inputMPC: WeeklySimulationInput = {
        dt_s,
        forecast: weeklyForecast,
        devices,
        mpcStrategy,
        baseLoadProfile: 'residential',
        ecsService: {
          mode: ecsService.mode,
          deadlineHour: ecsService.deadlineHour,
          targetCelsius: ecsService.targetCelsius
        }
      };

      const resultMPC = runWeeklySimulation(inputMPC);
      setWeeklyResult(resultMPC);

      // 6. Run baseline simulation (ecs_first strategy)
      const inputBaseline: WeeklySimulationInput = {
        ...inputMPC,
        mpcStrategy: mpcToReactiveStrategy(ecsFirstStrategy)
      };

      const resultBaseline = runWeeklySimulation(inputBaseline);

      // 7. Compare results
      const comparison = compareWeeklySimulations(resultMPC, resultBaseline);
      setComparisonResult(comparison);

      // 8. Generate AI narrative
      const weeklyNarrative = generateWeeklyNarrative(resultMPC, {
        includeComparison: true,
        detailLevel: 'normal'
      });
      setNarrative(weeklyNarrative);

      // 9. Reset and trigger animation
      // IMPORTANT: Reset to false first to force remount of animated elements
      setShowAnimation(false);
      setTimeout(() => setShowAnimation(true), 50);
    } catch (err) {
      console.error('Erreur simulation Mode Coach:', err);
      setError(err instanceof Error ? err.message : 'Erreur inconnue');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <header className="space-y-2">
        <h2 className="text-xl font-bold text-text">Mode Coach Prédictif 🧭</h2>
        <p className="text-sm text-text-secondary">
          Simulez votre semaine à venir avec prévisions météo réelles et conseils IA pour optimiser votre autoconsommation.
        </p>
      </header>

      {/* Configuration Panel */}
      <section className="rounded-lg border border-border bg-surface p-6 shadow-sm">
        <h3 className="mb-4 text-sm font-semibold text-text">Configuration de la simulation</h3>
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {/* MPC Strategy Selector */}
          <div>
            <label htmlFor="mpc-strategy" className="block text-sm font-medium text-text">
              Stratégie MPC
              <span className="ml-1 cursor-help text-muted" title="Choisissez comment l'IA anticipe les prévisions météo et tarifs">
                ⓘ
              </span>
            </label>
            <select
              id="mpc-strategy"
              value={mpcStrategyId}
              onChange={(e) => setMpcStrategyId(e.target.value as MPCStrategyId)}
              className="mt-1 block w-full rounded-md border border-border px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            >
              <option value="mpc_balanced">Équilibrée (recommandé)</option>
              <option value="mpc_sunny_tomorrow">Soleil demain — Priorité ECS si demain ≥20 kWh PV</option>
              <option value="mpc_cloudy_tomorrow">Nuageux demain — Priorité batterie si demain ≤10 kWh PV</option>
              <option value="mpc_tempo_red_guard">Garde Tempo Rouge — Réserve batterie 90% si demain = ROUGE</option>
            </select>
            <p className="mt-1 text-xs text-muted">
              {mpcStrategyId === 'mpc_sunny_tomorrow' && '☀️ Chauffe l\'ECS maintenant si demain ensoleillé (≥20 kWh PV prévu)'}
              {mpcStrategyId === 'mpc_cloudy_tomorrow' && '☁️ Charge la batterie maintenant si demain nuageux (≤10 kWh PV prévu)'}
              {mpcStrategyId === 'mpc_tempo_red_guard' && '🔴 Remplit la batterie (90%) si demain Tempo ROUGE (0.76€/kWh)'}
              {mpcStrategyId === 'mpc_balanced' && '⚖️ Équilibre entre les 3 heuristiques selon contexte'}
            </p>
          </div>

          {/* Data Provider Mode */}
          <div>
            <label htmlFor="provider-mode" className="block text-sm font-medium text-text">
              Source de données
              <span className="ml-1 cursor-help text-muted" title="Auto détecte automatiquement les APIs disponibles avec fallback">
                ⓘ
              </span>
            </label>
            <select
              id="provider-mode"
              value={dataProviderMode}
              onChange={(e) => setDataProviderMode(e.target.value as DataProviderMode)}
              className="mt-1 block w-full rounded-md border border-border px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            >
              <option value="auto">🤖 Auto (recommandé)</option>
              <option value="free">🌍 Gratuit (PVGIS + RTE Tempo)</option>
              <option value="paid">💳 Payant (OpenWeather + RTE)</option>
              <option value="mock">🧪 Test (données simulées)</option>
            </select>
            <p className="mt-1 text-xs text-muted">
              {dataProviderMode === 'auto' && '🤖 Essaye APIs gratuites, fallback sur mock si échec'}
              {dataProviderMode === 'free' && '🌍 PVGIS (météo EU) + RTE Tempo officiel (100% gratuit)'}
              {dataProviderMode === 'paid' && '💳 OpenWeather (15j précision) + RTE Tempo (requiert clé API)'}
              {dataProviderMode === 'mock' && '🧪 Presets déterministes pour tests'}
            </p>
            {actualProviderUsed && (
              <div className="mt-2 inline-flex items-center rounded-full bg-green-50 px-2 py-1 text-xs font-medium text-green-700">
                ✓ Utilisé : {actualProviderUsed}
              </div>
            )}
          </div>

          {/* Location - City Selector */}
          <div>
            <label htmlFor="city" className="block text-sm font-medium text-text">
              Localisation
            </label>
            <select
              id="city"
              value={selectedCity}
              onChange={(e) => {
                const city = FRENCH_CITIES.find(c => c.name === e.target.value);
                if (city) {
                  setSelectedCity(city.name);
                  setLocation(city.coords);
                }
              }}
              className="mt-1 block w-full rounded-md border border-border px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              disabled={dataProviderMode === 'mock'}
            >
              {FRENCH_CITIES.map((city) => (
                <option key={city.name} value={city.name}>
                  {city.name}
                </option>
              ))}
            </select>
            <p className="mt-1 text-xs text-muted">
              📍 {location}
            </p>
          </div>

          {/* PV Peak Power */}
          <div>
            <label htmlFor="pv-peak" className="block text-sm font-medium text-text">
              Puissance crête PV (kWc)
            </label>
            <input
              type="number"
              id="pv-peak"
              value={pvSystem.peakPower_kWp}
              onChange={(e) => setPvSystem({ ...pvSystem, peakPower_kWp: parseFloat(e.target.value) || 6 })}
              step="0.1"
              min="1"
              max="20"
              className="mt-1 block w-full rounded-md border border-border px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
          </div>

          {/* API Key (only for paid mode) */}
          {dataProviderMode === 'paid' && (
            <div>
              <label htmlFor="api-key" className="block text-sm font-medium text-text">
                Clé API OpenWeather
              </label>
              <input
                type="password"
                id="api-key"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="Votre clé API"
                className="mt-1 block w-full rounded-md border border-border px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>
          )}

          {/* Run Button */}
          <div className="flex items-end">
            <button
              type="button"
              onClick={runSimulation}
              disabled={isLoading}
              className="w-full rounded-md bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:ring-offset-2 disabled:cursor-not-allowed disabled:bg-slate-300"
            >
              {isLoading ? 'Simulation en cours...' : 'Lancer la simulation'}
            </button>
          </div>
        </div>

        {/* Error Display */}
        {error && (
          <div className="mt-4 rounded-md border border-red-200 bg-red-50 p-3">
            <p className="text-sm text-red-800">{error}</p>
          </div>
        )}
      </section>

      {/* Results Section (with Plotset-style animations) */}
      {weeklyResult && forecast && narrative && comparisonResult && (
        <div className={`space-y-6 ${showAnimation ? 'animate-in' : 'opacity-0'}`}>
          {/* Week Calendar */}
          <WeekCalendar
            forecast={forecast}
            selectedDay={selectedDay}
            onDayClick={setSelectedDay}
            showAnimation={showAnimation}
          />

          {/* Weekly Comparison Chart (Plotset-style) */}
          <WeeklyComparisonChart
            key={mpcStrategyId} // Force remount on strategy change
            baselineData={comparisonResult.baseline.days}
            mpcData={comparisonResult.mpc.days}
            totalSavings_eur={comparisonResult.gains.costReduction_eur}
            showAnimation={showAnimation}
          />

          {/* Weekly KPIs */}
          <WeeklyKPICards
            kpis={weeklyResult.weeklyKPIs}
            showAnimation={showAnimation}
          />

          {/* AI Narrative */}
          <NarrativeCards
            narrative={narrative}
            showAnimation={showAnimation}
          />

          {/* Daily Detail Chart (if day selected) */}
          {selectedDay !== null && (
            <section className="rounded-lg border border-border bg-surface p-6 shadow-sm">
              <h3 className="mb-4 text-sm font-semibold text-text">
                Détail du jour {selectedDay + 1} — {forecast.weather[selectedDay].date}
              </h3>
              <p className="text-sm text-muted">
                Graphiques détaillés à implémenter (réutilisation de ChartFrame + BatterySocChart + DhwPanel)
              </p>
            </section>
          )}
        </div>
      )}

      {/* Empty State */}
      {!weeklyResult && !isLoading && (
        <div className="rounded-lg border border-border bg-surface p-12 text-center">
          <p className="text-sm text-muted">
            Configurez vos paramètres et lancez la simulation pour découvrir les conseils de votre coach IA.
          </p>
        </div>
      )}
    </div>
  );
};

export default CoachView;
