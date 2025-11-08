import React, { useMemo, useState } from 'react';
import type { ExportV1 } from '../types/export';
import { buildSeries, sliceSeriesWithWindow, WindowFilter } from '../data/series';
import { computeKPIsForWindow } from '../data/kpis';
import KPICards from './KPICards';
import EnergyFlowsChart from './charts/EnergyFlowsChart';
import BatterySocChart from './charts/BatterySocChart';
import DhwPanel from './charts/DhwPanel';
import DecisionsTimeline from './charts/DecisionsTimeline';
import ExportBar from './ExportBar';
import { ChartSyncProvider } from './chartSync';

interface ABCompareLayoutProps {
  trace: ExportV1;
  window?: WindowFilter;
}

const QUICK_WINDOWS: Record<string, WindowFilter> = {
  morning: { startH: 6, endH: 12 },
  midday: { startH: 11, endH: 16 }
};

const ABCompareLayout: React.FC<ABCompareLayoutProps> = ({ trace, window: initialWindow }) => {
  const [window, setWindow] = useState<WindowFilter | undefined>(initialWindow);
  const built = useMemo(() => buildSeries(trace), [trace]);
  const { seriesA, seriesB } = useMemo(() => sliceSeriesWithWindow(built, window), [built, window]);
  const kpis = useMemo(() => computeKPIsForWindow(trace, window), [trace, window]);

  const deadlineWindow = useMemo(() => {
    const hour = trace.meta.dhwConfig.deadlineHour;
    if (typeof hour !== 'number') {
      return undefined;
    }
    const startH = Math.max(hour - 2, 0);
    const endH = Math.min(hour + 2, 24);
    return { startH, endH } as WindowFilter;
  }, [trace.meta.dhwConfig.deadlineHour]);

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-text">Comparatif A/B</h2>
          <p className="text-sm text-text-secondary">Stratégie A: {trace.meta.strategyA.id} · Stratégie B: {trace.meta.strategyB.id}</p>
        </div>
        <ExportBar trace={trace} window={window} />
      </header>

      <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Zoom rapide">
        <button
          type="button"
          className="rounded border border-border px-3 py-1 text-sm text-text hover:bg-surface"
          onClick={() => setWindow(QUICK_WINDOWS.morning)}
        >
          Zoom Morning
        </button>
        <button
          type="button"
          className="rounded border border-border px-3 py-1 text-sm text-text hover:bg-surface"
          onClick={() => setWindow(QUICK_WINDOWS.midday)}
        >
          Zoom Midday
        </button>
        <button
          type="button"
          className="rounded border border-border px-3 py-1 text-sm text-text hover:bg-surface"
          onClick={() => deadlineWindow && setWindow(deadlineWindow)}
          disabled={!deadlineWindow}
        >
          Go to Deadline
        </button>
        <button
          type="button"
          className="rounded bg-text px-3 py-1 text-sm font-semibold text-bg hover:bg-text-secondary"
          onClick={() => setWindow(undefined)}
        >
          Reset
        </button>
        {window ? (
          <span className="text-xs text-text-secondary">Fenêtre: {window.startH}h → {window.endH}h</span>
        ) : (
          <span className="text-xs text-muted">Fenêtre: journée complète</span>
        )}
      </div>

      <KPICards kpis={kpis} />

      <ChartSyncProvider>
        <div className="grid gap-6 lg:grid-cols-2">
          <Panel variant="A" series={seriesA} meta={trace.meta} />
          <Panel variant="B" series={seriesB} meta={trace.meta} />
        </div>
      </ChartSyncProvider>
    </div>
  );
};

interface PanelProps {
  variant: 'A' | 'B';
  series: ReturnType<typeof sliceSeriesWithWindow>['seriesA'];
  meta: ExportV1['meta'];
}

const Panel: React.FC<PanelProps> = ({ variant, series, meta }) => {
  return (
    <section className="space-y-4 rounded-xl border border-border bg-surface p-4 shadow-sm">
      <header className="flex items-center justify-between">
        <h3 className="text-base font-semibold text-text">Stratégie {variant}</h3>
        <span className="text-xs text-muted">{meta[`strategy${variant}` as const].id}</span>
      </header>
      <EnergyFlowsChart series={series.energy} variant={variant} />
      <DecisionsTimeline series={series} meta={meta} variant={variant} />
      <DhwPanel series={series.dhw} meta={meta} variant={variant} />
      <BatterySocChart series={series.battery} meta={meta} variant={variant} />
    </section>
  );
};

export default ABCompareLayout;

