import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
   base: '/EnerFlux/',
  plugins: [react()],
  server: {
    proxy: {
      // Proxy PVGIS API (Commission Européenne)
      '/api/pvgis': {
        target: 'https://re.jrc.ec.europa.eu/api/v5_2',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/pvgis/, ''),
        configure: (proxy) => {
          proxy.on('proxyReq', (proxyReq, req) => {
            console.log('[Vite Proxy] PVGIS:', req.method, req.url);
          });
        }
      },
      // Proxy RTE Tempo API (tarifs électricité)
      '/api/rte': {
        target: 'https://digital.iservices.rte-france.com/open_api/tempo_like_supply_contract/v1',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/rte/, ''),
        configure: (proxy) => {
          proxy.on('proxyReq', (proxyReq, req) => {
            console.log('[Vite Proxy] RTE:', req.method, req.url);
          });
        }
      },
      // Proxy OpenWeather API (météo payante)
      '/api/openweather': {
        target: 'https://api.openweathermap.org/energy/1.0',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/openweather/, ''),
        configure: (proxy) => {
          proxy.on('proxyReq', (proxyReq, req) => {
            console.log('[Vite Proxy] OpenWeather:', req.method, req.url);
          });
        }
      }
    }
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: [],
    include: ['tests/**/*.{test,spec}.{ts,tsx}'],
    coverage: {
      reporter: ['text', 'lcov']
    }
  }
});
