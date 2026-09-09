import React, { cloneElement } from 'react';
import type { ReactElement, ReactNode } from 'react';
import { MemoryRouter } from 'react-router';

import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { TestProviders } from '#mocks';

type TooltipEntry = {
  name: string;
  value: number;
  color: string;
  payload: { name: string; color: string };
};

// The tooltip is only reachable through recharts, which cannot measure or
// hover a chart in jsdom. Stubbing the chart primitives renders the tooltip
// content directly with the payload recharts would have handed it.
let tooltipPayload: TooltipEntry[] = [];

vi.mock('recharts', () => ({
  Bar: () => null,
  BarChart: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  CartesianGrid: () => null,
  LabelList: () => null,
  XAxis: () => null,
  YAxis: () => null,
  Tooltip: ({
    content,
  }: {
    content: ReactElement<{
      active?: boolean;
      label?: string;
      payload?: TooltipEntry[];
    }>;
  }) =>
    cloneElement(content, {
      active: true,
      label: 'Jan 2024',
      payload: tooltipPayload,
    }),
}));

// jsdom does not implement matchMedia, which the animation hook uses for
// reduced-motion detection
window.matchMedia = (query: string): MediaQueryList => ({
  matches: false,
  media: query,
  onchange: null,
  addListener: vi.fn(),
  removeListener: vi.fn(),
  addEventListener: vi.fn(),
  removeEventListener: vi.fn(),
  dispatchEvent: vi.fn(() => false),
});

const { StackedBarGraph } = await import('./StackedBarGraph');

function makeEntry(name: string, value: number): TooltipEntry {
  return { name, value, color: 'red', payload: { name, color: 'red' } };
}

// recharts hands the payload over in reverse order, and the tooltip reverses
// it back, so the payload here is written last-category-first
function renderTooltip(entries: TooltipEntry[]) {
  tooltipPayload = entries.slice(0).reverse();

  render(
    <TestProviders>
      <MemoryRouter>
        <StackedBarGraph
          data={
            {
              intervalData: [{ date: 'Jan 2024' }],
              legend: entries.map(entry => ({
                name: entry.name,
                dataKey: entry.name,
                color: entry.color,
              })),
            } as never
          }
          filters={[]}
          groupBy="Category"
          compact
          viewLabels={false}
          balanceTypeOp="totalDebts"
        />
      </MemoryRouter>
    </TestProviders>,
  );
}

describe('StackedBarGraph tooltip', () => {
  it('leaves out categories with no value for the interval', () => {
    renderTooltip([
      makeEntry('Food', 1000),
      makeEntry('Bills', 0),
      makeEntry('Fun', 2000),
    ]);

    expect(screen.getByText('Food')).toBeInTheDocument();
    expect(screen.getByText('Fun')).toBeInTheDocument();
    expect(screen.queryByText('Bills')).not.toBeInTheDocument();
  });

  it('does not show the truncation indicator when every non-zero category is visible', () => {
    renderTooltip([
      makeEntry('Food', 1000),
      makeEntry('Bills', 0),
      makeEntry('Fun', 2000),
      makeEntry('Rent', 0),
      makeEntry('Travel', 3000),
      makeEntry('Gifts', 0),
    ]);

    expect(document.body).not.toHaveTextContent('...');
  });

  it('shows the truncation indicator when there are more non-zero categories than fit', () => {
    renderTooltip([
      makeEntry('Food', 1000),
      makeEntry('Bills', 2000),
      makeEntry('Fun', 3000),
      makeEntry('Rent', 4000),
      makeEntry('Travel', 5000),
      makeEntry('Gifts', 6000),
    ]);

    expect(screen.queryByText('Gifts')).not.toBeInTheDocument();
    expect(document.body).toHaveTextContent('...');
  });
});
