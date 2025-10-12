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
import type { BatteryParams } from '../devices/Battery';
import type { DHWTankParams } from '../devices/DHWTank';
import type { Tariffs } from '../data/types';
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
  const [activeTab, setActiveTab] = useState<'overview' | 'advanced'>('overview');

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
          <ScenarioPanel
            variant="horizontal"
            scenarioId={scenarioId}
            dt_s={dt_s}
            onScenarioChange={setScenarioId}
            onDtChange={setDt}
          />
          <div className="border-b border-slate-200">
            <nav className="flex gap-6" aria-label="Navigation principale">
              <button
                type="button"
                onClick={() => setActiveTab('overview')}
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
                onClick={() => setActiveTab('advanced')}
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
          {activeTab === 'overview' ? (
            <div className="space-y-6">
              <StrategyPanel strategyA={strategyA} strategyB={strategyB} onChange={handleStrategyChange} />
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
              />
            </div>
          ) : (
            <div className="space-y-6">
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
          )}
        </section>
      </main>
    </div>
  );
};

export default App;

