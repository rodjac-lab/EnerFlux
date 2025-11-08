/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class', // Enable dark mode via class on <html>
  content: [
    './index.html',
    './src/**/*.{ts,tsx}'
  ],
  theme: {
    extend: {
      colors: {
        // Amplitude-inspired palette for EnerFlux (preserved for compatibility)
        brand: {
          50: '#EFF6FF',
          100: '#DBEAFE',
          200: '#BFDBFE',
          300: '#93C5FD',
          400: '#60A5FA',
          500: '#0066FF', // Primary blue (Amplitude style)
          600: '#0052CC',
          700: '#0041A3',
          800: '#003380',
          900: '#002966',
        },
        energy: {
          solar: '#F59E0B',    // Orange for solar/PV
          grid: '#6366F1',     // Indigo for grid
          battery: '#10B981',  // Green for battery/success
          load: '#8B5CF6',     // Purple for load
        },
        // Dual-theme CSS variable mappings
        bg: 'var(--bg)',
        surface: 'var(--surface)',
        'surface-elevated': 'var(--surface-elevated)',
        text: 'var(--text)',
        'text-secondary': 'var(--text-secondary)',
        muted: 'var(--muted)',
        border: 'var(--border)',
        'border-focus': 'var(--border-focus)',
        accent: 'var(--accent)',
        'accent-hover': 'var(--accent-hover)',
        accent2: 'var(--accent-2)',
        success: 'var(--success)',
        warn: 'var(--warn)',
        error: 'var(--error)',
        info: 'var(--info)',
        // Energy colors also mapped to CSS vars for theme consistency
        solar: 'var(--solar)',
        grid: 'var(--grid)',
        battery: 'var(--battery)',
        load: 'var(--load)',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
      },
      fontSize: {
        'xs': ['0.75rem', { lineHeight: '1.5' }],      // 12px
        'sm': ['0.875rem', { lineHeight: '1.5' }],     // 14px
        'base': ['1rem', { lineHeight: '1.5' }],       // 16px (Amplitude style)
        'lg': ['1.125rem', { lineHeight: '1.5' }],     // 18px
        'xl': ['1.25rem', { lineHeight: '1.4' }],      // 20px
        '2xl': ['1.5rem', { lineHeight: '1.3' }],      // 24px
        '3xl': ['2rem', { lineHeight: '1.2' }],        // 32px
        '4xl': ['2.5rem', { lineHeight: '1.1' }],      // 40px
      },
      boxShadow: {
        'sm': '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
        'DEFAULT': '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px -1px rgba(0, 0, 0, 0.1)',
        'md': '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -2px rgba(0, 0, 0, 0.1)',
        'lg': '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -4px rgba(0, 0, 0, 0.1)',
        'xl': '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',
        '2xl': '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
        'hero': '0 30px 60px -15px rgba(99, 102, 241, 0.3)', // Purple glow for hero cards
      },
      borderRadius: {
        'sm': '0.25rem',   // 4px
        'DEFAULT': '0.5rem',   // 8px
        'md': '0.75rem',   // 12px
        'lg': '1rem',      // 16px (Amplitude cards)
        'xl': '1.5rem',    // 24px
        '2xl': '2rem',     // 32px
      },
      spacing: {
        '18': '4.5rem',    // 72px
        '22': '5.5rem',    // 88px
      }
    },
  },
  plugins: []
};
