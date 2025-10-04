import { describe, expect, it } from 'vitest';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import CondensedKpiGrid, { CondensedKpiGroup } from '../src/ui/compare/CondensedKpiGrid';

describe('CondensedKpiGrid', () => {
  it('renders a fallback message when no values are available', () => {
    const groups: CondensedKpiGroup[] = [
      {
        id: 'empty',
        title: 'Vide',
        rows: [
          {
            label: 'Autoconsommation',
            formatter: (value: number) => `${value.toFixed(2)}`
          }
        ]
      }
    ];

    const html = renderToStaticMarkup(<CondensedKpiGrid groups={groups} />);

    expect(html).toContain('Données non disponibles');
  });

  it('displays card metrics with delta badges when data is provided', () => {
    const groups: CondensedKpiGroup[] = [
      {
        id: 'cards',
        title: 'KPI',
        variant: 'cards',
        rows: [
          {
            label: 'Autoconsommation',
            valueA: 0.62,
            valueB: 0.55,
            formatter: (value: number) => `${(value * 100).toFixed(0)} %`,
            deltaFormatter: (delta: number) => `${(delta * 100).toFixed(1)} %`,
            deltaThreshold: 0.01
          }
        ]
      }
    ];

    const html = renderToStaticMarkup(<CondensedKpiGrid groups={groups} />);

    expect(html).toContain('62 %');
    expect(html).toContain('55 %');
    expect(html).toContain('Δ');
  });
});
