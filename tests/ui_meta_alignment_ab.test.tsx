import React, { act } from 'react';
import { createRoot, Root } from 'react-dom/client';
import DecisionsTimeline from '../src/ui/charts/DecisionsTimeline';
import { ChartSyncProvider } from '../src/ui/chartSync';
import type { SeriesForRun } from '../src/data/series';
import type { ExportV1 } from '../src/types/export';

const meta: ExportV1['meta'] = {
  version: '1.0',
  scenario: 'demo',
  dt_s: 1800,
  tariffs: {
    mode: 'fixed',
    import_EUR_per_kWh: 0.2,
    export_EUR_per_kWh: 0.05
  },
  batteryConfig: {
    socMin_kWh: 1,
    socMax_kWh: 5,
    maxCharge_kW: 3,
    maxDischarge_kW: 3,
    efficiency: 0.9
  },
  dhwConfig: {
    mode: 'hysteresis',
    targetCelsius: 50,
    deadlineHour: 21
  },
  strategyA: { id: 'A' },
  strategyB: { id: 'B' }
};

describe('Decisions timeline meta alignment', () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeAll(() => {
    const globalAny = globalThis as typeof globalThis & {
      ResizeObserver?: new (...args: unknown[]) => { observe(): void; unobserve(): void; disconnect(): void };
      IS_REACT_ACT_ENVIRONMENT?: boolean;
    };
    globalAny.ResizeObserver = class {
      observe() {}
      unobserve() {}
      disconnect() {}
    };
    globalAny.IS_REACT_ACT_ENVIRONMENT = true;
  });

  beforeEach(() => {
    container = document.createElement('div');
    container.style.width = '800px';
    container.style.height = '400px';
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(async () => {
    await act(async () => {
      root.unmount();
    });
    container.remove();
  });

  afterAll(() => {
    // Cleanup is optional - test framework handles it
  });

  it('renders markers for non-idle decisions', async () => {
    const series: SeriesForRun = {
      energy: [],
      battery: [],
      dhw: [],
      decisions: [
        { index: 0, t_s: 0, hour: 0, reason: 'idle', highlight: false },
        { index: 1, t_s: 1800, hour: 0.5, reason: 'batt_charge', highlight: true },
        { index: 2, t_s: 3600, hour: 1, reason: 'grid_import', highlight: true }
      ]
    };

    await act(async () => {
      root.render(
        <ChartSyncProvider>
          <DecisionsTimeline series={series} meta={meta} variant="A" />
        </ChartSyncProvider>
      );
    });

    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0));
    });

    const counter = container.querySelector('[data-testid="decision-count"]');
    expect(counter?.textContent).toBe('2');
  });

  it('displays deadline marker at configured hour', async () => {
    const series: SeriesForRun = {
      energy: [],
      battery: [],
      dhw: [],
      decisions: [
        { index: 0, t_s: 0, hour: 0, reason: 'idle', highlight: false }
      ]
    };

    await act(async () => {
      root.render(
        <ChartSyncProvider>
          <DecisionsTimeline series={series} meta={meta} variant="B" />
        </ChartSyncProvider>
      );
    });

    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0));
    });

    const deadline = container.querySelector('[data-testid="deadline-hour"]');
    expect(deadline?.textContent).toBe('21');
  });
});

