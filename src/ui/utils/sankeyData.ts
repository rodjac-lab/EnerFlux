import type { FlowSummaryKWh } from '../../data/types';

export interface SankeyNode {
  name: string;
}

export interface SankeyLink {
  source: number;
  target: number;
  value: number;
}

export interface SankeyData {
  nodes: SankeyNode[];
  links: SankeyLink[];
}

/**
 * Transforms flow summary data (kWh totals) into Sankey diagram format.
 * Filters out negligible flows (< 0.01 kWh) for visual clarity.
 *
 * Node indices:
 * Sources: 0=PV, 1=Batterie, 2=Réseau
 * Destinations: 3=Charge base, 4=ECS, 5=Chauffage, 6=Piscine, 7=VE, 8=Batterie (charge), 9=Réseau (export)
 */
export function buildSankeyData(flowSummary: FlowSummaryKWh): SankeyData {
  const MIN_FLOW_KWH = 0.01; // Minimum threshold to display a flow

  // Define all possible nodes
  const nodes: SankeyNode[] = [
    // Sources
    { name: 'PV' },           // 0
    { name: 'Batterie' },     // 1
    { name: 'Réseau' },       // 2
    // Destinations
    { name: 'Charge base' },  // 3
    { name: 'ECS' },          // 4
    { name: 'Chauffage' },    // 5
    { name: 'Piscine' },      // 6
    { name: 'VE' },           // 7
    { name: 'Batterie' },     // 8 (charge)
    { name: 'Réseau' }        // 9 (export)
  ];

  // Build all possible links with their values
  const allLinks: SankeyLink[] = [
    // PV → destinations
    { source: 0, target: 3, value: flowSummary.pv_to_load_kW },
    { source: 0, target: 4, value: flowSummary.pv_to_ecs_kW },
    { source: 0, target: 5, value: flowSummary.pv_to_heat_kW },
    { source: 0, target: 6, value: flowSummary.pv_to_pool_kW },
    { source: 0, target: 7, value: flowSummary.pv_to_ev_kW },
    { source: 0, target: 8, value: flowSummary.pv_to_batt_kW },
    { source: 0, target: 9, value: flowSummary.pv_to_grid_kW },

    // Batterie → destinations
    { source: 1, target: 3, value: flowSummary.batt_to_load_kW },
    { source: 1, target: 4, value: flowSummary.batt_to_ecs_kW },
    { source: 1, target: 5, value: flowSummary.batt_to_heat_kW },
    { source: 1, target: 6, value: flowSummary.batt_to_pool_kW },
    { source: 1, target: 7, value: flowSummary.batt_to_ev_kW },

    // Réseau → destinations
    { source: 2, target: 3, value: flowSummary.grid_to_load_kW },
    { source: 2, target: 4, value: flowSummary.grid_to_ecs_kW },
    { source: 2, target: 5, value: flowSummary.grid_to_heat_kW },
    { source: 2, target: 6, value: flowSummary.grid_to_pool_kW },
    { source: 2, target: 7, value: flowSummary.grid_to_ev_kW }
  ];

  // Filter out negligible flows
  const significantLinks = allLinks.filter(link => link.value >= MIN_FLOW_KWH);

  // Identify which nodes are actually used
  const usedNodeIndices = new Set<number>();
  significantLinks.forEach(link => {
    usedNodeIndices.add(link.source);
    usedNodeIndices.add(link.target);
  });

  // Build final node list with only used nodes
  const finalNodes: SankeyNode[] = [];
  const indexMap = new Map<number, number>(); // old index → new index

  Array.from(usedNodeIndices)
    .sort((a, b) => a - b)
    .forEach((oldIndex, newIndex) => {
      finalNodes.push(nodes[oldIndex]);
      indexMap.set(oldIndex, newIndex);
    });

  // Remap link indices to match new node array
  const finalLinks = significantLinks.map(link => ({
    source: indexMap.get(link.source)!,
    target: indexMap.get(link.target)!,
    value: link.value
  }));

  return {
    nodes: finalNodes,
    links: finalLinks
  };
}
