import React, { useState, useEffect, useRef } from 'react';
import type { WeeklySimulationResult } from '../../core/mpc';

interface WeeklyKPICardsProps {
  kpis: WeeklySimulationResult['weeklyKPIs'];
  showAnimation: boolean;
}

/**
 * Custom hook for smooth counter animation with easeOutQuart easing.
 * Inspired by Plotset-style smooth number reveals.
 */
const useCountUp = (end: number, duration: number, delay: number): number => {
  const [count, setCount] = useState(0);
  const rafRef = useRef<number>();

  useEffect(() => {
    const startTime = performance.now() + delay;

    const animate = (currentTime: number) => {
      const elapsed = currentTime - startTime;

      if (elapsed < 0) {
        rafRef.current = requestAnimationFrame(animate);
        return;
      }

      const progress = Math.min(elapsed / duration, 1);

      // Easing: easeOutQuart (smooth deceleration like Plotset)
      const eased = 1 - Math.pow(1 - progress, 4);

      setCount(end * eased);

      if (progress < 1) {
        rafRef.current = requestAnimationFrame(animate);
      } else {
        setCount(end); // Ensure exact final value
      }
    };

    rafRef.current = requestAnimationFrame(animate);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [end, duration, delay]);

  return count;
};

/**
 * Weekly KPI cards with Plotset-style counter animations.
 * Cards fade-in with 100ms stagger, counters animate from 0 → final value.
 */
const WeeklyKPICards: React.FC<WeeklyKPICardsProps> = ({ kpis, showAnimation }) => {
  // Animation parameters
  const COUNTER_DURATION = 2500; // 2.5 seconds
  const BASE_DELAY = 1200; // Start counters at t=1.2s
  const STAGGER = 100; // 100ms between cards

  // Animated counters (only animate if showAnimation is true)
  const pvProduction = useCountUp(
    kpis.pvProduction_kWh,
    COUNTER_DURATION,
    showAnimation ? BASE_DELAY : 0
  );
  const consumption = useCountUp(
    kpis.consumption_kWh,
    COUNTER_DURATION,
    showAnimation ? BASE_DELAY + STAGGER : 0
  );
  const gridImport = useCountUp(
    kpis.gridImport_kWh,
    COUNTER_DURATION,
    showAnimation ? BASE_DELAY + STAGGER * 2 : 0
  );
  const gridExport = useCountUp(
    kpis.gridExport_kWh,
    COUNTER_DURATION,
    showAnimation ? BASE_DELAY + STAGGER * 3 : 0
  );
  const selfConsumption = useCountUp(
    kpis.selfConsumption_percent,
    COUNTER_DURATION,
    showAnimation ? BASE_DELAY + STAGGER * 4 : 0
  );
  const autarky = useCountUp(
    kpis.autarky_percent,
    COUNTER_DURATION,
    showAnimation ? BASE_DELAY + STAGGER * 5 : 0
  );
  const totalCost = useCountUp(
    kpis.netCostWithPenalties_eur,
    COUNTER_DURATION,
    showAnimation ? BASE_DELAY + STAGGER * 6 : 0
  );
  const ecsComfort = useCountUp(
    kpis.ecsComfortAvg * 100, // Convert to percentage
    COUNTER_DURATION,
    showAnimation ? BASE_DELAY + STAGGER * 7 : 0
  );

  // KPI definitions
  const metrics = [
    {
      key: 'pv',
      label: 'Production PV',
      value: showAnimation ? pvProduction : kpis.pvProduction_kWh,
      unit: 'kWh',
      decimals: 1,
      color: 'text-amber-600',
      bgColor: 'bg-amber-50',
      borderColor: 'border-amber-200'
    },
    {
      key: 'consumption',
      label: 'Consommation totale',
      value: showAnimation ? consumption : kpis.consumption_kWh,
      unit: 'kWh',
      decimals: 1,
      color: 'text-text-secondary',
      bgColor: 'bg-surface',
      borderColor: 'border-border'
    },
    {
      key: 'import',
      label: 'Import réseau',
      value: showAnimation ? gridImport : kpis.gridImport_kWh,
      unit: 'kWh',
      decimals: 1,
      color: 'text-rose-600',
      bgColor: 'bg-rose-50',
      borderColor: 'border-rose-200'
    },
    {
      key: 'export',
      label: 'Export réseau',
      value: showAnimation ? gridExport : kpis.gridExport_kWh,
      unit: 'kWh',
      decimals: 1,
      color: 'text-indigo-600',
      bgColor: 'bg-indigo-50',
      borderColor: 'border-indigo-200'
    },
    {
      key: 'selfcons',
      label: 'Autoconsommation',
      value: showAnimation ? selfConsumption : kpis.selfConsumption_percent,
      unit: '%',
      decimals: 1,
      color: 'text-emerald-600',
      bgColor: 'bg-emerald-50',
      borderColor: 'border-emerald-200'
    },
    {
      key: 'autarky',
      label: 'Autarcie',
      value: showAnimation ? autarky : kpis.autarky_percent,
      unit: '%',
      decimals: 1,
      color: 'text-teal-600',
      bgColor: 'bg-teal-50',
      borderColor: 'border-teal-200'
    },
    {
      key: 'cost',
      label: 'Coût net',
      value: showAnimation ? totalCost : kpis.netCostWithPenalties_eur,
      unit: '€',
      decimals: 2,
      color: 'text-violet-600',
      bgColor: 'bg-violet-50',
      borderColor: 'border-violet-200'
    },
    {
      key: 'ecs',
      label: 'Confort ECS',
      value: showAnimation ? ecsComfort : kpis.ecsComfortAvg * 100,
      unit: '%',
      decimals: 0,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
      borderColor: 'border-blue-200'
    }
  ];

  return (
    <section className="space-y-4">
      <h3 className="text-sm font-semibold text-text">KPIs hebdomadaires</h3>

      {/* Grid layout (4 columns on large screens) */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {metrics.map((metric, idx) => {
          // Fade-in delay for card (stagger 100ms)
          const cardDelay = showAnimation ? BASE_DELAY + idx * STAGGER : 0;

          return (
            <article
              key={metric.key}
              className={`rounded-lg border p-4 shadow-sm ${metric.bgColor} ${metric.borderColor}`}
              style={{
                opacity: showAnimation ? 0 : 1,
                transform: showAnimation ? 'translateY(16px)' : 'translateY(0)',
                animation: showAnimation
                  ? `fadeInUp 800ms cubic-bezier(0.16, 1, 0.3, 1) ${cardDelay}ms both`
                  : 'none'
              }}
            >
              {/* Label */}
              <header className="mb-2 text-xs font-semibold text-text-secondary">
                {metric.label}
              </header>

              {/* Animated Value */}
              <div className={`text-2xl font-bold ${metric.color}`}>
                {metric.value.toFixed(metric.decimals)}
                <span className="ml-1 text-sm font-normal">{metric.unit}</span>
              </div>
            </article>
          );
        })}
      </div>

      {/* CSS keyframes */}
      <style>{`
        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(16px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @media (prefers-reduced-motion: reduce) {
          * {
            animation-duration: 0.01ms !important;
            animation-iteration-count: 1 !important;
            transition-duration: 0.01ms !important;
          }
        }
      `}</style>
    </section>
  );
};

export default WeeklyKPICards;
