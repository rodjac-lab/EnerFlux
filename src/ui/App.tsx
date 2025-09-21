import React, { useEffect, useState } from 'react';
import ScenarioPanel from './panels/ScenarioPanel';
import AssetsPanel from './panels/AssetsPanel';
import StrategyPanel, { StrategySelection } from './panels/StrategyPanel';
import CompareAB from './compare/CompareAB';
import TariffPanel from './panels/TariffPanel';
import type { BatteryParams } from '../devices/Battery';
import type { DHWTankParams } from '../devices/DHWTank';
import type { Tariffs } from '../data/types';
import { getScenario, PresetId } from '../data/scenarios';
import { cloneTariffs } from '../data/tariffs';
import type { EcsServiceConfig } from '../data/ecs-service';
import { defaultEcsServiceConfig } from '../data/ecs-service';

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
  const [strategyA, setStrategyA] = useState<StrategySelection>({ id: 'ecs_first' });
  const [strategyB, setStrategyB] = useState<StrategySelection>({ id: 'battery_first' });
  const [tariffs, setTariffs] = useState<Tariffs>(cloneTariffs(initialScenario.tariffs));
  const [ecsService, setEcsService] = useState<EcsServiceConfig>(() => {
    const defaults = defaultEcsServiceConfig();
    defaults.target_C = initialScenario.defaults.ecsConfig.targetTemp_C;
    return defaults;
  });

  useEffect(() => {
    const scenario = getScenario(scenarioId);
    setDt(scenario.dt);
    setBatteryParams({ ...scenario.defaults.batteryConfig });
    setDhwParams({ ...scenario.defaults.ecsConfig });
    setTariffs(cloneTariffs(scenario.tariffs));
    setEcsService(() => {
      const defaults = defaultEcsServiceConfig();
      defaults.target_C = scenario.defaults.ecsConfig.targetTemp_C;
      return defaults;
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
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="lg:col-span-1 space-y-6">
            <ScenarioPanel scenarioId={scenarioId} dt_s={dt_s} onScenarioChange={setScenarioId} onDtChange={setDt} />
            <TariffPanel tariffs={tariffs} onChange={setTariffs} />
          </div>
          <div className="lg:col-span-2">
            <AssetsPanel
              battery={batteryParams}
              dhw={dhwParams}
              ecsService={ecsService}
              onBatteryChange={setBatteryParams}
              onDhwChange={setDhwParams}
              onEcsServiceChange={setEcsService}
            />
          </div>
          <div className="lg:col-span-3">
            <StrategyPanel strategyA={strategyA} strategyB={strategyB} onChange={handleStrategyChange} />
          </div>
        </div>
        <CompareAB
          scenarioId={scenarioId}
          dt_s={dt_s}
          battery={batteryParams}
          dhw={dhwParams}
          ecsService={ecsService}
          tariffs={tariffs}
          strategyA={strategyA}
          strategyB={strategyB}
        />
      </main>
    </div>
  );
};

export default App;
