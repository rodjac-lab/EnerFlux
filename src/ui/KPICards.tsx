import React from 'react';
import { ExportKPIs } from '../types/export';

interface KPICardsProps {
  kpis: {
    A: ExportKPIs;
    B: ExportKPIs;
  };
}

interface MetricDescriptor {
  key: keyof ExportKPIs;
  label: string;
  unit: string;
  format?: (value: number) => string;
}

const METRICS: MetricDescriptor[] = [
  { key: 'autoconsumption_pct', label: 'Autocons', unit: '%' },
  { key: 'autoproduct_pct', label: 'Autoprod', unit: '%' },
  { key: 'import_kWh', label: 'Import', unit: 'kWh' },
  { key: 'export_kWh', label: 'Export', unit: 'kWh' },
  { key: 'cost_EUR', label: 'Coût', unit: '€', format: (value) => value.toFixed(2) },
  { key: 'ecs_time_at_or_above_target_pct', label: 'ECS ≥ cible', unit: '%' }
];

const clamp = (value: number): number => {
  if (!Number.isFinite(value)) {
    return 0;
  }
  return value;
};

const valueToString = (value: number, metric: MetricDescriptor): string => {
  const formatted = metric.format ? metric.format(value) : value.toFixed(metric.unit === '%' ? 1 : 2);
  return `${formatted} ${metric.unit}`.trim();
};

const BarPair: React.FC<{ valueA: number; valueB: number }> = ({ valueA, valueB }) => {
  const max = Math.max(Math.abs(valueA), Math.abs(valueB), 1);
  const widthA = Math.round((Math.abs(valueA) / max) * 100);
  const widthB = Math.round((Math.abs(valueB) / max) * 100);
  return (
    <div className="mt-2 flex items-center gap-2" aria-hidden>
      <div className="flex-1">
        <div className="h-1 rounded bg-indigo-200">
          <div className="h-1 rounded bg-indigo-500" style={{ width: `${widthA}%` }} />
        </div>
      </div>
      <div className="flex-1">
        <div className="h-1 rounded bg-emerald-200">
          <div className="h-1 rounded bg-emerald-500" style={{ width: `${widthB}%` }} />
        </div>
      </div>
    </div>
  );
};

const KPICards: React.FC<KPICardsProps> = ({ kpis }) => {
  return (
    <section className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {METRICS.map((metric) => {
        const valueA = clamp(kpis.A[metric.key]);
        const valueB = clamp(kpis.B[metric.key]);
        return (
          <article key={metric.key as string} className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
            <header className="flex items-center justify-between text-sm font-semibold text-slate-600">
              <span>{metric.label}</span>
              <span className="text-xs text-slate-400">A vs B</span>
            </header>
            <dl className="mt-3 flex justify-between text-sm text-slate-900">
              <div>
                <dt className="text-xs uppercase tracking-wide text-slate-500">Stratégie A</dt>
                <dd className="font-medium" data-testid={`kpi-${metric.key}-A`}>
                  {valueToString(valueA, metric)}
                </dd>
              </div>
              <div className="text-right">
                <dt className="text-xs uppercase tracking-wide text-slate-500">Stratégie B</dt>
                <dd className="font-medium" data-testid={`kpi-${metric.key}-B`}>
                  {valueToString(valueB, metric)}
                </dd>
              </div>
            </dl>
            <BarPair valueA={valueA} valueB={valueB} />
          </article>
        );
      })}
    </section>
  );
};

export default KPICards;

