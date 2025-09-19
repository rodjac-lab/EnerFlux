import React from 'react';
import { PresetId, scenarioPresets } from '../../data/scenarios';

interface ScenarioPanelProps {
  scenarioId: PresetId;
  dt_s: number;
  onScenarioChange: (scenarioId: PresetId) => void;
  onDtChange: (dt_s: number) => void;
}

const dtOptions = [300, 600, 900, 1200, 1800];

const ScenarioPanel: React.FC<ScenarioPanelProps> = ({ scenarioId, dt_s, onScenarioChange, onDtChange }) => (
  <section className="bg-white shadow rounded p-4 space-y-4">
    <header>
      <h2 className="text-lg font-semibold text-slate-800">Scénario</h2>
      <p className="text-sm text-slate-500">Choisissez un profil solaire et la résolution de la simulation.</p>
    </header>
    <div className="space-y-2">
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
    <div className="space-y-2">
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
  </section>
);

export default ScenarioPanel;
