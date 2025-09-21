import React from 'react';
import { BatteryParams } from '../../devices/Battery';
import { DHWTankParams } from '../../devices/DHWTank';
import { formatTemperature } from '../utils/ui';
import FieldLabel from '../components/FieldLabel';
import { HELP } from '../help';
import type { EcsServiceConfig } from '../../data/ecs-service';

interface AssetsPanelProps {
  battery: BatteryParams;
  dhw: DHWTankParams;
  onBatteryChange: (params: BatteryParams) => void;
  onDhwChange: (params: DHWTankParams) => void;
  ecsService: EcsServiceConfig;
  onEcsServiceChange: (config: EcsServiceConfig) => void;
}

const numberInputClasses = 'w-full rounded border border-slate-300 p-2';

const AssetsPanel: React.FC<AssetsPanelProps> = ({
  battery,
  dhw,
  ecsService,
  onBatteryChange,
  onDhwChange,
  onEcsServiceChange
}) => {
  const updateBattery = (key: keyof BatteryParams, value: number) => {
    onBatteryChange({ ...battery, [key]: value });
  };
  const updateDhw = (key: keyof DHWTankParams, value: number) => {
    onDhwChange({ ...dhw, [key]: value });
  };
  const updateEcsService = (key: keyof EcsServiceConfig, value: EcsServiceConfig[keyof EcsServiceConfig]) => {
    onEcsServiceChange({ ...ecsService, [key]: value } as EcsServiceConfig);
  };

  return (
    <section className="bg-white shadow rounded p-4 space-y-6">
      <header>
        <h2 className="text-lg font-semibold text-slate-800">Équipements</h2>
        <p className="text-sm text-slate-500">Paramétrez la batterie et le ballon d&apos;ECS.</p>
      </header>

      <div className="space-y-3">
        <h3 className="font-medium text-slate-700">Batterie</h3>
        <div className="grid grid-cols-2 gap-3">
          <label className="text-sm text-slate-600">
            Capacité (kWh)
            <input
              type="number"
              min={1}
              step={0.5}
              className={numberInputClasses}
              value={battery.capacity_kWh}
              onChange={(event) => updateBattery('capacity_kWh', Number(event.target.value))}
            />
          </label>
          <label className="text-sm text-slate-600">
            Puissance max (kW)
            <input
              type="number"
              min={0.5}
              step={0.5}
              className={numberInputClasses}
              value={battery.pMax_kW}
              onChange={(event) => updateBattery('pMax_kW', Number(event.target.value))}
            />
          </label>
          <label className="text-sm text-slate-600">
            Rendement charge
            <input
              type="number"
              min={0.6}
              max={1}
              step={0.01}
              className={numberInputClasses}
              value={battery.etaCharge}
              onChange={(event) => updateBattery('etaCharge', Number(event.target.value))}
            />
          </label>
          <label className="text-sm text-slate-600">
            Rendement décharge
            <input
              type="number"
              min={0.6}
              max={1}
              step={0.01}
              className={numberInputClasses}
              value={battery.etaDischarge}
              onChange={(event) => updateBattery('etaDischarge', Number(event.target.value))}
            />
          </label>
          <label className="text-sm text-slate-600">
            SOC initial (kWh)
            <input
              type="number"
              min={0}
              step={0.5}
              className={numberInputClasses}
              value={battery.socInit_kWh}
              onChange={(event) => updateBattery('socInit_kWh', Number(event.target.value))}
            />
          </label>
          <FieldLabel label="SOC min (kWh)" help={HELP.battery.socMin}>
            <input
              type="number"
              min={0}
              step={0.5}
              className={numberInputClasses}
              value={battery.socMin_kWh}
              onChange={(event) => updateBattery('socMin_kWh', Number(event.target.value))}
            />
          </FieldLabel>
          <FieldLabel label="SOC max (kWh)" help={HELP.battery.socMax}>
            <input
              type="number"
              min={0}
              step={0.5}
              className={numberInputClasses}
              value={battery.socMax_kWh}
              onChange={(event) => updateBattery('socMax_kWh', Number(event.target.value))}
            />
          </FieldLabel>
        </div>
      </div>

      <div className="space-y-3">
        <h3 className="font-medium text-slate-700">Ballon ECS</h3>
        <div className="grid grid-cols-2 gap-3">
          <label className="text-sm text-slate-600">
            Volume (L)
            <input
              type="number"
              min={100}
              step={10}
              className={numberInputClasses}
              value={dhw.volume_L}
              onChange={(event) => updateDhw('volume_L', Number(event.target.value))}
            />
          </label>
          <FieldLabel label="Puissance résistance (kW)" help={HELP.ecs.pRes}>
            <input
              type="number"
              min={1}
              step={0.5}
              className={numberInputClasses}
              value={dhw.resistivePower_kW}
              onChange={(event) => updateDhw('resistivePower_kW', Number(event.target.value))}
            />
          </FieldLabel>
          <label className="text-sm text-slate-600">
            Rendement chauffage
            <input
              type="number"
              min={0.7}
              max={1}
              step={0.01}
              className={numberInputClasses}
              value={dhw.efficiency}
              onChange={(event) => updateDhw('efficiency', Number(event.target.value))}
            />
          </label>
          <label className="text-sm text-slate-600">
            Coefficient de pertes (W/K)
            <input
              type="number"
              min={0}
              step={1}
              className={numberInputClasses}
              value={dhw.lossCoeff_W_per_K}
              onChange={(event) => updateDhw('lossCoeff_W_per_K', Number(event.target.value))}
            />
          </label>
          <label className="text-sm text-slate-600">
            Température ambiante (°C)
            <input
              type="number"
              min={5}
              max={35}
              step={1}
              className={numberInputClasses}
              value={dhw.ambientTemp_C}
              onChange={(event) => updateDhw('ambientTemp_C', Number(event.target.value))}
            />
          </label>
          <FieldLabel label="Température cible (°C)" help={HELP.ecs.target}>
            <input
              type="number"
              min={30}
              max={70}
              step={1}
              className={numberInputClasses}
              value={dhw.targetTemp_C}
              onChange={(event) => updateDhw('targetTemp_C', Number(event.target.value))}
            />
          </FieldLabel>
          <label className="text-sm text-slate-600">
            Température initiale (°C)
            <input
              type="number"
              min={10}
              max={70}
              step={1}
              className={numberInputClasses}
              value={dhw.initialTemp_C}
              onChange={(event) => updateDhw('initialTemp_C', Number(event.target.value))}
            />
          </label>
        </div>
        <p className="text-xs text-slate-500">
          Cible actuelle : {formatTemperature(dhw.targetTemp_C)} — attention à rester cohérent avec la réglementation.
        </p>
      </div>

      <div className="space-y-3">
        <h3 className="font-medium text-slate-700">Service ECS</h3>
        <div className="grid grid-cols-2 gap-3">
          <label className="text-sm text-slate-600">
            Mode service ECS
            <select
              className="w-full rounded border border-slate-300 p-2"
              value={ecsService.enforcementMode}
              onChange={(event) => {
                const mode = event.target.value as EcsServiceConfig['enforcementMode'];
                const next: EcsServiceConfig = { ...ecsService, enforcementMode: mode };
                if (
                  mode === 'penalize' &&
                  (next.penalty_EUR_per_K === undefined || !Number.isFinite(next.penalty_EUR_per_K))
                ) {
                  next.penalty_EUR_per_K = 0.08;
                }
                onEcsServiceChange(next);
              }}
            >
              <option value="force">Forcer</option>
              <option value="penalize">Pénaliser</option>
              <option value="off">Désactivé</option>
            </select>
          </label>
          <label className="text-sm text-slate-600">
            Cible (°C)
            <input
              type="number"
              min={30}
              max={70}
              step={1}
              className={numberInputClasses}
              value={ecsService.target_C}
              onChange={(event) =>
                updateEcsService('target_C', Math.max(30, Math.min(70, Number(event.target.value))))
              }
            />
          </label>
          <label className="text-sm text-slate-600">
            Heure limite
            <input
              type="number"
              min={0}
              max={24}
              step={1}
              className={numberInputClasses}
              value={ecsService.deadlineHour}
              onChange={(event) =>
                updateEcsService('deadlineHour', Math.max(0, Math.min(24, Number(event.target.value))))
              }
            />
          </label>
          {ecsService.enforcementMode === 'penalize' ? (
            <label className="text-sm text-slate-600">
              Pénalité €/K
              <input
                type="number"
                min={0}
                step={0.01}
                className={numberInputClasses}
                value={ecsService.penalty_EUR_per_K ?? 0}
                onChange={(event) =>
                  updateEcsService('penalty_EUR_per_K', Math.max(0, Number(event.target.value)))
                }
              />
            </label>
          ) : null}
        </div>
        <p className="text-xs text-slate-500">
          Choisissez entre forcer l&apos;appoint réseau, appliquer une pénalité financière ou désactiver le contrat.
        </p>
      </div>
    </section>
  );
};

export default AssetsPanel;
