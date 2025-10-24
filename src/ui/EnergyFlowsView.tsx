import React, { useMemo } from 'react';
import type { ExportV1 } from '../types/export';
import { buildSeries } from '../data/series';
import EnergyFlowDiagram from './charts/EnergyFlowDiagram';

interface EnergyFlowsViewProps {
  trace: ExportV1;
}

const EnergyFlowsView: React.FC<EnergyFlowsViewProps> = ({ trace }) => {
  const built = useMemo(() => buildSeries(trace), [trace]);

  return (
    <div className="space-y-8">
      {/* Energy Flow Diagrams Side-by-Side */}
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
          <h3 className="text-sm font-semibold text-slate-700 mb-3">
            Stratégie A · {trace.meta.strategyA.id}
          </h3>
          <EnergyFlowDiagram series={built.seriesA.energy} variant="A" />
        </div>
        <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
          <h3 className="text-sm font-semibold text-slate-700 mb-3">
            Stratégie B · {trace.meta.strategyB.id}
          </h3>
          <EnergyFlowDiagram series={built.seriesB.energy} variant="B" />
        </div>
      </div>

      {/* Placeholder for Future Sankey Chart */}
      <div className="rounded-lg border-2 border-dashed border-slate-300 bg-slate-50/50 p-8">
        <div className="text-center">
          <h3 className="text-sm font-semibold text-slate-600 mb-2">Diagramme de Sankey</h3>
          <p className="text-xs text-slate-500">
            Visualisation des flux énergétiques globaux entre sources et consommations
          </p>
          <p className="text-xs text-slate-400 mt-2 italic">À venir prochainement</p>
        </div>
      </div>
    </div>
  );
};

export default EnergyFlowsView;
