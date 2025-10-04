import React, { useMemo } from 'react';
import KpiItem from '../components/KpiItem';
import Tooltip from '../components/Tooltip';
import { HELP } from '../help';

type HelpKey = keyof typeof HELP.kpi;

type ValueFormatter = (value: number) => string;

type DeltaFormatter = (delta: number) => string;

export interface CondensedKpiRow {
  id?: string;
  label: string;
  valueA?: number;
  valueB?: number;
  formatter: ValueFormatter;
  deltaFormatter?: DeltaFormatter;
  deltaThreshold?: number;
  preferHigher?: boolean;
  helpKey?: HelpKey;
}

export interface CondensedKpiGroup {
  id: string;
  title: string;
  description?: string;
  variant?: 'table' | 'cards';
  rows: CondensedKpiRow[];
}

interface CondensedKpiGridProps {
  groups: CondensedKpiGroup[];
  emptyMessage?: string;
}

const renderDeltaBadge = (
  delta: number,
  threshold: number,
  formatter: DeltaFormatter,
  preferHigher: boolean
): JSX.Element | null => {
  if (!Number.isFinite(threshold)) {
    return null;
  }
  const magnitude = Math.abs(delta);
  let color = 'bg-slate-200 text-slate-700';
  if (magnitude >= threshold) {
    const isImprovement = preferHigher ? delta > 0 : delta < 0;
    color = isImprovement ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800';
  }
  return (
    <span className={`ml-2 inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold ${color}`}>
      Δ {formatter(delta)}
    </span>
  );
};

const cardInfoIconClasses =
  'ml-1 inline-flex h-4 w-4 items-center justify-center rounded-full bg-slate-700/20 text-[10px] font-semibold text-slate-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-400';

const CondensedKpiGrid: React.FC<CondensedKpiGridProps> = ({
  groups,
  emptyMessage = 'Données non disponibles pour le moment.'
}) => {
  const hasAnyValues = useMemo(
    () =>
      groups.some((group) =>
        group.rows.some((row) => row.valueA !== undefined || row.valueB !== undefined)
      ),
    [groups]
  );

  if (!hasAnyValues) {
    return <p className="text-sm text-slate-500">{emptyMessage}</p>;
  }

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
      {groups.map((group) => {
        const variant = group.variant ?? 'table';
        const rows = group.rows;
        if (!rows.length) {
          return null;
        }

        if (variant === 'cards') {
          return (
            <section key={group.id} className="space-y-3">
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-semibold text-slate-600">{group.title}</h3>
                {group.description ? (
                  <Tooltip content={group.description}>
                    <span tabIndex={0} aria-label="Informations" className={cardInfoIconClasses}>
                      ⓘ
                    </span>
                  </Tooltip>
                ) : null}
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {rows.map((row) => {
                  const valueA = row.valueA;
                  const valueB = row.valueB;
                  const hasBoth = valueA !== undefined && valueB !== undefined;
                  const deltaBadge = hasBoth
                    ? renderDeltaBadge(
                        valueA - valueB,
                        row.deltaThreshold ?? 0,
                        row.deltaFormatter ?? row.formatter,
                        row.preferHigher ?? true
                      )
                    : null;
                  const helpText = row.helpKey ? HELP.kpi[row.helpKey] : undefined;
                  return (
                    <div
                      key={row.id ?? row.label}
                      className="rounded border border-slate-200 bg-white p-4 shadow-sm"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center text-sm font-semibold text-slate-700">
                          <span>{row.label}</span>
                          {helpText ? (
                            <Tooltip content={helpText}>
                              <span tabIndex={0} aria-label="Informations" className={cardInfoIconClasses}>
                                ⓘ
                              </span>
                            </Tooltip>
                          ) : null}
                        </div>
                        {deltaBadge}
                      </div>
                      <dl className="mt-3 space-y-2 text-sm text-slate-800">
                        <div className="flex items-center justify-between">
                          <dt className="text-slate-500">Stratégie A</dt>
                          <dd>{valueA !== undefined ? row.formatter(valueA) : '—'}</dd>
                        </div>
                        <div className="flex items-center justify-between">
                          <dt className="text-slate-500">Stratégie B</dt>
                          <dd>{valueB !== undefined ? row.formatter(valueB) : '—'}</dd>
                        </div>
                      </dl>
                    </div>
                  );
                })}
              </div>
            </section>
          );
        }

        return (
          <section key={group.id} className="space-y-3">
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-semibold text-slate-600">{group.title}</h3>
              {group.description ? (
                <Tooltip content={group.description}>
                  <span tabIndex={0} aria-label="Informations" className={cardInfoIconClasses}>
                    ⓘ
                  </span>
                </Tooltip>
              ) : null}
            </div>
            <div className="overflow-x-auto rounded border border-slate-200">
              <table className="min-w-full divide-y divide-slate-200 text-sm">
                <thead>
                  <tr className="text-left text-slate-600">
                    <th className="py-2 pl-3 pr-2 font-medium">Indicateur</th>
                    <th className="py-2 px-2 font-medium">Stratégie A</th>
                    <th className="py-2 px-2 font-medium">Stratégie B</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {rows.map((row) => {
                    const valueA = row.valueA;
                    const valueB = row.valueB;
                    const hasBoth = valueA !== undefined && valueB !== undefined;
                    const deltaBadge = hasBoth
                      ? renderDeltaBadge(
                          valueA - valueB,
                          row.deltaThreshold ?? 0,
                          row.deltaFormatter ?? row.formatter,
                          row.preferHigher ?? true
                        )
                      : null;
                    const help = row.helpKey ? HELP.kpi[row.helpKey] : undefined;
                    return (
                      <KpiItem
                        key={row.id ?? row.label}
                        label={row.label}
                        valueA={valueA !== undefined ? row.formatter(valueA) : '—'}
                        valueB={valueB !== undefined ? row.formatter(valueB) : '—'}
                        delta={deltaBadge}
                        help={help}
                      />
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>
        );
      })}
    </div>
  );
};

export default CondensedKpiGrid;
