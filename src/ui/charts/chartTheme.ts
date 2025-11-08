/**
 * Chart Theme System
 *
 * Centralized chart styling with dual-theme support.
 * Automatically detects light/dark mode and returns appropriate colors.
 */

export interface ChartTheme {
  bg: string;
  grid: string;
  axis: string;
  label: string;
  tooltipBg: string;
  tooltipBorder: string;
  series: readonly string[];
}

const lightTheme: ChartTheme = {
  bg: '#FFFFFF',
  grid: 'rgba(0, 0, 0, 0.06)',
  axis: 'rgba(0, 0, 0, 0.45)',
  label: '#111827',
  tooltipBg: 'rgba(255, 255, 255, 0.98)',
  tooltipBorder: 'rgba(0, 0, 0, 0.08)',
  series: ['#0066FF', '#F59E0B', '#10B981', '#8B5CF6', '#6366F1'] as const,
} as const;

const darkTheme: ChartTheme = {
  bg: '#0B0B0D',
  grid: 'rgba(255, 255, 255, 0.06)',
  axis: 'rgba(255, 255, 255, 0.45)',
  label: '#F8FAFC',
  tooltipBg: 'rgba(17, 17, 19, 0.95)',
  tooltipBorder: 'rgba(255, 255, 255, 0.08)',
  series: ['#818CF8', '#22D3EE', '#10B981', '#F59E0B', '#F472B6'] as const,
} as const;

/**
 * Get the current chart theme based on dark mode state
 */
export function getChartTheme(): ChartTheme {
  const isDark = document.documentElement.classList.contains('dark');
  return isDark ? darkTheme : lightTheme;
}

/**
 * Hook to reactively get chart theme (for use in React components)
 * Note: This is a simple getter. For reactive updates, wrap in useState/useEffect
 */
export function useChartTheme(): ChartTheme {
  return getChartTheme();
}

/**
 * Default chart styling presets for Recharts components
 */
export function getChartDefaults() {
  const theme = getChartTheme();

  return {
    tooltipStyle: {
      background: theme.tooltipBg,
      border: `1px solid ${theme.tooltipBorder}`,
      color: theme.label,
      borderRadius: '8px',
      padding: '12px',
    },
    axisStroke: theme.axis,
    gridStroke: theme.grid,
    labelColor: theme.label,
    series: theme.series,
  } as const;
}

// Export static theme constants for backwards compatibility
export const chartTheme = getChartTheme();
export const tooltipStyle = getChartDefaults().tooltipStyle;
export const axisStroke = getChartDefaults().axisStroke;
export const gridStroke = getChartDefaults().gridStroke;
export const labelColor = getChartDefaults().labelColor;
export const series = getChartDefaults().series;
