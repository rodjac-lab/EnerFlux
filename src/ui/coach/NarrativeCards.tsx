import React from 'react';
import type { WeeklyNarrative, Insight, InsightPriority } from '../../core/mpc';
import CollapsibleCard from '../components/CollapsibleCard';

interface NarrativeCardsProps {
  narrative: WeeklyNarrative;
  showAnimation: boolean;
}

/**
 * AI narrative insights cards with Plotset-style slide-in animations.
 * Uses CollapsibleCard component (reused from existing UI).
 * High-priority insights are expanded by default.
 */
const NarrativeCards: React.FC<NarrativeCardsProps> = ({ narrative, showAnimation }) => {
  // Priority-based icon mapping
  const getPriorityIcon = (priority: InsightPriority): string => {
    switch (priority) {
      case 'critical':
        return '🚨';
      case 'high':
        return '⚠️';
      case 'medium':
        return '💡';
      case 'low':
        return 'ℹ️';
      default:
        return '📌';
    }
  };

  // Category-based color mapping
  const getCategoryColor = (category: string): string => {
    switch (category) {
      case 'weather':
        return 'text-amber-600';
      case 'tariff':
        return 'text-violet-600';
      case 'strategy':
        return 'text-indigo-600';
      case 'savings':
        return 'text-emerald-600';
      case 'comfort':
        return 'text-blue-600';
      case 'alert':
        return 'text-rose-600';
      default:
        return 'text-slate-600';
    }
  };

  // Determine if card should be open by default (high/critical priority)
  const shouldDefaultOpen = (priority: InsightPriority): boolean => {
    return priority === 'high' || priority === 'critical';
  };

  // Base delay for narrative section
  const BASE_DELAY = 1500; // Start after KPIs (t=1.5s)
  const STAGGER = 150; // 150ms between insight cards

  return (
    <section className="space-y-4">
      {/* Section header */}
      <div
        style={{
          opacity: showAnimation ? 0 : 1,
          transform: showAnimation ? 'translateX(-16px)' : 'translateX(0)',
          animation: showAnimation
            ? `slideInLeft 800ms cubic-bezier(0.16, 1, 0.3, 1) ${BASE_DELAY}ms both`
            : 'none'
        }}
      >
        <h3 className="text-sm font-semibold text-slate-700">Conseils de votre coach IA 🧠</h3>
        <p className="mt-1 text-xs text-slate-500">
          Recommandations personnalisées basées sur les prévisions de la semaine
        </p>
      </div>

      {/* Insights cards */}
      <div className="space-y-3">
        {narrative.insights.map((insight, idx) => {
          const icon = getPriorityIcon(insight.priority);
          const color = getCategoryColor(insight.category);
          const defaultOpen = shouldDefaultOpen(insight.priority);
          const cardDelay = showAnimation ? BASE_DELAY + (idx + 1) * STAGGER : 0;

          return (
            <div
              key={`${insight.category}-${idx}`}
              style={{
                opacity: showAnimation ? 0 : 1,
                transform: showAnimation ? 'translateX(-16px)' : 'translateX(0)',
                animation: showAnimation
                  ? `slideInLeft 800ms cubic-bezier(0.16, 1, 0.3, 1) ${cardDelay}ms both`
                  : 'none'
              }}
            >
              <CollapsibleCard
                title={
                  <div className="flex items-center gap-2">
                    <span className="text-lg">{icon}</span>
                    <span className={`font-semibold ${color}`}>{insight.title}</span>
                  </div>
                }
                description={insight.description}
                defaultOpen={defaultOpen}
              >
                {/* Insight details */}
                <div className="space-y-3">
                  {/* Recommendations */}
                  {insight.recommendations && insight.recommendations.length > 0 && (
                    <div>
                      <h4 className="mb-2 text-xs font-semibold text-slate-700">Recommandations :</h4>
                      <ul className="space-y-1">
                        {insight.recommendations.map((rec, recIdx) => (
                          <li key={recIdx} className="flex items-start gap-2 text-xs text-slate-600">
                            <span className="mt-0.5 text-emerald-600">✓</span>
                            <span>{rec}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Impact metrics (if provided) */}
                  {insight.impact && (
                    <div className="rounded-md bg-slate-50 p-3">
                      <h4 className="mb-2 text-xs font-semibold text-slate-700">Impact estimé :</h4>
                      <div className="grid gap-2 sm:grid-cols-2">
                        {insight.impact.costSaving_eur !== undefined && (
                          <div className="text-xs">
                            <span className="text-slate-500">Économie : </span>
                            <span className="font-semibold text-emerald-600">
                              {insight.impact.costSaving_eur.toFixed(2)} €
                            </span>
                          </div>
                        )}
                        {insight.impact.energySaving_kWh !== undefined && (
                          <div className="text-xs">
                            <span className="text-slate-500">Énergie économisée : </span>
                            <span className="font-semibold text-emerald-600">
                              {insight.impact.energySaving_kWh.toFixed(1)} kWh
                            </span>
                          </div>
                        )}
                        {insight.impact.comfortGain_percent !== undefined && (
                          <div className="text-xs">
                            <span className="text-slate-500">Gain confort : </span>
                            <span className="font-semibold text-blue-600">
                              +{insight.impact.comfortGain_percent.toFixed(0)} %
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Days concerned (if specified) */}
                  {insight.daysConcerned && insight.daysConcerned.length > 0 && (
                    <div className="text-xs text-slate-500">
                      <span className="font-medium">Jours concernés : </span>
                      {insight.daysConcerned.map((d) => `J${d + 1}`).join(', ')}
                    </div>
                  )}
                </div>
              </CollapsibleCard>
            </div>
          );
        })}
      </div>

      {/* Weekly summary card (always at the end) */}
      <div
        style={{
          opacity: showAnimation ? 0 : 1,
          transform: showAnimation ? 'translateX(-16px)' : 'translateX(0)',
          animation: showAnimation
            ? `slideInLeft 800ms cubic-bezier(0.16, 1, 0.3, 1) ${
                BASE_DELAY + (narrative.insights.length + 1) * STAGGER
              }ms both`
            : 'none'
        }}
      >
        <CollapsibleCard
          title={
            <div className="flex items-center gap-2">
              <span className="text-lg">📊</span>
              <span className="font-semibold text-slate-700">Résumé de la semaine</span>
            </div>
          }
          description="Vue d'ensemble de votre stratégie"
          defaultOpen={false}
        >
          <div className="space-y-2 text-sm text-slate-600">
            <p>{narrative.summary}</p>
            {narrative.weeklyHighlight && (
              <div className="mt-3 rounded-md bg-indigo-50 p-3">
                <p className="text-xs font-semibold text-indigo-700">Point clé de la semaine :</p>
                <p className="mt-1 text-xs text-indigo-600">{narrative.weeklyHighlight}</p>
              </div>
            )}
          </div>
        </CollapsibleCard>
      </div>

      {/* CSS keyframes */}
      <style>{`
        @keyframes slideInLeft {
          from {
            opacity: 0;
            transform: translateX(-16px);
          }
          to {
            opacity: 1;
            transform: translateX(0);
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

export default NarrativeCards;
