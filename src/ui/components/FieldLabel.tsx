import React from 'react';
import Tooltip from './Tooltip';

interface FieldLabelProps extends React.LabelHTMLAttributes<HTMLLabelElement> {
  label: React.ReactNode;
  help?: string;
  children: React.ReactNode;
}

const infoIconClasses =
  'ml-1 inline-flex h-4 w-4 items-center justify-center rounded-full bg-slate-700/20 text-[10px] font-semibold text-slate-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-400';

const FieldLabel: React.FC<FieldLabelProps> = ({ label, help, children, className = '', ...props }) => {
  return (
    <label className={`block text-sm text-slate-600 ${className}`.trim()} {...props}>
      <span className="mb-1 flex items-center">
        <span>{label}</span>
        {help ? (
          <Tooltip content={help}>
            <span tabIndex={0} aria-label="Informations" className={infoIconClasses}>
              ⓘ
            </span>
          </Tooltip>
        ) : null}
      </span>
      {children}
    </label>
  );
};

export default FieldLabel;
