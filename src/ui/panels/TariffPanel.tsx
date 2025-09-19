import React, { useEffect, useMemo, useState } from 'react';
import type { Tariffs, TariffMode } from '../../data/types';
import { cloneTariffs, defaultTariffs } from '../../data/tariffs';
import { formatPrice } from '../utils/ui';

interface TariffPanelProps {
  tariffs: Tariffs;
  onChange: (tariffs: Tariffs) => void;
}

const hourOptions = Array.from({ length: 24 }, (_, index) => index);

const complementHours = (hours: number[]): number[] => {
  const set = new Set(hours);
  const result: number[] = [];
  for (let hour = 0; hour < 24; hour += 1) {
    if (!set.has(hour)) {
      result.push(hour);
    }
  }
  return result;
};

const asPositiveNumber = (value: string, fallback: number): number => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    return fallback;
  }
  return Math.max(parsed, 0);
};

const ensureProfileArray = (value: number | number[] | undefined, fallback: number): number[] => {
  if (Array.isArray(value) && value.length > 0) {
    return [...value];
  }
  return new Array(24).fill(fallback);
};

const parseProfileText = (text: string): number[] | null => {
  try {
    const parsed = JSON.parse(text);
    if (!Array.isArray(parsed) || parsed.length === 0) {
      return null;
    }
    const values = parsed.map((entry) => Number(entry));
    if (values.some((value) => !Number.isFinite(value) || value < 0)) {
      return null;
    }
    if (values.length !== 24 && values.length !== 96) {
      return null;
    }
    return values;
  } catch (error) {
    return null;
  }
};

const TariffPanel: React.FC<TariffPanelProps> = ({ tariffs, onChange }) => {
  const [profileImportText, setProfileImportText] = useState('');
  const [profileExportText, setProfileExportText] = useState('');
  const [profileErrors, setProfileErrors] = useState<{ import?: string; export?: string }>({});

  const exportPriceDisplay = useMemo(() => {
    if (Array.isArray(tariffs.export_EUR_per_kWh)) {
      return formatPrice(tariffs.export_EUR_per_kWh[0] ?? 0);
    }
    return formatPrice(typeof tariffs.export_EUR_per_kWh === 'number' ? tariffs.export_EUR_per_kWh : 0);
  }, [tariffs.export_EUR_per_kWh]);

  useEffect(() => {
    if (tariffs.mode === 'profile') {
      const importProfile = ensureProfileArray(
        tariffs.import_EUR_per_kWh,
        typeof tariffs.import_EUR_per_kWh === 'number'
          ? tariffs.import_EUR_per_kWh
          : (defaultTariffs.import_EUR_per_kWh as number)
      );
      const exportProfile = ensureProfileArray(
        tariffs.export_EUR_per_kWh,
        typeof tariffs.export_EUR_per_kWh === 'number'
          ? tariffs.export_EUR_per_kWh
          : (defaultTariffs.export_EUR_per_kWh as number)
      );
      setProfileImportText(JSON.stringify(importProfile));
      setProfileExportText(JSON.stringify(exportProfile));
      setProfileErrors({});
    } else {
      setProfileErrors({});
    }
  }, [tariffs]);

  const handleModeChange = (mode: TariffMode) => {
    if (mode === tariffs.mode) {
      return;
    }
    const next = cloneTariffs(tariffs);
    next.mode = mode;
    if (mode === 'fixed') {
      const importValue = Array.isArray(next.import_EUR_per_kWh)
        ? next.import_EUR_per_kWh[0] ?? (defaultTariffs.import_EUR_per_kWh as number)
        : (next.import_EUR_per_kWh as number);
      const exportValue = Array.isArray(next.export_EUR_per_kWh)
        ? next.export_EUR_per_kWh[0] ?? (defaultTariffs.export_EUR_per_kWh as number)
        : (next.export_EUR_per_kWh as number);
      next.import_EUR_per_kWh = importValue;
      next.export_EUR_per_kWh = exportValue;
    } else if (mode === 'tou') {
      const base = next.tou ?? cloneTariffs(defaultTariffs).tou!;
      next.import_EUR_per_kWh = Array.isArray(next.import_EUR_per_kWh)
        ? next.import_EUR_per_kWh[0] ?? base.offpeak_price
        : next.import_EUR_per_kWh;
      next.export_EUR_per_kWh = Array.isArray(next.export_EUR_per_kWh)
        ? next.export_EUR_per_kWh[0] ?? (defaultTariffs.export_EUR_per_kWh as number)
        : next.export_EUR_per_kWh;
      next.tou = {
        onpeak_hours: [...base.onpeak_hours],
        offpeak_hours: [...base.offpeak_hours],
        onpeak_price: base.onpeak_price,
        offpeak_price: base.offpeak_price
      };
    } else if (mode === 'profile') {
      const importValue = Array.isArray(next.import_EUR_per_kWh)
        ? next.import_EUR_per_kWh
        : ensureProfileArray(
            undefined,
            typeof next.import_EUR_per_kWh === 'number'
              ? next.import_EUR_per_kWh
              : (defaultTariffs.import_EUR_per_kWh as number)
          );
      const exportValue = Array.isArray(next.export_EUR_per_kWh)
        ? next.export_EUR_per_kWh
        : ensureProfileArray(
            undefined,
            typeof next.export_EUR_per_kWh === 'number'
              ? next.export_EUR_per_kWh
              : (defaultTariffs.export_EUR_per_kWh as number)
          );
      next.import_EUR_per_kWh = importValue;
      next.export_EUR_per_kWh = exportValue;
    }
    onChange(next);
  };

  const updateImportPrice = (value: number) => {
    const next = cloneTariffs(tariffs);
    next.import_EUR_per_kWh = value;
    onChange(next);
  };

  const updateExportPrice = (value: number) => {
    const next = cloneTariffs(tariffs);
    next.export_EUR_per_kWh = value;
    onChange(next);
  };

  const updateTouPrice = (key: 'onpeak_price' | 'offpeak_price', value: number) => {
    const base = tariffs.tou ?? cloneTariffs(defaultTariffs).tou!;
    const next = cloneTariffs(tariffs);
    next.tou = {
      onpeak_hours: [...(tariffs.tou?.onpeak_hours ?? base.onpeak_hours)],
      offpeak_hours: [...(tariffs.tou?.offpeak_hours ?? base.offpeak_hours)],
      onpeak_price: key === 'onpeak_price' ? value : tariffs.tou?.onpeak_price ?? base.onpeak_price,
      offpeak_price: key === 'offpeak_price' ? value : tariffs.tou?.offpeak_price ?? base.offpeak_price
    };
    onChange(next);
  };

  const updateTouHours = (hours: number[]) => {
    const base = tariffs.tou ?? cloneTariffs(defaultTariffs).tou!;
    const next = cloneTariffs(tariffs);
    next.tou = {
      onpeak_hours: [...hours],
      offpeak_hours: complementHours(hours),
      onpeak_price: tariffs.tou?.onpeak_price ?? base.onpeak_price,
      offpeak_price: tariffs.tou?.offpeak_price ?? base.offpeak_price
    };
    onChange(next);
  };

  const handleProfileChange = (kind: 'import' | 'export', text: string) => {
    if (kind === 'import') {
      setProfileImportText(text);
    } else {
      setProfileExportText(text);
    }
    if (text.trim().length === 0) {
      setProfileErrors((prev) => ({ ...prev, [kind]: 'Le profil doit contenir des valeurs numériques.' }));
      return;
    }
    const parsed = parseProfileText(text);
    if (!parsed) {
      setProfileErrors((prev) => ({ ...prev, [kind]: 'Utilisez un tableau JSON de 24 ou 96 valeurs ≥ 0.' }));
      return;
    }
    setProfileErrors((prev) => ({ ...prev, [kind]: undefined }));
    const next = cloneTariffs(tariffs);
    if (kind === 'import') {
      next.import_EUR_per_kWh = parsed;
    } else {
      next.export_EUR_per_kWh = parsed;
    }
    onChange(next);
  };

  return (
    <section className="bg-white shadow rounded p-4 space-y-4 text-sm">
      <header className="space-y-1">
        <h2 className="text-lg font-semibold text-slate-800">Tarifs</h2>
        <p className="text-xs text-slate-500">
          Configurez le coût d&apos;import réseau et le tarif de rachat pour alimenter les KPIs en €.
        </p>
      </header>

      <div className="space-y-2">
        <label className="block text-xs font-medium text-slate-600" htmlFor="tariff-mode">
          Mode de tarification
        </label>
        <select
          id="tariff-mode"
          className="w-full rounded border border-slate-300 p-2"
          value={tariffs.mode}
          onChange={(event) => handleModeChange(event.target.value as TariffMode)}
        >
          <option value="fixed">Fixe</option>
          <option value="tou">Heures pleines/creuses</option>
          <option value="profile">Profil journalier</option>
        </select>
      </div>

      {tariffs.mode === 'fixed' ? (
        <div className="grid grid-cols-1 gap-3">
          <label className="text-xs font-medium text-slate-600">
            Prix import (€/kWh)
            <input
              type="number"
              min={0}
              step={0.01}
              className="mt-1 w-full rounded border border-slate-300 p-2"
              value={typeof tariffs.import_EUR_per_kWh === 'number' ? tariffs.import_EUR_per_kWh : 0}
              onChange={(event) => updateImportPrice(asPositiveNumber(event.target.value, 0))}
            />
          </label>
          <label className="text-xs font-medium text-slate-600">
            Prix rachat (€/kWh)
            <input
              type="number"
              min={0}
              step={0.01}
              className="mt-1 w-full rounded border border-slate-300 p-2"
              value={typeof tariffs.export_EUR_per_kWh === 'number' ? tariffs.export_EUR_per_kWh : 0}
              onChange={(event) => updateExportPrice(asPositiveNumber(event.target.value, 0))}
            />
          </label>
        </div>
      ) : null}

      {tariffs.mode === 'tou' ? (
        <div className="space-y-3">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <label className="text-xs font-medium text-slate-600">
              Prix heures pleines (€/kWh)
              <input
                type="number"
                min={0}
                step={0.01}
                className="mt-1 w-full rounded border border-slate-300 p-2"
                value={tariffs.tou?.onpeak_price ?? cloneTariffs(defaultTariffs).tou!.onpeak_price}
                onChange={(event) => updateTouPrice('onpeak_price', asPositiveNumber(event.target.value, 0))}
              />
            </label>
            <label className="text-xs font-medium text-slate-600">
              Prix heures creuses (€/kWh)
              <input
                type="number"
                min={0}
                step={0.01}
                className="mt-1 w-full rounded border border-slate-300 p-2"
                value={tariffs.tou?.offpeak_price ?? cloneTariffs(defaultTariffs).tou!.offpeak_price}
                onChange={(event) => updateTouPrice('offpeak_price', asPositiveNumber(event.target.value, 0))}
              />
            </label>
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium text-slate-600" htmlFor="tou-hours">
              Heures pleines
            </label>
            <select
              id="tou-hours"
              multiple
              className="h-32 w-full rounded border border-slate-300 p-2"
              value={(tariffs.tou?.onpeak_hours ?? cloneTariffs(defaultTariffs).tou!.onpeak_hours).map(String)}
              onChange={(event) => {
                const selected = Array.from(event.target.selectedOptions).map((option) => Number(option.value));
                updateTouHours(selected);
              }}
            >
              {hourOptions.map((hour) => (
                <option key={hour} value={hour}>
                  {hour.toString().padStart(2, '0')} h
                </option>
              ))}
            </select>
            <p className="text-[11px] text-slate-500">
              Les heures restantes ({complementHours(tariffs.tou?.onpeak_hours ?? [])
                .map((hour) => hour.toString().padStart(2, '0'))
                .join(', ') || '—'} h) seront considérées comme heures creuses.
            </p>
          </div>
          <label className="text-xs font-medium text-slate-600">
            Prix rachat constant (€/kWh)
            <input
              type="number"
              min={0}
              step={0.01}
              className="mt-1 w-full rounded border border-slate-300 p-2"
              value={typeof tariffs.export_EUR_per_kWh === 'number' ? tariffs.export_EUR_per_kWh : 0}
              onChange={(event) => updateExportPrice(asPositiveNumber(event.target.value, 0))}
            />
          </label>
        </div>
      ) : null}

      {tariffs.mode === 'profile' ? (
        <div className="space-y-3">
          <div>
            <label className="text-xs font-medium text-slate-600" htmlFor="profile-import">
              Profil import (24 ou 96 valeurs €/kWh)
            </label>
            <textarea
              id="profile-import"
              className="mt-1 h-32 w-full rounded border border-slate-300 p-2 font-mono text-xs"
              value={profileImportText}
              onChange={(event) => handleProfileChange('import', event.target.value)}
            />
            {profileErrors.import ? (
              <p className="mt-1 text-[11px] text-red-600">{profileErrors.import}</p>
            ) : null}
          </div>
          <div>
            <label className="text-xs font-medium text-slate-600" htmlFor="profile-export">
              Profil rachat (24 ou 96 valeurs €/kWh)
            </label>
            <textarea
              id="profile-export"
              className="mt-1 h-32 w-full rounded border border-slate-300 p-2 font-mono text-xs"
              value={profileExportText}
              onChange={(event) => handleProfileChange('export', event.target.value)}
            />
            {profileErrors.export ? (
              <p className="mt-1 text-[11px] text-red-600">{profileErrors.export}</p>
            ) : null}
          </div>
        </div>
      ) : null}

      <p className="text-[11px] text-slate-400">
        Tarif export courant : <span className="font-semibold">{exportPriceDisplay}</span>
      </p>
    </section>
  );
};

export default TariffPanel;
