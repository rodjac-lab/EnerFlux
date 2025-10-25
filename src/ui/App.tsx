import React, { useEffect, useState } from 'react';
import ScenarioPanel from './panels/ScenarioPanel';
import AssetsPanel from './panels/AssetsPanel';
import StrategyPanel, { StrategySelection } from './panels/StrategyPanel';
import CompareAB from './compare/CompareAB';
import TariffPanel from './panels/TariffPanel';
import HeatingPanel from './panels/HeatingPanel';
import PoolPanel from './panels/PoolPanel';
import EVPanel from './panels/EVPanel';
import CollapsibleCard from './components/CollapsibleCard';
import EnergyFlowsView from './EnergyFlowsView';
import type { BatteryParams } from '../devices/Battery';
import type { DHWTankParams } from '../devices/DHWTank';
import type { Tariffs, StepFlows } from '../data/types';
import type { ExportV1 } from '../types/export';
import { getScenario, PresetId } from '../data/scenarios';
import { cloneTariffs } from '../data/tariffs';
import type { EcsServiceContract } from '../data/ecs-service';
import { defaultEcsServiceContract } from '../data/ecs-service';
import { defaultPoolParams, defaultEVParams, defaultHeatingParams } from '../devices/registry';
import type { PoolFormState, HeatingFormState, EVFormState } from './types';
import { clonePoolFormState, cloneEvFormState } from './types';

const App: React.FC = () => {
  const initialScenario = getScenario(PresetId.EteEnsoleille);
  const [scenarioId, setScenarioId] = useState<PresetId>(PresetId.EteEnsoleille);
  const [dt_s, setDt] = useState<number>(initialScenario.dt);
  const [batteryParams, setBatteryParams] = useState<BatteryParams>({
    ...initialScenario.defaults.batteryConfig
  });
  const [dhwParams, setDhwParams] = useState<DHWTankParams>({
    ...initialScenario.defaults.ecsConfig
  });
  const [pool, setPool] = useState<PoolFormState>(() => {
    const config = initialScenario.defaults.poolConfig;
    if (config) {
      return {
        enabled: config.enabled,
        params: { ...config.params, preferredWindows: config.params.preferredWindows.map((win) => ({ ...win })) }
      };
    }
    return {
      enabled: false,
      params: defaultPoolParams()
    };
  });
  const [ev, setEv] = useState<EVFormState>(() => {
    const config = initialScenario.defaults.evConfig;
    if (config) {
      return cloneEvFormState(config);
    }
    return {
      enabled: false,
      params: defaultEVParams()
    };
  });
  const [heating, setHeating] = useState<HeatingFormState>(() => {
    const defaults = initialScenario.defaults.heatingConfig;
    if (defaults) {
      return {
        enabled: defaults.enabled,
        params: { ...defaults.params }
      };
    }
    return {
      enabled: false,
      params: defaultHeatingParams()
    };
  });
  const [strategyA, setStrategyA] = useState<StrategySelection>({ id: 'ecs_hysteresis' });
  const [strategyB, setStrategyB] = useState<StrategySelection>({ id: 'multi_equipment_priority' });
  const [tariffs, setTariffs] = useState<Tariffs>(cloneTariffs(initialScenario.tariffs));
  const [ecsService, setEcsService] = useState<EcsServiceContract>(() => {
    const defaults = defaultEcsServiceContract();
    return {
      ...defaults,
      helpers: { ...defaults.helpers },
      targetCelsius: initialScenario.defaults.ecsConfig.targetTemp_C
    };
  });
  const [activeTab, setActiveTab] = useState<'overview' | 'energy-flows' | 'advanced'>('overview');
  const [simulationExport, setSimulationExport] = useState<ExportV1 | null>(null);
  const [flowsA, setFlowsA] = useState<StepFlows[] | null>(null);
  const [flowsB, setFlowsB] = useState<StepFlows[] | null>(null);

  useEffect(() => {
    const scenario = getScenario(scenarioId);
    setDt(scenario.dt);
    setBatteryParams({ ...scenario.defaults.batteryConfig });
    setDhwParams({ ...scenario.defaults.ecsConfig });
    setPool(() => {
      const config = scenario.defaults.poolConfig;
      if (config) {
        return {
          enabled: config.enabled,
          params: { ...config.params, preferredWindows: config.params.preferredWindows.map((win) => ({ ...win })) }
        };
      }
      return {
        enabled: false,
        params: defaultPoolParams()
      };
    });
    setEv(() => {
      const config = scenario.defaults.evConfig;
      if (config) {
        return cloneEvFormState(config);
      }
      return {
        enabled: false,
        params: defaultEVParams()
      };
    });
    setHeating(() => {
      const defaults = scenario.defaults.heatingConfig;
      if (defaults) {
        return {
          enabled: defaults.enabled,
          params: { ...defaults.params }
        };
      }
      return {
        enabled: false,
        params: defaultHeatingParams()
      };
    });
    setTariffs(cloneTariffs(scenario.tariffs));
    setEcsService(() => {
      const defaults = defaultEcsServiceContract();
      return {
        ...defaults,
        helpers: { ...defaults.helpers },
        targetCelsius: scenario.defaults.ecsConfig.targetTemp_C
      };
    });
  }, [scenarioId]);

  const handleStrategyChange = (label: 'A' | 'B', selection: StrategySelection) => {
    if (label === 'A') {
      setStrategyA(selection);
    } else {
      setStrategyB(selection);
    }
  };

  return (
    <div className="min-h-screen bg-slate-100">
      <main className="mx-auto max-w-7xl space-y-6 p-6">
        <header className="space-y-2">
          <h1 className="text-2xl font-bold text-slate-900">EnerFlux — Laboratoire d’autoconsommation</h1>
          <p className="text-sm text-slate-600">
            Ajustez vos équipements et comparez deux stratégies de pilotage pour maximiser l’usage de votre production solaire.
          </p>
        </header>
        <section className="space-y-6">
          <div className="border-b border-slate-200">
            <nav className="flex gap-6" aria-label="Navigation principale">
              <button
                type="button"
                onClick={() => setActiveTab('overview')}
                id="tab-button-overview"
                aria-controls="tab-overview"
                className={`-mb-px border-b-2 pb-2 text-sm font-medium transition-colors ${
                  activeTab === 'overview'
                    ? 'border-indigo-500 text-slate-900'
                    : 'border-transparent text-slate-500 hover:text-slate-700'
                }`}
                aria-selected={activeTab === 'overview'}
              >
                Simulation
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('energy-flows')}
                id="tab-button-energy-flows"
                aria-controls="tab-energy-flows"
                className={`-mb-px border-b-2 pb-2 text-sm font-medium transition-colors ${
                  activeTab === 'energy-flows'
                    ? 'border-indigo-500 text-slate-900'
                    : 'border-transparent text-slate-500 hover:text-slate-700'
                }`}
                aria-selected={activeTab === 'energy-flows'}
              >
                Flux énergétiques
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('advanced')}
                id="tab-button-advanced"
                aria-controls="tab-advanced"
                className={`-mb-px border-b-2 pb-2 text-sm font-medium transition-colors ${
                  activeTab === 'advanced'
                    ? 'border-indigo-500 text-slate-900'
                    : 'border-transparent text-slate-500 hover:text-slate-700'
                }`}
                aria-selected={activeTab === 'advanced'}
              >
                Paramètres avancés
              </button>
            </nav>
          </div>
          <div className="space-y-6">
            <div
              id="tab-overview"
              role="tabpanel"
              aria-labelledby="tab-button-overview"
              aria-hidden={activeTab !== 'overview'}
              className={`space-y-6 ${activeTab === 'overview' ? '' : 'hidden'}`}
            >
              <div className="grid gap-6 lg:grid-cols-2">
                <ScenarioPanel
                  variant="compact"
                  scenarioId={scenarioId}
                  dt_s={dt_s}
                  onScenarioChange={setScenarioId}
                  onDtChange={setDt}
                />
                <StrategyPanel
                  variant="compact"
                  strategyA={strategyA}
                  strategyB={strategyB}
                  onChange={handleStrategyChange}
                />
              </div>
              <CompareAB
                scenarioId={scenarioId}
                dt_s={dt_s}
                battery={batteryParams}
                dhw={dhwParams}
                pool={pool}
                ev={ev}
                heating={heating}
                ecsService={ecsService}
                tariffs={tariffs}
                strategyA={strategyA}
                strategyB={strategyB}
                onExportReady={setSimulationExport}
                onFlowsReady={(fA, fB) => {
                  setFlowsA(fA);
                  setFlowsB(fB);
                }}
              />
            </div>
            <div
              id="tab-energy-flows"
              role="tabpanel"
              aria-labelledby="tab-button-energy-flows"
              aria-hidden={activeTab !== 'energy-flows'}
              className={`space-y-6 ${activeTab === 'energy-flows' ? '' : 'hidden'}`}
            >
              <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
                <div className="space-y-4">
                  <div>
                    <h2 className="text-lg font-semibold text-slate-900">Visualisation des flux énergétiques</h2>
                    <p className="text-sm text-slate-600 mt-2">
                      Cette section affiche les flux d'énergie entre les différents composants du système (PV, batterie, ECS, réseau)
                      pour les deux stratégies A et B.
                    </p>
                  </div>

                  {simulationExport ? (
                    <EnergyFlowsView
                      trace={simulationExport}
                      flowsA={flowsA ?? undefined}
                      flowsB={flowsB ?? undefined}
                    />
                  ) : (
                    <div className="rounded-lg border border-slate-200 bg-slate-50 p-8 text-center">
                      <p className="text-sm text-slate-500">
                        Lancez une simulation dans l'onglet "Simulation" pour visualiser les flux énergétiques.
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
            <div
              id="tab-advanced"
              role="tabpanel"
              aria-labelledby="tab-button-advanced"
              aria-hidden={activeTab !== 'advanced'}
              className={`space-y-6 ${activeTab === 'advanced' ? '' : 'hidden'}`}
            >
              <AssetsPanel
                battery={batteryParams}
                dhw={dhwParams}
                ecsService={ecsService}
                onBatteryChange={setBatteryParams}
                onDhwChange={setDhwParams}
                onEcsServiceChange={setEcsService}
              />
              <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                <TariffPanel tariffs={tariffs} onChange={setTariffs} />
                <HeatingPanel heating={heating} onChange={setHeating} />
                <PoolPanel pool={pool} onChange={setPool} />
                <EVPanel ev={ev} onChange={setEv} />
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
};

export default App;

