import React from 'react';
import type { PoolFormState } from '../types';

interface PoolPanelProps {
  pool: PoolFormState;
  onChange: (next: PoolFormState) => void;
  variant?: 'card' | 'inline';
}

const numberInputClasses = 'w-full rounded border border-slate-300 p-2';

const containerClasses = (variant: 'card' | 'inline'): string =>
  variant === 'inline' ? 'rounded border border-slate-200 bg-white/80 p-4 space-y-6' : 'bg-white shadow rounded p-4 space-y-6';

const titleClasses = (variant: 'card' | 'inline'): string =>
  variant === 'inline' ? 'text-base font-semibold text-slate-800' : 'text-lg font-semibold text-slate-800';

const subtitleClasses = (variant: 'card' | 'inline'): string =>
  variant === 'inline' ? 'text-xs text-slate-500' : 'text-sm text-slate-500';

const PoolPanel: React.FC<PoolPanelProps> = ({ pool, onChange, variant = 'card' }) => {
  const window = pool.params.preferredWindows[0] ?? { startHour: 10, endHour: 16 };

  const update = (key: keyof PoolFormState['params'], value: number) => {
    const params = { ...pool.params };
    if (key === 'power_kW') {
      params.power_kW = value;
    } else if (key === 'minHoursPerDay') {
      params.minHoursPerDay = Math.max(0, value);
    } else if (key === 'catchUpStartHour') {
      params.catchUpStartHour = Math.min(Math.max(value, 0), 24);
    }
    params.preferredWindows = [...params.preferredWindows];
    onChange({ ...pool, params });
  };

  const updateWindow = (field: 'startHour' | 'endHour', value: number) => {
    const startHour = field === 'startHour' ? Math.min(Math.max(value, 0), 24) : window.startHour;
    const endHour = field === 'endHour' ? Math.min(Math.max(value, 0), 24) : window.endHour;
    onChange({
      ...pool,
      params: {
        ...pool.params,
        preferredWindows: [{ startHour, endHour }]
      }
    });
  };

  return (
    <section className={containerClasses(variant)}>
      <header className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className={titleClasses(variant)}>Pompe de piscine</h2>
          <p className={subtitleClasses(variant)}>
            Pilotez la filtration quotidienne (puissance fixe et durée minimale).
          </p>
        </div>
        <label className="inline-flex items-center gap-2 text-sm text-slate-600">
          <input
            type="checkbox"
            className="h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-slate-500"
            checked={pool.enabled}
            onChange={(event) => onChange({ ...pool, enabled: event.target.checked })}
          />
          Activer la pompe
        </label>
      </header>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <label className="text-sm text-slate-600">
          Puissance (kW)
          <input
            type="number"
            min={0}
            step={0.1}
            className={numberInputClasses}
            value={pool.params.power_kW}
            onChange={(event) => update('power_kW', Number(event.target.value))}
            disabled={!pool.enabled}
          />
        </label>
        <label className="text-sm text-slate-600">
          Durée minimale (h/jour)
          <input
            type="number"
            min={0}
            max={24}
            step={0.5}
            className={numberInputClasses}
            value={pool.params.minHoursPerDay}
            onChange={(event) => update('minHoursPerDay', Number(event.target.value))}
            disabled={!pool.enabled}
          />
        </label>
        <label className="text-sm text-slate-600">
          Créneau préféré - début (h)
          <input
            type="number"
            min={0}
            max={24}
            step={0.5}
            className={numberInputClasses}
            value={window.startHour}
            onChange={(event) => updateWindow('startHour', Number(event.target.value))}
            disabled={!pool.enabled}
          />
        </label>
        <label className="text-sm text-slate-600">
          Créneau préféré - fin (h)
          <input
            type="number"
            min={0}
            max={24}
            step={0.5}
            className={numberInputClasses}
            value={window.endHour}
            onChange={(event) => updateWindow('endHour', Number(event.target.value))}
            disabled={!pool.enabled}
          />
        </label>
        <label className="text-sm text-slate-600">
          Heure de rattrapage (h)
          <input
            type="number"
            min={0}
            max={24}
            step={0.5}
            className={numberInputClasses}
            value={pool.params.catchUpStartHour}
            onChange={(event) => update('catchUpStartHour', Number(event.target.value))}
            disabled={!pool.enabled}
          />
        </label>
      </div>
      <p className="text-xs text-slate-500">
        La pompe tente d&rsquo;utiliser prioritairement le créneau préféré. Elle démarre plus tôt si la
        durée restante devient insuffisante ou après l&rsquo;heure de rattrapage.
      </p>
    </section>
  );
};

export default PoolPanel;
