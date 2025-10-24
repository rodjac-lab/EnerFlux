import type { SimulationResult } from '../../core/engine';
import type { CondensedKpiRow } from './CondensedKpiGrid';
import { formatDelta, formatEUR, formatPct, formatYears } from '../utils/ui';

/**
 * Builds the economic KPI rows displayed in the condensed KPI grid.
 */
export const buildEconomicRows = (
  resultA: SimulationResult | null | undefined,
  resultB: SimulationResult | null | undefined
): CondensedKpiRow[] => [
  {
    label: 'Investissement estimé',
    valueA: resultA?.kpis.euros.estimated_investment,
    valueB: resultB?.kpis.euros.estimated_investment,
    formatter: (value: number) => formatEUR(value, 0),
    deltaFormatter: (delta: number) => formatDelta(delta, 0, '€'),
    deltaThreshold: Number.POSITIVE_INFINITY,
    preferHigher: false,
    helpKey: 'investment'
  },
  {
    label: 'Coût import',
    valueA: resultA?.kpis.euros.cost_import,
    valueB: resultB?.kpis.euros.cost_import,
    formatter: (value: number) => formatEUR(value),
    deltaFormatter: (delta: number) => formatDelta(delta, 2, '€'),
    deltaThreshold: 0.1,
    preferHigher: false,
    helpKey: 'costImport'
  },
  {
    label: 'Revenu export',
    valueA: resultA?.kpis.euros.revenue_export,
    valueB: resultB?.kpis.euros.revenue_export,
    formatter: (value: number) => formatEUR(value),
    deltaFormatter: (delta: number) => formatDelta(delta, 2, '€'),
    deltaThreshold: 0.1,
    preferHigher: true,
    helpKey: 'revenueExport'
  },
  {
    label: 'Coût net',
    valueA: resultA?.kpis.euros.net_cost,
    valueB: resultB?.kpis.euros.net_cost,
    formatter: (value: number) => formatEUR(value),
    deltaFormatter: (delta: number) => formatDelta(delta, 2, '€'),
    deltaThreshold: 0.1,
    preferHigher: false,
    helpKey: 'netCost'
  },
  {
    label: 'Coût net (avec pénalités)',
    valueA: resultA?.kpis.net_cost_with_penalties,
    valueB: resultB?.kpis.net_cost_with_penalties,
    formatter: (value: number) => formatEUR(value),
    deltaFormatter: (delta: number) => formatDelta(delta, 2, '€'),
    deltaThreshold: 0.1,
    preferHigher: false,
    helpKey: 'netCostWithPenalties'
  },
  {
    label: 'Coût réseau seul',
    valueA: resultA?.kpis.euros.grid_only_cost,
    valueB: resultB?.kpis.euros.grid_only_cost,
    formatter: (value: number) => formatEUR(value),
    deltaFormatter: (delta: number) => formatDelta(delta, 2, '€'),
    deltaThreshold: Number.POSITIVE_INFINITY,
    preferHigher: false,
    helpKey: 'gridOnlyCost'
  },
  {
    label: 'Δ vs réseau seul',
    valueA: resultA?.kpis.euros.delta_vs_grid_only,
    valueB: resultB?.kpis.euros.delta_vs_grid_only,
    formatter: (value: number) => formatEUR(value),
    deltaFormatter: (delta: number) => formatDelta(delta, 2, '€'),
    deltaThreshold: 0.1,
    preferHigher: true,
    helpKey: 'deltaGrid'
  },
  {
    label: 'Taux d’économie vs réseau seul',
    valueA: resultA?.kpis.euros.savings_rate,
    valueB: resultB?.kpis.euros.savings_rate,
    formatter: (value: number) => formatPct(value, 1),
    deltaFormatter: (delta: number) => formatDelta(delta * 100, 1, ' %'),
    deltaThreshold: 0.005,
    preferHigher: true,
    helpKey: 'savingsRate'
  },
  {
    label: 'Temps de retour estimé',
    valueA: resultA?.kpis.euros.simple_payback_years ?? undefined,
    valueB: resultB?.kpis.euros.simple_payback_years ?? undefined,
    formatter: (value: number) => formatYears(value, 1),
    deltaFormatter: (delta: number) => formatDelta(delta, 1, ' ans'),
    deltaThreshold: 0.05,
    preferHigher: false,
    helpKey: 'payback'
  }
];
