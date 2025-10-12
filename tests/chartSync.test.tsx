import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import React, { act } from 'react';
import { createRoot, Root } from 'react-dom/client';
import { ChartSyncProvider, useChartSync } from '../src/ui/chartSync';

const HoverEmitter: React.FC = () => {
  const { setHoverTs } = useChartSync();
  return (
    <button type="button" onClick={() => setHoverTs(3600)}>
      Hover A
    </button>
  );
};

const HoverReceiver: React.FC = () => {
  const { hoverTs } = useChartSync();
  return <div data-testid="hover-target">{hoverTs ?? 'none'}</div>;
};

describe('chart sync context', () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(async () => {
    await act(async () => {
      root.unmount();
    });
    container.remove();
  });

  it('propagates hover timestamp to all listeners', async () => {
    await act(async () => {
      root.render(
        <ChartSyncProvider>
          <HoverEmitter />
          <HoverReceiver />
        </ChartSyncProvider>
      );
    });

    const target = container.querySelector('[data-testid="hover-target"]');
    expect(target?.textContent).toBe('none');

    const button = container.querySelector('button');
    expect(button).toBeTruthy();

    await act(async () => {
      button?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    expect(target?.textContent).toBe('3600');
  });
});

