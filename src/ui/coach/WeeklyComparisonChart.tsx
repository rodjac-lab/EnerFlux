import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import * as d3 from 'd3-shape';
import type { DailyResult } from '../../core/weekSimulation';

interface WeeklyComparisonChartProps {
  baselineData: readonly DailyResult[];
  mpcData: readonly DailyResult[];
  totalSavings_eur: number;
  showAnimation: boolean;
}

/**
 * Weekly comparison chart with Plotset-style zoom animation.
 * Shows baseline (gray) vs MPC (green) cost curves with savings area.
 *
 * Animation sequence (simplified progressive reveal):
 * 1. Curves draw progressively left to right (0-3s)
 * 2. Day labels cascade in (2-5s, stagger 0.4s)
 * 3. Savings area fades in (3-3.5s)
 * 4. Total savings counter animates (3.5s+)
 *
 * Note: Full Plotset zoom effect (Monday full-width → compress → cascade)
 * would require complex coordinate transformations. Current implementation
 * uses progressive pathLength reveal for smooth, performant animation.
 */
const WeeklyComparisonChart: React.FC<WeeklyComparisonChartProps> = ({
  baselineData,
  mpcData,
  totalSavings_eur,
  showAnimation
}) => {
  const dayNames = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];

  // Chart dimensions
  const width = 800;
  const height = 400;
  const margin = { top: 40, right: 40, bottom: 60, left: 60 };
  const chartWidth = width - margin.left - margin.right;
  const chartHeight = height - margin.top - margin.bottom;

  // Extract daily costs
  const baselineCosts = useMemo(
    () => baselineData.map((d) => d.kpis.net_cost_with_penalties),
    [baselineData]
  );
  const mpcCosts = useMemo(
    () => mpcData.map((d) => d.kpis.net_cost_with_penalties),
    [mpcData]
  );

  // Y-axis scale (cost in €)
  const maxCost = Math.max(...baselineCosts, ...mpcCosts);
  const minCost = Math.min(...baselineCosts, ...mpcCosts);
  const yPadding = (maxCost - minCost) * 0.1;
  const yMin = Math.max(0, minCost - yPadding);
  const yMax = maxCost + yPadding;

  // Generate full-week SVG paths (will be clipped for animation)
  const baselinePath = useMemo(() => {
    const line = d3
      .line<number>()
      .x((d, i) => (i / 6) * chartWidth)
      .y((d) => chartHeight - ((d - yMin) / (yMax - yMin)) * chartHeight)
      .curve(d3.curveMonotoneX);

    return line(baselineCosts) || '';
  }, [baselineCosts, chartWidth, chartHeight, yMin, yMax]);

  const mpcPath = useMemo(() => {
    const line = d3
      .line<number>()
      .x((d, i) => (i / 6) * chartWidth)
      .y((d) => chartHeight - ((d - yMin) / (yMax - yMin)) * chartHeight)
      .curve(d3.curveMonotoneX);

    return line(mpcCosts) || '';
  }, [mpcCosts, chartWidth, chartHeight, yMin, yMax]);

  // Savings area path (between baseline and MPC)
  const savingsAreaPath = useMemo(() => {
    const area = d3
      .area<{ baseline: number; mpc: number }>()
      .x((d, i) => (i / 6) * chartWidth)
      .y0((d) => chartHeight - ((d.mpc - yMin) / (yMax - yMin)) * chartHeight)
      .y1((d) => chartHeight - ((d.baseline - yMin) / (yMax - yMin)) * chartHeight)
      .curve(d3.curveMonotoneX);

    const data = baselineCosts.map((baseline, i) => ({
      baseline,
      mpc: mpcCosts[i]
    }));

    return area(data) || '';
  }, [baselineCosts, mpcCosts, chartWidth, chartHeight, yMin, yMax]);

  // Y-axis ticks
  const yTicks = useMemo(() => {
    const tickCount = 5;
    const step = (yMax - yMin) / (tickCount - 1);
    return Array.from({ length: tickCount }, (_, i) => yMin + i * step);
  }, [yMin, yMax]);

  return (
    <div className="rounded-lg border border-border bg-surface p-6 shadow-sm">
      {/* Header */}
      <div className="mb-4">
        <h3 className="text-sm font-semibold text-text">
          📊 Évolution hebdomadaire - Coûts & Économies
        </h3>
        <div className="mt-2 space-y-1 text-xs text-text-secondary">
          <p>
            <span className="font-medium text-muted">Courbe grise (Baseline)</span> : Stratégie fixe{' '}
            <code className="rounded bg-bg px-1 py-0.5 text-[10px]">ecs_first</code> sans anticipation des prévisions météo
          </p>
          <p>
            <span className="font-medium text-emerald-600">Courbe verte (MPC)</span> : Optimisation prédictive avec anticipation (soleil/nuages demain, Tempo rouge, etc.)
          </p>
          <p className="text-muted italic">
            💡 L'écart entre les courbes dépend des prévisions météo et de la stratégie MPC choisie
          </p>
        </div>
      </div>

      {/* SVG Chart */}
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full">
        <defs>
          {/* Gradient for savings area */}
          <linearGradient id="savingsGradient" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#10b981" stopOpacity="0.3" />
            <stop offset="100%" stopColor="#10b981" stopOpacity="0.1" />
          </linearGradient>
        </defs>

        <g transform={`translate(${margin.left}, ${margin.top})`}>
          {/* Y-axis */}
          <motion.g
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.3 }}
          >
            <line x1={0} y1={0} x2={0} y2={chartHeight} stroke="#cbd5e1" strokeWidth={2} />
            {yTicks.map((tick) => {
              const y = chartHeight - ((tick - yMin) / (yMax - yMin)) * chartHeight;
              return (
                <g key={tick}>
                  <line x1={-5} y1={y} x2={0} y2={y} stroke="#cbd5e1" strokeWidth={1} />
                  <text x={-10} y={y} textAnchor="end" alignmentBaseline="middle" className="text-xs fill-slate-600">
                    {tick.toFixed(2)}€
                  </text>
                </g>
              );
            })}
          </motion.g>

          {/* X-axis */}
          <motion.g
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.3 }}
          >
            <line x1={0} y1={chartHeight} x2={chartWidth} y2={chartHeight} stroke="#cbd5e1" strokeWidth={2} />
            {dayNames.map((day, i) => {
              const x = (i / 6) * chartWidth;
              return (
                <motion.g
                  key={day}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 2 + i * 0.4, duration: 0.5 }}
                >
                  <line x1={x} y1={chartHeight} x2={x} y2={chartHeight + 5} stroke="#cbd5e1" strokeWidth={1} />
                  <text
                    x={x}
                    y={chartHeight + 20}
                    textAnchor="middle"
                    className="text-xs font-medium fill-slate-700"
                  >
                    {day}
                  </text>
                </motion.g>
              );
            })}
          </motion.g>

          {/* Savings area (fill between curves) */}
          <motion.path
            d={savingsAreaPath}
            fill="url(#savingsGradient)"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 3, duration: 0.5 }}
          />

          {/* Baseline curve (gray) with progressive reveal */}
          <motion.path
            d={baselinePath}
            stroke="#94a3b8"
            strokeWidth={3}
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{
              duration: 3,
              ease: 'easeOut'
            }}
          />

          {/* MPC curve (green) with progressive reveal */}
          <motion.path
            d={mpcPath}
            stroke="#10b981"
            strokeWidth={3}
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{
              duration: 3,
              delay: 0.2,
              ease: 'easeOut'
            }}
          />

          {/* Legend */}
          <motion.g
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1, duration: 0.5 }}
          >
            {/* Baseline legend */}
            <line x1={chartWidth - 180} y1={20} x2={chartWidth - 150} y2={20} stroke="#94a3b8" strokeWidth={3} />
            <text x={chartWidth - 145} y={20} alignmentBaseline="middle" className="text-xs fill-slate-600">
              Baseline (stratégie fixe)
            </text>

            {/* MPC legend */}
            <line x1={chartWidth - 180} y1={40} x2={chartWidth - 150} y2={40} stroke="#10b981" strokeWidth={3} />
            <text x={chartWidth - 145} y={40} alignmentBaseline="middle" className="text-xs fill-emerald-600">
              MPC Optimisé
            </text>
          </motion.g>
        </g>
      </svg>

      {/* Total savings display */}
      <motion.div
        className="mt-4 rounded-md bg-emerald-50 border border-emerald-200 p-4 text-center"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 3.5, duration: 0.5 }}
      >
        <p className="text-xs font-semibold text-emerald-700">💰 Économies totales</p>
        <motion.p
          className="text-2xl font-bold text-emerald-600"
          initial={{ scale: 0.8 }}
          animate={{ scale: 1 }}
          transition={{ delay: 3.7, duration: 0.3, type: 'spring' }}
        >
          {Math.abs(totalSavings_eur).toFixed(2)} €
        </motion.p>
        <p className="text-xs text-emerald-600">
          {totalSavings_eur > 0 ? 'économisés' : 'de surcoût'} sur la semaine
        </p>
      </motion.div>

      {/* Accessibility: prefers-reduced-motion */}
      <style>{`
        @media (prefers-reduced-motion: reduce) {
          * {
            animation-duration: 0.01ms !important;
            transition-duration: 0.01ms !important;
          }
        }
      `}</style>
    </div>
  );
};

export default WeeklyComparisonChart;
