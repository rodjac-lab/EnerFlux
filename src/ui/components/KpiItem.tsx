import React from 'react';
import Tooltip from './Tooltip';

interface KpiItemProps {
  label: React.ReactNode;
  valueA: React.ReactNode;
  valueB: React.ReactNode;
  delta?: React.ReactNode;
  help?: string;
}

const infoIconClasses =
  'ml-1 inline-flex h-4 w-4 items-center justify-center rounded-full bg-slate-700/20 text-[10px] font-semibold text-slate-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-400';

const KpiItem: React.FC<KpiItemProps> = ({ label, valueA, valueB, delta, help }) => {
  return (
    <tr>
      <td className="py-2 font-medium text-slate-700">
        <div className="flex items-center">
          <span>{label}</span>
          {help ? (
            <Tooltip content={help}>
              <span tabIndex={0} aria-label="Informations" className={infoIconClasses}>
                ⓘ
              </span>
            </Tooltip>
          ) : null}
          {delta ?? null}
        </div>
      </td>
      <td className="py-2 text-slate-800">{valueA}</td>
      <td className="py-2 text-slate-800">{valueB}</td>
    </tr>
  );
};

export default KpiItem;
