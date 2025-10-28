import React from 'react';
import type { WeeklyForecast } from '../../core/mpc';

interface WeekCalendarProps {
  forecast: WeeklyForecast;
  selectedDay: number | null;
  onDayClick: (day: number) => void;
  showAnimation: boolean;
}

/**
 * Week calendar with Plotset-style animations.
 * All 7 days appear together with subtle 50ms stagger.
 */
const WeekCalendar: React.FC<WeekCalendarProps> = ({
  forecast,
  selectedDay,
  onDayClick,
  showAnimation
}) => {
  // Weather icon mapping
  const getWeatherIcon = (description: string): string => {
    const desc = description.toLowerCase();
    if (desc.includes('sunny') || desc.includes('clear')) return '☀️';
    if (desc.includes('cloudy') || desc.includes('overcast')) return '☁️';
    if (desc.includes('rain') || desc.includes('shower')) return '🌧️';
    if (desc.includes('snow')) return '❄️';
    if (desc.includes('partly')) return '⛅';
    return '🌤️'; // Default
  };

  // Tempo color badge class
  const getTempoClass = (color?: string): string => {
    if (!color) return 'bg-slate-100 text-slate-600';
    const lower = color.toLowerCase();
    if (lower === 'blue') return 'bg-blue-100 text-blue-700';
    if (lower === 'white') return 'bg-slate-100 text-slate-700';
    if (lower === 'red') return 'bg-red-100 text-red-700';
    return 'bg-slate-100 text-slate-600';
  };

  // Day names (short form)
  const dayNames = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];

  return (
    <section
      className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm"
      style={{
        opacity: showAnimation ? 1 : 0,
        transform: showAnimation ? 'scale(1)' : 'scale(0.95)',
        transition: 'opacity 800ms cubic-bezier(0.16, 1, 0.3, 1) 0ms, transform 800ms cubic-bezier(0.16, 1, 0.3, 1) 0ms'
      }}
    >
      <h3 className="mb-4 text-sm font-semibold text-slate-700">Semaine à venir</h3>

      {/* 7-day grid */}
      <div className="grid grid-cols-7 gap-3">
        {forecast.weather.map((day, idx) => {
          const isSelected = selectedDay === idx;
          const icon = getWeatherIcon(day.description);
          const tariff = forecast.tariffs[idx];
          const tempoClass = getTempoClass(tariff?.tempoColor);

          // Parse date to get day name
          const dateObj = new Date(day.date);
          const dayName = dayNames[dateObj.getDay()];

          // Animation delays (50ms stagger between days)
          const dayDelay = showAnimation ? 300 + idx * 50 : 0;
          const iconDelay = showAnimation ? 400 + idx * 50 : 0;
          const badgeDelay = showAnimation ? 500 + idx * 50 : 0;

          return (
            <button
              key={day.date}
              type="button"
              onClick={() => onDayClick(idx)}
              className={`group relative rounded-lg border-2 p-3 text-center transition-all hover:border-indigo-400 hover:shadow-md ${
                isSelected
                  ? 'border-indigo-500 bg-indigo-50 shadow-md'
                  : 'border-slate-200 bg-white hover:bg-slate-50'
              }`}
              style={{
                opacity: showAnimation ? 1 : 0,
                animation: showAnimation ? `fadeIn 800ms ease-out ${dayDelay}ms both` : 'none'
              }}
            >
              {/* Day name */}
              <div className="mb-2 text-xs font-semibold text-slate-600">
                {dayName}
              </div>

              {/* Date */}
              <div className="mb-2 text-sm font-medium text-slate-900">
                {new Date(day.date).getDate()}
              </div>

              {/* Weather icon */}
              <div
                className="mb-2 text-2xl"
                style={{
                  opacity: showAnimation ? 1 : 0,
                  animation: showAnimation ? `fadeIn 600ms ease-out ${iconDelay}ms both` : 'none'
                }}
              >
                {icon}
              </div>

              {/* PV production estimate */}
              <div className="mb-2 text-xs font-medium text-emerald-600">
                {day.pvTotal_kWh?.toFixed(1) ?? '~'} kWh
              </div>

              {/* Tempo badge */}
              {tariff?.tempoColor && (
                <div
                  className={`mt-2 rounded px-2 py-1 text-xs font-semibold ${tempoClass}`}
                  style={{
                    opacity: showAnimation ? 1 : 0,
                    animation: showAnimation ? `fadeIn 600ms ease-out ${badgeDelay}ms both` : 'none'
                  }}
                >
                  {tariff.tempoColor}
                </div>
              )}

              {/* Selection indicator */}
              {isSelected && (
                <div className="absolute -bottom-1 left-1/2 h-1 w-8 -translate-x-1/2 rounded-full bg-indigo-500" />
              )}
            </button>
          );
        })}
      </div>

      {/* CSS keyframes for fade-in animation */}
      <style>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(8px);
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

export default WeekCalendar;
