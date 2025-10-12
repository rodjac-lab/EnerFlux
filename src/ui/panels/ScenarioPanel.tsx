import React from 'react';
import { PresetId, scenarioPresets } from '../../data/scenarios';

interface ScenarioPanelProps {
  scenarioId: PresetId;
  dt_s: number;
  onScenarioChange: (scenarioId: PresetId) => void;
  onDtChange: (dt_s: number) => void;
  variant?: 'card' | 'horizontal';
}

const dtOptions = [300, 600, 900, 1200, 1800];

const ScenarioPanel: React.FC<ScenarioPanelProps> = ({
  scenarioId,
  dt_s,
  onScenarioChange,
  onDtChange,
  variant = 'card'
}) => {
  const containerClasses =
    variant === 'horizontal'
      ? 'bg-white shadow rounded p-4 space-y-4 lg:space-y-6'
      : 'bg-white shadow rounded p-4 space-y-4';

  const controlsLayoutClasses =
    variant === 'horizontal'
      ? 'flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between'
      : 'space-y-4';

  const scenarioFieldClasses =
    variant === 'horizontal' ? 'flex-1 min-w-0 space-y-2' : 'space-y-2';

  const dtFieldClasses = variant === 'horizontal' ? 'flex flex-col space-y-2 lg:w-64' : 'space-y-2';

  return (
    <section className={containerClasses}>
      <header className={variant === 'horizontal' ? 'space-y-1' : undefined}>
        <h2 className="text-lg font-semibold text-slate-800">Scénario</h2>
        <p className="text-sm text-slate-500">Choisissez un profil solaire et la résolution de la simulation.</p>
      </header>
      <div className={controlsLayoutClasses}>
        <div className={scenarioFieldClasses}>
          <label className="block text-sm font-medium text-slate-600" htmlFor="scenario-select">
            Profil journalier
          </label>
          <select
            id="scenario-select"
            className="w-full rounded border border-slate-300 p-2"
            value={scenarioId}
            onChange={(event) => onScenarioChange(event.target.value as PresetId)}
          >
            {scenarioPresets.map((preset) => (
              <option key={preset.id} value={preset.id}>
                {preset.label}
              </option>
            ))}
          </select>
          <p className="text-xs text-slate-400">
            {scenarioPresets.find((preset) => preset.id === scenarioId)?.description}
          </p>
        </div>
        <div className={dtFieldClasses}>
          <label className="block text-sm font-medium text-slate-600">Pas de temps</label>
          <div className="flex items-center space-x-3">
            <select
              value={dt_s}
              className="rounded border border-slate-300 p-2"
              onChange={(event) => onDtChange(Number(event.target.value))}
            >
              {dtOptions.map((value) => (
                <option key={value} value={value}>
                  {Math.round(value / 60)} min
                </option>
              ))}
            </select>
            <span className="text-sm text-slate-500">Résolution actuelle : {Math.round(dt_s / 60)} min</span>
          </div>
        </div>
      </div>
    </section>
  );
};

export default ScenarioPanel;
