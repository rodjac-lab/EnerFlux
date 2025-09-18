import React from 'react';
import { StrategyId } from '../../core/strategy';

export interface StrategySelection {
  id: StrategyId;
  thresholdPercent?: number;
}

interface StrategyPanelProps {
  strategyA: StrategySelection;
  strategyB: StrategySelection;
  onChange: (label: 'A' | 'B', selection: StrategySelection) => void;
}

const strategies: { id: StrategyId; label: string; description: string }[] = [
  { id: 'ecs_first', label: 'ECS prioritaire', description: 'Dirige le surplus vers l’ECS avant la batterie.' },
  { id: 'battery_first', label: 'Batterie prioritaire', description: 'Recharge la batterie avant de chauffer l’ECS.' },
  {
    id: 'mix_soc_threshold',
    label: 'Mix (seuil SOC)',
    description: 'Aiguillage dynamique en fonction du niveau de charge.'
  }
];

const StrategyPanel: React.FC<StrategyPanelProps> = ({ strategyA, strategyB, onChange }) => {
  const renderSelector = (label: 'A' | 'B', selection: StrategySelection) => (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="font-medium text-slate-700">Stratégie {label}</h3>
        <select
          className="rounded border border-slate-300 p-2"
          value={selection.id}
          onChange={(event) => onChange(label, { ...selection, id: event.target.value as StrategyId })}
        >
          {strategies.map((strategy) => (
            <option key={strategy.id} value={strategy.id}>
              {strategy.label}
            </option>
          ))}
        </select>
      </div>
      <p className="text-xs text-slate-500">
        {strategies.find((strategy) => strategy.id === selection.id)?.description}
      </p>
      {selection.id === 'mix_soc_threshold' ? (
        <label className="text-sm text-slate-600">
          Seuil SOC (%)
          <input
            type="range"
            min={10}
            max={100}
            step={5}
            value={selection.thresholdPercent ?? 50}
            className="w-full"
            onChange={(event) =>
              onChange(label, {
                ...selection,
                thresholdPercent: Number(event.target.value)
              })
            }
          />
          <span className="ml-2 text-xs text-slate-500">{selection.thresholdPercent ?? 50} %</span>
        </label>
      ) : null}
    </div>
  );

  return (
    <section className="bg-white shadow rounded p-4 space-y-6">
      <header>
        <h2 className="text-lg font-semibold text-slate-800">Stratégies</h2>
        <p className="text-sm text-slate-500">Configurez les deux stratégies comparées.</p>
      </header>
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        {renderSelector('A', strategyA)}
        {renderSelector('B', strategyB)}
      </div>
    </section>
  );
};

export default StrategyPanel;
