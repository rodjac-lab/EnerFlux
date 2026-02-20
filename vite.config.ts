import { defineConfig, type ProxyOptions } from 'vite';
import react from '@vitejs/plugin-react';

function createProxy(name: string, target: string, pathPrefix: string): ProxyOptions {
  return {
    target,
    changeOrigin: true,
    rewrite: (path) => path.startsWith(pathPrefix) ? path.slice(pathPrefix.length) : path,
    configure: (proxy) => {
      proxy.on('proxyReq', (_proxyReq, req) => {
        console.log(`[Vite Proxy] ${name}:`, req.method, req.url);
      });
    }
  };
}

export default defineConfig({
  base: '/EnerFlux/',
  plugins: [react()],
  server: {
    proxy: {
      '/api/pvgis': createProxy('PVGIS', 'https://re.jrc.ec.europa.eu/api/v5_2', '/api/pvgis'),
      '/api/rte': createProxy('RTE', 'https://digital.iservices.rte-france.com/open_api/tempo_like_supply_contract/v1', '/api/rte'),
      '/api/openweather': createProxy('OpenWeather', 'https://api.openweathermap.org/energy/1.0', '/api/openweather')
    }
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: [],
    include: ['tests/**/*.{test,spec}.{ts,tsx}'],
    coverage: {
      reporter: ['text', 'lcov']
    },
    // Allow JSON imports in tests
    server: {
      deps: {
        inline: [/\.json$/]
      }
    }
  }
});
