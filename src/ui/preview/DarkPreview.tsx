import { Card } from '../components/primitives/Card';
import { Button } from '../components/primitives/Button';
import { ThemeToggle } from '../components/primitives/ThemeToggle';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { getChartDefaults } from '../charts/chartTheme';

/**
 * DarkPreview Component
 *
 * Preview page to validate the new dark-first UI theme.
 * Showcases hero section, stats cards, and charts with the new design system.
 */
export function DarkPreview() {
  const chartDefaults = getChartDefaults();

  // Sample data for charts
  const pvLoadData = [
    { time: '08:00', pv: 2.5, load: 1.2 },
    { time: '10:00', pv: 5.8, load: 1.5 },
    { time: '12:00', pv: 8.2, load: 2.1 },
    { time: '14:00', pv: 7.5, load: 1.8 },
    { time: '16:00', pv: 4.3, load: 2.5 },
    { time: '18:00', pv: 1.2, load: 3.8 },
  ];

  const batteryData = [
    { time: '00:00', soc: 45 },
    { time: '06:00', soc: 38 },
    { time: '12:00', soc: 78 },
    { time: '18:00', soc: 92 },
    { time: '23:59', soc: 65 },
  ];

  return (
    <div className="min-h-screen bg-bg transition-colors duration-300">
      {/* Header with Theme Toggle */}
      <header className="border-b border-border bg-surface">
        <div className="mx-auto max-w-7xl px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <svg className="w-8 h-8 text-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
            <h1 className="text-xl font-bold text-text">EnerFlux Preview</h1>
          </div>
          <ThemeToggle />
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative overflow-hidden">
        <div
          className="absolute inset-0 opacity-30"
          style={{ background: 'var(--gradient-hero)' }}
        />
        <div className="relative mx-auto max-w-7xl px-6 py-20 text-center">
          <h2 className="text-4xl font-bold text-text mb-4">
            Laboratoire d'autoconsommation intelligente
          </h2>
          <p className="text-lg text-text-secondary mb-8 max-w-2xl mx-auto">
            Optimisez votre production solaire avec des stratégies de pilotage avancées.
            Comparez, simulez, économisez.
          </p>
          <div className="flex gap-4 justify-center">
            <Button variant="primary" size="lg">
              Lancer une simulation
            </Button>
            <Button variant="outline" size="lg">
              En savoir plus
            </Button>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="mx-auto max-w-7xl px-6 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card variant="glass" padding="lg">
            <div className="text-center">
              <div className="text-3xl font-bold text-accent mb-2">28.5 kWh</div>
              <div className="text-sm text-muted">Production PV</div>
            </div>
          </Card>
          <Card variant="glass" padding="lg">
            <div className="text-center">
              <div className="text-3xl font-bold text-success mb-2">92%</div>
              <div className="text-sm text-muted">Autoconsommation</div>
            </div>
          </Card>
          <Card variant="glass" padding="lg">
            <div className="text-center">
              <div className="text-3xl font-bold text-warn mb-2">3.45 €</div>
              <div className="text-sm text-muted">Économies</div>
            </div>
          </Card>
          <Card variant="glass" padding="lg">
            <div className="text-center">
              <div className="text-3xl font-bold text-battery mb-2">78%</div>
              <div className="text-sm text-muted">SOC Batterie</div>
            </div>
          </Card>
        </div>
      </section>

      {/* Charts Section */}
      <section className="mx-auto max-w-7xl px-6 py-12">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* PV vs Load Chart */}
          <Card variant="default" padding="md">
            <h3 className="text-lg font-semibold text-text mb-4">Production PV vs Consommation</h3>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={pvLoadData}>
                <CartesianGrid strokeDasharray="3 3" stroke={chartDefaults.gridStroke} />
                <XAxis
                  dataKey="time"
                  stroke={chartDefaults.axisStroke}
                  tick={{ fill: chartDefaults.labelColor }}
                />
                <YAxis
                  stroke={chartDefaults.axisStroke}
                  tick={{ fill: chartDefaults.labelColor }}
                  label={{ value: 'kW', position: 'insideLeft', fill: chartDefaults.labelColor }}
                />
                <Tooltip contentStyle={chartDefaults.tooltipStyle} />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="pv"
                  name="Production PV"
                  stroke={chartDefaults.series[0]}
                  strokeWidth={2}
                  dot={{ fill: chartDefaults.series[0] }}
                />
                <Line
                  type="monotone"
                  dataKey="load"
                  name="Consommation"
                  stroke={chartDefaults.series[1]}
                  strokeWidth={2}
                  dot={{ fill: chartDefaults.series[1] }}
                />
              </LineChart>
            </ResponsiveContainer>
          </Card>

          {/* Battery SOC Chart */}
          <Card variant="default" padding="md">
            <h3 className="text-lg font-semibold text-text mb-4">État de charge batterie</h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={batteryData}>
                <CartesianGrid strokeDasharray="3 3" stroke={chartDefaults.gridStroke} />
                <XAxis
                  dataKey="time"
                  stroke={chartDefaults.axisStroke}
                  tick={{ fill: chartDefaults.labelColor }}
                />
                <YAxis
                  stroke={chartDefaults.axisStroke}
                  tick={{ fill: chartDefaults.labelColor }}
                  label={{ value: '%', position: 'insideLeft', fill: chartDefaults.labelColor }}
                />
                <Tooltip contentStyle={chartDefaults.tooltipStyle} />
                <Legend />
                <Bar
                  dataKey="soc"
                  name="SOC"
                  fill={chartDefaults.series[2]}
                  radius={[8, 8, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </Card>
        </div>
      </section>

      {/* Features Grid */}
      <section className="mx-auto max-w-7xl px-6 py-12">
        <h3 className="text-2xl font-bold text-text mb-8 text-center">Fonctionnalités clés</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card variant="glass" padding="lg">
            <div className="flex flex-col items-center text-center">
              <div className="w-12 h-12 rounded-full bg-accent/20 flex items-center justify-center mb-4">
                <svg className="w-6 h-6 text-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
              <h4 className="text-lg font-semibold text-text mb-2">Comparaison A/B</h4>
              <p className="text-sm text-muted">Comparez deux stratégies côte à côte pour identifier la meilleure</p>
            </div>
          </Card>

          <Card variant="glass" padding="lg">
            <div className="flex flex-col items-center text-center">
              <div className="w-12 h-12 rounded-full bg-success/20 flex items-center justify-center mb-4">
                <svg className="w-6 h-6 text-success" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <h4 className="text-lg font-semibold text-text mb-2">Multi-équipements</h4>
              <p className="text-sm text-muted">Gérez PV, batterie, ECS, chauffage, piscine et VE simultanément</p>
            </div>
          </Card>

          <Card variant="glass" padding="lg">
            <div className="flex flex-col items-center text-center">
              <div className="w-12 h-12 rounded-full bg-warn/20 flex items-center justify-center mb-4">
                <svg className="w-6 h-6 text-warn" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h4 className="text-lg font-semibold text-text mb-2">Simulation déterministe</h4>
              <p className="text-sm text-muted">Résultats reproductibles et validés par des tests exhaustifs</p>
            </div>
          </Card>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border bg-surface mt-16">
        <div className="mx-auto max-w-7xl px-6 py-8 text-center">
          <p className="text-sm text-muted">
            EnerFlux — Laboratoire open-source d'autoconsommation résidentielle
          </p>
        </div>
      </footer>
    </div>
  );
}
