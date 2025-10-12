import React from 'react';
import type { HeatingFormState } from '../types';
import FieldLabel from '../components/FieldLabel';
import { HELP } from '../help';

interface HeatingPanelProps {
  heating: HeatingFormState;
  onChange: (next: HeatingFormState) => void;
  variant?: 'card' | 'inline';
}

const numberInputClasses = 'w-full rounded border border-slate-300 p-2';

const containerClasses = (variant: 'card' | 'inline'): string =>
  variant === 'inline' ? 'rounded border border-slate-200 bg-white/80 p-4 space-y-6' : 'bg-white shadow rounded p-4 space-y-6';

const titleClasses = (variant: 'card' | 'inline'): string =>
  variant === 'inline' ? 'text-base font-semibold text-slate-800' : 'text-lg font-semibold text-slate-800';

const subtitleClasses = (variant: 'card' | 'inline'): string =>
  variant === 'inline' ? 'text-xs text-slate-500' : 'text-sm text-slate-500';

const HeatingPanel: React.FC<HeatingPanelProps> = ({ heating, onChange, variant = 'card' }) => {
  const { params } = heating;

  const update = (key: keyof HeatingFormState['params'], value: number) => {
    onChange({
      ...heating,
      params: { ...params, [key]: value }
    });
  };

  return (
    <section className={containerClasses(variant)}>
      <header className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className={titleClasses(variant)}>Chauffage modulable</h2>
          <p className={subtitleClasses(variant)}>
            Modélisez l&apos;inertie thermique du logement et ses consignes jour/nuit.
          </p>
        </div>
        <label className="inline-flex items-center gap-2 text-sm text-slate-600">
          <input
            type="checkbox"
            className="h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-slate-500"
            checked={heating.enabled}
            onChange={(event) => onChange({ ...heating, enabled: event.target.checked })}
          />
          Activer le chauffage
        </label>
      </header>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <label className="text-sm text-slate-600">
          Puissance max (kW)
          <input
            type="number"
            min={0}
            step={0.5}
            className={numberInputClasses}
            value={params.maxPower_kW}
            onChange={(event) => update('maxPower_kW', Number(event.target.value))}
            disabled={!heating.enabled}
          />
        </label>
        <FieldLabel label="Capacité thermique (kWh/K)" help={HELP.heating.capacity}>
          <input
            type="number"
            min={0.1}
            step={0.1}
            className={numberInputClasses}
            value={params.thermalCapacity_kWh_per_K}
            onChange={(event) => update('thermalCapacity_kWh_per_K', Number(event.target.value))}
            disabled={!heating.enabled}
          />
        </FieldLabel>
        <FieldLabel label="Pertes (W/K)" help={HELP.heating.losses}>
          <input
            type="number"
            min={0}
            step={10}
            className={numberInputClasses}
            value={params.lossCoeff_W_per_K}
            onChange={(event) => update('lossCoeff_W_per_K', Number(event.target.value))}
            disabled={!heating.enabled}
          />
        </FieldLabel>
        <label className="text-sm text-slate-600">
          Température ambiante (°C)
          <input
            type="number"
            min={-10}
            max={35}
            step={0.5}
            className={numberInputClasses}
            value={params.ambientTemp_C}
            onChange={(event) => update('ambientTemp_C', Number(event.target.value))}
            disabled={!heating.enabled}
          />
        </label>
        <label className="text-sm text-slate-600">
          Consigne jour (°C)
          <input
            type="number"
            min={10}
            max={28}
            step={0.5}
            className={numberInputClasses}
            value={params.comfortDay_C}
            onChange={(event) => update('comfortDay_C', Number(event.target.value))}
            disabled={!heating.enabled}
          />
        </label>
        <label className="text-sm text-slate-600">
          Consigne nuit (°C)
          <input
            type="number"
            min={8}
            max={26}
            step={0.5}
            className={numberInputClasses}
            value={params.comfortNight_C}
            onChange={(event) => update('comfortNight_C', Number(event.target.value))}
            disabled={!heating.enabled}
          />
        </label>
        <label className="text-sm text-slate-600">
          Début journée (h)
          <input
            type="number"
            min={0}
            max={24}
            step={0.5}
            className={numberInputClasses}
            value={params.dayStartHour}
            onChange={(event) => update('dayStartHour', Number(event.target.value))}
            disabled={!heating.enabled}
          />
        </label>
        <label className="text-sm text-slate-600">
          Début nuit (h)
          <input
            type="number"
            min={0}
            max={24}
            step={0.5}
            className={numberInputClasses}
            value={params.nightStartHour}
            onChange={(event) => update('nightStartHour', Number(event.target.value))}
            disabled={!heating.enabled}
          />
        </label>
        <FieldLabel label="Hystérésis (K)" help={HELP.heating.hysteresis}>
          <input
            type="number"
            min={0.1}
            step={0.1}
            className={numberInputClasses}
            value={params.hysteresis_K}
            onChange={(event) => update('hysteresis_K', Number(event.target.value))}
            disabled={!heating.enabled}
          />
        </FieldLabel>
        <label className="text-sm text-slate-600">
          Température initiale (°C)
          <input
            type="number"
            min={-5}
            max={35}
            step={0.5}
            className={numberInputClasses}
            value={params.initialTemp_C}
            onChange={(event) => update('initialTemp_C', Number(event.target.value))}
            disabled={!heating.enabled}
          />
        </label>
      </div>
      <p className="text-xs text-slate-500">
        Ajustez ces paramètres pour représenter l&apos;inertie du logement : plus la capacité thermique est élevée,
        plus la maison conserve la chaleur en période sans apport.
      </p>
    </section>
  );
};

export default HeatingPanel;
