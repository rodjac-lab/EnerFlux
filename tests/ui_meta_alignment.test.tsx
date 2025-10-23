import { act } from 'react';
import { createRoot, Root } from 'react-dom/client';
import * as exporter from '../src/core/exporter';
import App from '../src/ui/App';
import { runSimulation } from '../src/core/engine';
import { ecsFirstStrategy } from '../src/core/strategy';

class MockWorker {
  public postMessage = vi.fn();
  public addEventListener = vi.fn((event: string, handler: EventListener) => {
    if (event === 'message') {
      this.handlers.push(handler);
    }
  });
  public removeEventListener = vi.fn();
  public terminate = vi.fn();
  public handlers: EventListener[] = [];
}

describe('UI — alignement mode ECS ↔ métadonnées', () => {
  let container: HTMLDivElement;
  let root: Root;
  const workers: MockWorker[] = [];
  let WorkerBackup: typeof Worker;
  let ResizeObserverBackup: typeof globalThis.ResizeObserver;

  beforeAll(() => {
    const globalAny = globalThis as typeof globalThis & {
      ResizeObserver?: new (...args: unknown[]) => unknown;
      IS_REACT_ACT_ENVIRONMENT?: boolean;
    };
    ResizeObserverBackup = globalAny.ResizeObserver;
    class ResizeObserverMock {
      public observe() {}
      public unobserve() {}
      public disconnect() {}
    }
    globalAny.ResizeObserver = ResizeObserverMock;
    globalAny.IS_REACT_ACT_ENVIRONMENT = true;
  });

  beforeEach(() => {
    WorkerBackup = globalThis.Worker;
    class WorkerFactory {
      constructor() {
        const worker = new MockWorker();
        workers.push(worker);
        return worker as unknown as Worker;
      }
    }
    globalThis.Worker = WorkerFactory as unknown as typeof Worker;
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(async () => {
    await act(async () => {
      root.unmount();
    });
    container.remove();
    workers.length = 0;
    globalThis.Worker = WorkerBackup;
    vi.restoreAllMocks();
  });

  afterAll(() => {
    if (ResizeObserverBackup) {
      globalThis.ResizeObserver = ResizeObserverBackup;
    }
  });

  it("propague le mode 'hysteresis' vers le worker et l'export", async () => {
    await act(async () => {
      root.render(<App />);
    });

    const advancedTab = document.getElementById('tab-button-advanced');
    expect(advancedTab).toBeTruthy();
    await act(async () => {
      advancedTab?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    const modeSelect = Array.from(container.querySelectorAll('select')).find((select) =>
      Array.from(select.options).some((option) => option.value === 'hysteresis')
    );
    expect(modeSelect).toBeDefined();
    await act(async () => {
      modeSelect!.value = 'hysteresis';
      modeSelect!.dispatchEvent(new Event('change', { bubbles: true }));
    });

    const overviewTab = document.getElementById('tab-button-overview');
    expect(overviewTab).toBeTruthy();
    await act(async () => {
      overviewTab?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    const runButton = Array.from(container.querySelectorAll('button')).find((btn) =>
      btn.textContent?.includes('Lancer la simulation')
    );
    expect(runButton).toBeDefined();
    await act(async () => {
      runButton?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    const worker = workers[0];
    expect(worker).toBeDefined();
    expect(worker.postMessage).toHaveBeenCalledTimes(1);
    const payload = worker.postMessage.mock.calls[0][0] as { ecsService: { mode: string }; runId?: string };
    expect(payload.ecsService.mode).toBe('hysteresis');

    const handler = worker.addEventListener.mock.calls.find((call) => call[0] === 'message')?.[1] as
      | ((event: MessageEvent) => void)
      | undefined;
    expect(handler).toBeTypeOf('function');

    const sampleResult = runSimulation({
      dt_s: 900,
      pvSeries_kW: [0],
      baseLoadSeries_kW: [0],
      devices: [],
      strategy: ecsFirstStrategy
    });

    await act(async () => {
      handler?.({ data: { resultA: sampleResult, resultB: sampleResult, runId: payload.runId } } as MessageEvent);
    });

    const exportSpy = vi.spyOn(exporter, 'buildExportV1');
    vi.spyOn(exporter, 'exportJSON').mockImplementation(() => {});

    const exportsButton = Array.from(container.querySelectorAll('button')).find((btn) =>
      btn.textContent?.includes('Exports')
    );
    expect(exportsButton).toBeDefined();
    await act(async () => {
      exportsButton?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    const exportJsonButton = Array.from(container.querySelectorAll('button')).find((btn) =>
      btn.textContent?.includes('Export JSON')
    );
    expect(exportJsonButton).toBeDefined();
    await act(async () => {
      exportJsonButton?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    expect(exportSpy).toHaveBeenCalled();
    const meta = exportSpy.mock.calls[0][2];
    expect(meta.dhwConfig.mode).toBe('hysteresis');
  });
});

