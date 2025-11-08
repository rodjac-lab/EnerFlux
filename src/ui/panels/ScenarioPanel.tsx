import React from 'react';
import { PresetId, scenarioPresets } from '../../data/scenarios';

interface ScenarioPanelProps {
  scenarioId: PresetId;
  dt_s: number;
  onScenarioChange: (scenarioId: PresetId) => void;
  onDtChange: (dt_s: number) => void;
  variant?: 'card' | 'horizontal' | 'compact';
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
      ? 'bg-surface shadow rounded p-4 space-y-4 lg:space-y-6'
      : variant === 'compact'
        ? 'flex h-full flex-col gap-3 rounded bg-surface p-4 shadow'
        : 'bg-surface shadow rounded p-4 space-y-4';

  const controlsLayoutClasses =
    variant === 'horizontal'
      ? 'flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between'
      : variant === 'compact'
        ? 'grid gap-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-start'
        : 'space-y-4';

  const scenarioFieldClasses =
    variant === 'horizontal'
      ? 'flex-1 min-w-0 space-y-2'
      : variant === 'compact'
        ? 'space-y-2'
        : 'space-y-2';

  const dtFieldClasses =
    variant === 'horizontal'
      ? 'flex flex-col space-y-2 lg:w-64'
      : variant === 'compact'
        ? 'space-y-2'
        : 'space-y-2';

  const helperTextClasses =
    variant === 'compact' ? 'text-[11px] text-muted' : 'text-xs text-muted';

  return (
    <section className={containerClasses}>
      <header
        className={
          variant === 'horizontal'
            ? 'space-y-1'
            : variant === 'compact'
              ? 'flex flex-wrap items-center justify-between gap-2 border-b border-border pb-2'
              : undefined
        }
      >
        <div>
          <h2 className="text-lg font-semibold text-text">Scénario</h2>
          <p className="text-sm text-muted">Choisissez un profil solaire et la résolution de la simulation.</p>
        </div>
        {variant === 'compact' ? (
          <span className="text-xs font-medium uppercase tracking-wide text-muted">
            Δt = {Math.round(dt_s / 60)} min
          </span>
        ) : null}
      </header>
      <div className={controlsLayoutClasses}>
        <div className={scenarioFieldClasses}>
          <label
            className={`block text-sm font-medium text-text-secondary ${variant === 'compact' ? 'sm:text-xs' : ''}`}
            htmlFor="scenario-select"
          >
            Profil journalier
          </label>
          <select
            id="scenario-select"
            className={`w-full rounded border border-border bg-surface text-text focus:ring-2 focus:ring-accent focus:border-accent ${
              variant === 'compact' ? 'px-3 py-2 text-sm' : 'p-2'
            }`}
            value={scenarioId}
            onChange={(event) => onScenarioChange(event.target.value as PresetId)}
          >
            {scenarioPresets.map((preset) => (
              <option key={preset.id} value={preset.id}>
                {preset.label}
              </option>
            ))}
          </select>
          <p className={helperTextClasses}>
            {scenarioPresets.find((preset) => preset.id === scenarioId)?.description}
          </p>
        </div>
        <div className={dtFieldClasses}>
          <label className={`block text-sm font-medium text-text-secondary ${variant === 'compact' ? 'sm:text-xs' : ''}`}>Pas de temps</label>
          <select
            value={dt_s}
            className={`rounded border border-border bg-surface ${variant === 'compact' ? 'px-3 py-2 text-sm' : 'p-2'}`}
            onChange={(event) => onDtChange(Number(event.target.value))}
          >
            {dtOptions.map((value) => (
              <option key={value} value={value}>
                {Math.round(value / 60)} min
              </option>
            ))}
          </select>
          {variant !== 'compact' ? (
            <span className="text-sm text-muted">Résolution actuelle : {Math.round(dt_s / 60)} min</span>
          ) : null}
        </div>
      </div>
    </section>
  );
};

export default ScenarioPanel;
