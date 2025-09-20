import React from 'react';
import { BatteryParams } from '../../devices/Battery';
import { DHWTankParams } from '../../devices/DHWTank';
import { formatTemperature } from '../utils/ui';
import FieldLabel from '../components/FieldLabel';
import { HELP } from '../help';

interface AssetsPanelProps {
  battery: BatteryParams;
  dhw: DHWTankParams;
  onBatteryChange: (params: BatteryParams) => void;
  onDhwChange: (params: DHWTankParams) => void;
}

const numberInputClasses = 'w-full rounded border border-slate-300 p-2';

const AssetsPanel: React.FC<AssetsPanelProps> = ({ battery, dhw, onBatteryChange, onDhwChange }) => {
  const updateBattery = (key: keyof BatteryParams, value: number) => {
    onBatteryChange({ ...battery, [key]: value });
  };
  const updateDhw = (key: keyof DHWTankParams, value: number) => {
    onDhwChange({ ...dhw, [key]: value });
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
    </section>
  );
};

export default AssetsPanel;
