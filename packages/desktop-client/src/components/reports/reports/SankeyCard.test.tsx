import React from 'react';

import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { SankeyCard } from './SankeyCard';

const sankeyMocks = vi.hoisted(() => ({
  graph: null as Map<string, { to: Map<string, number> }> | null,
  sankeyData: null as unknown,
}));

vi.mock('@actual-app/components/block', () => ({
  Block: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

vi.mock('@actual-app/components/view', () => ({
  View: React.forwardRef<HTMLDivElement, { children?: React.ReactNode }>(
    ({ children }, ref) => <div ref={ref}>{children}</div>,
  ),
}));

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (value: string) => value }),
}));

vi.mock('#components/reports/graphs/SankeyGraph', () => ({
  SankeyGraph: ({ data }: { data: unknown }) => {
    sankeyMocks.sankeyData = data;
    return <div data-testid="sankey-graph" />;
  },
}));

vi.mock('#components/reports/LoadingIndicator', () => ({
  LoadingIndicator: () => <div data-testid="sankey-loading" />,
}));

vi.mock('#components/reports/ReportCard', () => ({
  ReportCard: ({ children }: { children: React.ReactNode }) => (
    <section>{children}</section>
  ),
}));

vi.mock('#components/reports/ReportCardName', () => ({
  ReportCardName: ({ name }: { name: string }) => <h2>{name}</h2>,
}));

vi.mock('#components/reports/reports/Sankey', () => ({
  getDefaultLayerRange: () => ({ from: 'account', to: 'category' }),
  topNNodes: () => 15,
}));

vi.mock('#components/reports/spreadsheets/sankey-spreadsheet', () => ({
  buildSankeyData: (
    graph: Map<string, { to: Map<string, number> }>,
    topN: number,
  ) => {
    sankeyMocks.graph = graph;
    return {
      links: [],
      nodes: [{ key: 'checking', topN }],
    };
  },
  isGraphLayer: (value: unknown) =>
    value === 'account' ||
    value === 'payee' ||
    value === 'income_category' ||
    value === 'category_group' ||
    value === 'category' ||
    value === 'budget',
}));

vi.mock('#hooks/useCategories', () => ({
  useCategories: () => ({ data: { grouped: [], list: [] } }),
}));

vi.mock('#hooks/useLocale', () => ({
  useLocale: () => undefined,
}));

vi.mock('#hooks/useResizeObserver', () => ({
  useResizeObserver: () => () => {},
}));

describe('SankeyCard report cells', () => {
  beforeEach(() => {
    sankeyMocks.graph = null;
    sankeyMocks.sankeyData = null;
  });

  it('renders cached report cell data', () => {
    render(
      <SankeyCard
        widgetId="sankey-widget"
        meta={{
          name: 'Cached sankey',
          mode: 'spent',
          timeFrame: {
            start: '2017-01',
            end: '2017-01',
            mode: 'static',
          },
        }}
        reportData={{
          graph: [
            [
              'checking',
              {
                name: 'Checking',
                to: [['expense-group', 8_000]],
                type: 'account',
              },
            ],
            [
              'expense-group',
              {
                name: 'Expenses',
                to: [],
                type: 'category_group',
              },
            ],
          ],
        }}
        onMetaChange={vi.fn()}
      />,
    );

    expect(screen.getByText('Cached sankey')).toBeInTheDocument();
    expect(screen.getByText('Jan 2017 (Spent)')).toBeInTheDocument();
    expect(screen.getByTestId('sankey-graph')).toBeInTheDocument();
    expect(sankeyMocks.graph?.get('checking')?.to.get('expense-group')).toBe(
      8_000,
    );
    expect(sankeyMocks.sankeyData).toEqual({
      links: [],
      nodes: [{ key: 'checking', topN: 15 }],
    });
  });
});
