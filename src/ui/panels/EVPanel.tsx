import React from 'react';
import type { EVFormState } from '../types';
import { HELP } from '../help';

interface EVPanelProps {
  ev: EVFormState;
  onChange: (next: EVFormState) => void;
  variant?: 'card' | 'inline';
}

const numberInputClasses = 'w-full rounded border border-border bg-surface text-text p-2 focus:ring-2 focus:ring-accent focus:border-accent';

const clampHour = (value: number): number => Math.min(Math.max(value, 0), 24);

const containerClasses = (variant: 'card' | 'inline'): string =>
  variant === 'inline' ? 'rounded border border-border bg-surface/80 p-4 space-y-6' : 'bg-surface shadow rounded p-4 space-y-6';

const titleClasses = (variant: 'card' | 'inline'): string =>
  variant === 'inline' ? 'text-base font-semibold text-text' : 'text-lg font-semibold text-text';

const subtitleClasses = (variant: 'card' | 'inline'): string =>
  variant === 'inline' ? 'text-xs text-muted' : 'text-sm text-muted';

const EVPanel: React.FC<EVPanelProps> = ({ ev, onChange, variant = 'card' }) => {
  const updateMaxPower = (value: number) => {
    onChange({
      ...ev,
      params: {
        ...ev.params,
        maxPower_kW: Math.max(0, value)
      }
    });
  };

  const updateSession = (field: 'arrivalHour' | 'departureHour' | 'energyNeed_kWh', value: number) => {
    const session = { ...ev.params.session };
    if (field === 'energyNeed_kWh') {
      session.energyNeed_kWh = Math.max(0, value);
    } else if (field === 'arrivalHour') {
      session.arrivalHour = clampHour(value);
    } else {
      session.departureHour = clampHour(value);
    }
    onChange({
      ...ev,
      params: {
        ...ev.params,
        session
      }
    });
  };

  return (
    <section className={containerClasses(variant)}>
      <header className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className={titleClasses(variant)}>Borne véhicule électrique</h2>
          <p className={subtitleClasses(variant)}>
            Programmez une session de charge quotidienne : arrivée, départ et énergie à restituer.
          </p>
        </div>
        <label className="inline-flex items-center gap-2 text-sm text-text-secondary">
          <input
            type="checkbox"
            className="h-4 w-4 rounded border-border bg-surface text-accent focus:ring-accent"
            checked={ev.enabled}
            onChange={(event) => onChange({ ...ev, enabled: event.target.checked })}
          />
          Activer la recharge VE
        </label>
      </header>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <label className="text-sm text-text-secondary">
          Puissance max (kW)
          <input
            type="number"
            min={0}
            step={0.1}
            className={numberInputClasses}
            value={ev.params.maxPower_kW}
            onChange={(event) => updateMaxPower(Number(event.target.value))}
            disabled={!ev.enabled}
          />
        </label>
        <label className="text-sm text-text-secondary">
          Énergie à fournir (kWh)
          <input
            type="number"
            min={0}
            step={0.5}
            className={numberInputClasses}
            value={ev.params.session.energyNeed_kWh}
            onChange={(event) => updateSession('energyNeed_kWh', Number(event.target.value))}
            disabled={!ev.enabled}
          />
        </label>
        <label className="text-sm text-text-secondary">
          Heure d&apos;arrivée (h)
          <input
            type="number"
            min={0}
            max={24}
            step={0.5}
            className={numberInputClasses}
            value={ev.params.session.arrivalHour}
            onChange={(event) => updateSession('arrivalHour', Number(event.target.value))}
            disabled={!ev.enabled}
          />
        </label>
        <label className="text-sm text-text-secondary">
          Heure de départ (h)
          <input
            type="number"
            min={0}
            max={24}
            step={0.5}
            className={numberInputClasses}
            value={ev.params.session.departureHour}
            onChange={(event) => updateSession('departureHour', Number(event.target.value))}
            disabled={!ev.enabled}
          />
        </label>
      </div>

      <p className="text-xs text-muted">
        {HELP.ev?.session ??
          "La session se répète chaque jour. Si le départ est inférieur à l’arrivée, la fenêtre s’étend au lendemain."}
      </p>
    </section>
  );
};

export default EVPanel;
