import React from 'react';
import { StrategyId, getAllocationOrder } from '../../core/strategy';
import Tooltip from '../components/Tooltip';
import { HELP } from '../help';

export interface StrategySelection {
  id: StrategyId;
  thresholdPercent?: number;
}

interface StrategyPanelProps {
  strategyA: StrategySelection;
  strategyB: StrategySelection;
  onChange: (label: 'A' | 'B', selection: StrategySelection) => void;
  variant?: 'default' | 'compact';
}

const infoIconClasses =
  'ml-2 inline-flex h-4 w-4 items-center justify-center rounded-full bg-muted/20 text-[10px] font-semibold text-text focus:outline-none focus-visible:ring-2 focus-visible:ring-accent';

const strategies: { id: StrategyId; label: string; description: string; help?: string }[] = [
  {
    id: 'no_control_offpeak',
    label: 'Sans pilotage (heures creuses)',
    description: 'Chauffe-eau heures creuses classique, surplus PV exporté.',
    help: HELP.strategy.noControlOffpeak
  },
  {
    id: 'no_control_hysteresis',
    label: 'Sans pilotage (thermostat)',
    description: 'Thermostat simple ON/OFF, surplus PV exporté.',
    help: HELP.strategy.noControlHysteresis
  },
  {
    id: 'ecs_first',
    label: 'ECS prioritaire (brut)',
    description: 'Priorité ECS sans helpers automatiques.',
    help: HELP.strategy.ecsFirst
  },
  {
    id: 'ecs_hysteresis',
    label: 'ECS + hystérésis',
    description: 'Laisse refroidir avant de relancer pour limiter les yo-yo.',
    help: HELP.strategy.ecsHysteresis
  },
  {
    id: 'deadline_helper',
    label: 'ECS + préchauffe deadline',
    description: 'Active hystérésis et préchauffe avant l’heure cible.',
    help: HELP.strategy.deadlineHelper
  },
  {
    id: 'battery_first',
    label: 'Batterie prioritaire',
    description: 'Recharge la batterie avant de chauffer l’ECS.',
    help: HELP.strategy.batteryFirst
  },
  {
    id: 'mix_soc_threshold',
    label: 'Mix (seuil SOC)',
    description: 'Aiguillage dynamique en fonction du niveau de charge.',
    help: HELP.strategy.mixSoc
  },
  {
    id: 'reserve_evening',
    label: 'Réserve soirée',
    description: 'Constitue une réserve batterie avant la pointe du soir, puis priorise l’ECS.',
    help: HELP.strategy.reserveEvening
  },
  {
    id: 'ev_departure_guard',
    label: 'VE départ sécurisé',
    description: 'Préserve une marge batterie avant la fenêtre VE puis accélère la charge avant le départ.',
    help: HELP.strategy.evDepartureGuard
  },
  {
    id: 'multi_equipment_priority',
    label: 'Priorité multi-équipements',
    description: 'Arbitre ECS, chauffage, VE et piscine selon leur urgence confort.',
    help: HELP.strategy.multiEquipment
  }
];

const StrategyPanel: React.FC<StrategyPanelProps> = ({ strategyA, strategyB, onChange, variant = 'default' }) => {
  const isCompact = variant === 'compact';

  const renderSelector = (label: 'A' | 'B', selection: StrategySelection) => (
    <div className={isCompact ? 'space-y-2 rounded border border-border p-3' : 'space-y-3'}>
      <div className={isCompact ? 'flex flex-col gap-1' : 'flex items-center justify-between gap-2'}>
        <h3 className="font-medium text-text">Stratégie {label}</h3>
        <select
          className={`rounded border border-border bg-surface text-text focus:ring-2 focus:ring-accent focus:border-accent ${isCompact ? 'w-full px-3 py-2 text-sm' : 'p-2'}`}
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
      {(() => {
        const strategy = strategies.find((item) => item.id === selection.id);
        if (!strategy) {
          return null;
        }
        const allocationOrder = getAllocationOrder(selection.id);
        const orderLabels: Record<string, string> = {
          baseload: 'Base',
          ecs: 'ECS',
          battery: 'Batterie',
          heating: 'Chauffage',
          pool: 'Piscine',
          ev: 'VE'
        };
        return (
          <div className="space-y-1">
            <p className={`flex items-center text-muted ${isCompact ? 'text-[11px]' : 'text-xs'}`}>
              <span>{strategy.description}</span>
              {strategy.help ? (
                <Tooltip content={strategy.help}>
                  <span tabIndex={0} aria-label="Informations" className={infoIconClasses}>
                    ⓘ
                  </span>
                </Tooltip>
              ) : null}
            </p>
            <p className={`text-muted ${isCompact ? 'text-[10px]' : 'text-[11px]'}`}>
              <span className="font-medium">Ordre:</span>{' '}
              {allocationOrder.map((type, idx) => (
                <span key={type}>
                  {orderLabels[type] || type}
                  {idx < allocationOrder.length - 1 ? ' → ' : ''}
                </span>
              ))}
            </p>
          </div>
        );
      })()}
      {selection.id === 'mix_soc_threshold' ? (
        <label className={`text-sm text-text-secondary ${isCompact ? 'text-xs' : ''}`}>
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
          <span className="ml-2 text-xs text-muted">{selection.thresholdPercent ?? 50} %</span>
        </label>
      ) : null}
    </div>
  );

  return (
    <section className={isCompact ? 'flex h-full flex-col rounded bg-surface p-4 shadow' : 'bg-surface shadow rounded p-4 space-y-6'}>
      <header className={isCompact ? 'border-b border-border pb-3' : undefined}>
        <h2 className="text-lg font-semibold text-text">Stratégies</h2>
        <p className="text-sm text-muted">Configurez les deux stratégies comparées.</p>
      </header>
      <div className={isCompact ? 'mt-4 grid gap-3 md:grid-cols-2' : 'grid grid-cols-1 gap-6 md:grid-cols-2'}>
        {renderSelector('A', strategyA)}
        {renderSelector('B', strategyB)}
      </div>
    </section>
  );
};

export default StrategyPanel;
