import type { ReactNode } from 'react';

import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { NetWorthCard } from './NetWorthCard';

const graphMocks = vi.hoisted(() => ({
  props: null as { graphData: { data: Array<Record<string, unknown>> } } | null,
}));

const connectionMocks = vi.hoisted(() => ({
  send: vi.fn(),
}));

vi.mock('@actual-app/components/hooks/useResponsive', () => ({
  useResponsive: () => ({ isNarrowWidth: false }),
}));

vi.mock('@actual-app/core/platform/client/connection', () => ({
  send: connectionMocks.send,
}));

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (value: string) => value }),
}));

vi.mock('#components/FinancialText', () => ({
  FinancialText: ({ children }: { children: ReactNode }) => (
    <span>{children}</span>
  ),
}));

vi.mock('#components/PrivacyFilter', () => ({
  PrivacyFilter: ({ children }: { children: ReactNode }) => children,
}));

vi.mock('#components/reports/Change', () => ({
  Change: ({ amount }: { amount: number }) => (
    <div data-testid="net-worth-change">{amount}</div>
  ),
}));

vi.mock('#components/reports/DateRange', () => ({
  DateRange: ({ end, start }: { end: string; start: string }) => (
    <div data-testid="date-range">{`${start}:${end}`}</div>
  ),
}));

vi.mock('#components/reports/graphs/NetWorthGraph', () => ({
  NetWorthGraph: (props: {
    graphData: { data: Array<Record<string, unknown>> };
  }) => {
    graphMocks.props = props;
    return <div data-testid="net-worth-graph" />;
  },
}));

vi.mock('#components/reports/LoadingIndicator', () => ({
  LoadingIndicator: () => <div data-testid="net-worth-loading" />,
}));

vi.mock('#components/reports/ReportCard', () => ({
  ReportCard: ({ children }: { children: ReactNode }) => (
    <section>{children}</section>
  ),
}));

vi.mock('#components/reports/ReportCardName', () => ({
  ReportCardName: ({ name }: { name: string }) => <h2>{name}</h2>,
}));

vi.mock('#hooks/useFormat', () => ({
  useFormat: () => (value: unknown) => `fmt:${String(value)}`,
}));

describe('NetWorthCard report cells', () => {
  beforeEach(() => {
    graphMocks.props = null;
    connectionMocks.send.mockReset();
    connectionMocks.send.mockReturnValue(new Promise(() => undefined));
  });

  it('uses report cell data and formats graph values on the client', () => {
    render(
      <NetWorthCard
        widgetId="net-worth-widget"
        meta={{
          name: 'Net worth cached',
          timeFrame: {
            start: '2017-01',
            end: '2017-01',
            mode: 'static',
          },
        }}
        reportData={{
          accounts: [{ id: 'checking', name: 'Checking' }],
          graphData: {
            data: [
              {
                assets: 12_345,
                change: 0,
                checking: 12_345,
                date: 'January 2017',
                debt: 0,
                networth: 12_345,
                x: 'Jan 17',
                y: 12_345,
              },
            ],
            end: '2017-01-31',
            hasNegative: false,
            start: '2017-01-01',
          },
          highestNetWorth: 12_345,
          lowestNetWorth: 12_345,
          netWorth: 12_345,
          totalChange: 0,
        }}
        onMetaChange={vi.fn()}
      />,
    );

    expect(screen.getByText('Net worth cached')).toBeInTheDocument();
    expect(screen.getByText('fmt:12345')).toBeInTheDocument();
    expect(screen.getByTestId('net-worth-graph')).toBeInTheDocument();
    expect(graphMocks.props?.graphData.data[0].assets).toBe('fmt:12345');
    expect(graphMocks.props?.graphData.data[0].debt).toBe('-fmt:0');
  });
});
