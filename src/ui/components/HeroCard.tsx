import React from 'react';

interface HeroCardProps {
  title: string;
  subtitle?: string;
  metric?: {
    label: string;
    value: string;
    icon?: string;
  };
  children?: React.ReactNode;
}

/**
 * Hero card with dramatic gradient (Amplitude-inspired)
 * Used for highlighting key insights and primary metrics
 */
const HeroCard: React.FC<HeroCardProps> = ({ title, subtitle, metric, children }) => {
  return (
    <div className="relative overflow-hidden rounded-lg bg-gradient-to-br from-indigo-600 via-blue-600 to-indigo-900 p-8 shadow-hero">
      {/* Decorative gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-tr from-purple-500/20 via-transparent to-blue-500/20" />

      <div className="relative z-10">
        {/* Subtitle banner */}
        {subtitle && (
          <p className="mb-4 text-sm font-medium text-white/80">
            {subtitle}
          </p>
        )}

        {/* Main title */}
        <h2 className="mb-6 text-3xl font-bold leading-tight text-white">
          {title}
        </h2>

        {/* Metric display */}
        {metric && (
          <div className="mb-6 inline-flex items-center gap-3 rounded-lg bg-black/30 px-5 py-3 backdrop-blur-sm">
            {metric.icon && (
              <span className="text-2xl" role="img" aria-label="metric icon">
                {metric.icon}
              </span>
            )}
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-white/70">
                {metric.label}
              </p>
              <p className="text-2xl font-bold text-white">{metric.value}</p>
            </div>
          </div>
        )}

        {/* Custom content */}
        {children && (
          <div className="mt-6 rounded-lg bg-black/30 p-6 backdrop-blur-sm">
            {children}
          </div>
        )}
      </div>
    </div>
  );
};

export default HeroCard;
