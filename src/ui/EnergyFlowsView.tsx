import React, { useMemo } from 'react';
import type { ExportV1 } from '../types/export';
import type { StepFlows } from '../data/types';
import { buildSeries } from '../data/series';
import { summarizeFlows } from '../core/kpis';
import EnergyFlowDiagram from './charts/EnergyFlowDiagram';
import SankeyChart from './charts/SankeyChart';
import { buildSankeyData } from './utils/sankeyData';

interface EnergyFlowsViewProps {
  trace: ExportV1;
  flowsA?: StepFlows[];
  flowsB?: StepFlows[];
}

const EnergyFlowsView: React.FC<EnergyFlowsViewProps> = ({ trace, flowsA, flowsB }) => {
  const built = useMemo(() => buildSeries(trace), [trace]);

  // Calculate flow summaries for Sankey diagrams
  const flowSummaryA = useMemo(() => {
    if (!flowsA || flowsA.length === 0) {
      return null;
    }
    return summarizeFlows(flowsA, trace.meta.dt_s).total_kWh;
  }, [flowsA, trace.meta.dt_s]);

  const flowSummaryB = useMemo(() => {
    if (!flowsB || flowsB.length === 0) {
      return null;
    }
    return summarizeFlows(flowsB, trace.meta.dt_s).total_kWh;
  }, [flowsB, trace.meta.dt_s]);

  const sankeyDataA = useMemo(() =>
    flowSummaryA ? buildSankeyData(flowSummaryA) : { nodes: [], links: [] },
    [flowSummaryA]
  );

  const sankeyDataB = useMemo(() =>
    flowSummaryB ? buildSankeyData(flowSummaryB) : { nodes: [], links: [] },
    [flowSummaryB]
  );

  return (
    <div className="space-y-8">
      {/* Sankey Diagrams Side-by-Side */}
      <div>
        <h3 className="text-base font-semibold text-text mb-4">
          Flux énergétiques cumulés (kWh)
        </h3>
        <p className="text-sm text-text-secondary mb-6">
          Diagrammes de Sankey montrant la répartition des flux d'énergie totaux sur la période de simulation.
          La largeur des liens est proportionnelle à l'énergie transférée.
        </p>
        <div className="grid gap-6 lg:grid-cols-2">
          <div className="rounded-lg border border-border bg-surface p-4">
            <h4 className="text-sm font-semibold text-slate-700 mb-3">
              Stratégie A · {trace.meta.strategyA.id}
            </h4>
            <SankeyChart data={sankeyDataA} variant="A" width={600} height={400} />
          </div>
          <div className="rounded-lg border border-border bg-surface p-4">
            <h4 className="text-sm font-semibold text-slate-700 mb-3">
              Stratégie B · {trace.meta.strategyB.id}
            </h4>
            <SankeyChart data={sankeyDataB} variant="B" width={600} height={400} />
          </div>
        </div>
      </div>

      {/* Energy Flow Diagrams Side-by-Side */}
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-lg border border-border bg-surface p-4">
          <h3 className="text-sm font-semibold text-slate-700 mb-3">
            Stratégie A · {trace.meta.strategyA.id}
          </h3>
          <EnergyFlowDiagram series={built.seriesA.energy} variant="A" />
        </div>
        <div className="rounded-lg border border-border bg-surface p-4">
          <h3 className="text-sm font-semibold text-slate-700 mb-3">
            Stratégie B · {trace.meta.strategyB.id}
          </h3>
          <EnergyFlowDiagram series={built.seriesB.energy} variant="B" />
        </div>
      </div>
    </div>
  );
};

export default EnergyFlowsView;
