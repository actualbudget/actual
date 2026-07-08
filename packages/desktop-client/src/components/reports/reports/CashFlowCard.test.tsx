import type { ReactNode } from 'react';

import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { CashFlowCard } from './CashFlowCard';

const connectionMocks = vi.hoisted(() => ({
  send: vi.fn(),
}));

vi.mock('@actual-app/core/platform/client/connection', () => ({
  send: connectionMocks.send,
}));

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (value: string) => value }),
}));

vi.mock('recharts', () => ({
  Bar: ({ children }: { children?: ReactNode }) => children,
  BarChart: ({
    children,
    data,
  }: {
    children?: ReactNode;
    data: Array<{ expenses: number; income: number }>;
  }) => (
    <div
      data-expenses={data[0].expenses}
      data-income={data[0].income}
      data-testid="cash-flow-chart"
    >
      {children}
    </div>
  ),
  LabelList: () => null,
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
    <div data-testid="cash-flow-change">{amount}</div>
  ),
}));

vi.mock('#components/reports/chart-theme', () => ({
  useRechartsAnimation: () => ({}),
}));

vi.mock('#components/reports/Container', () => ({
  Container: ({
    children,
  }: {
    children: (width: number, height: number) => ReactNode;
  }) => children(320, 180),
}));

vi.mock('#components/reports/DateRange', () => ({
  DateRange: ({ end, start }: { end: string; start: string }) => (
    <div data-testid="date-range">{`${start}:${end}`}</div>
  ),
}));

vi.mock('#components/reports/LoadingIndicator', () => ({
  LoadingIndicator: () => <div data-testid="cash-flow-loading" />,
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

describe('CashFlowCard report cells', () => {
  beforeEach(() => {
    connectionMocks.send.mockReset();
    connectionMocks.send.mockReturnValue(new Promise(() => undefined));
  });

  it('renders cached report cell data', () => {
    render(
      <CashFlowCard
        widgetId="cash-flow-widget"
        meta={{
          name: 'Cached cash flow',
          timeFrame: {
            start: '2017-01',
            end: '2017-01',
            mode: 'static',
          },
        }}
        reportData={{
          graphData: {
            expense: -8_000,
            income: 20_000,
          },
        }}
        onMetaChange={vi.fn()}
      />,
    );

    expect(screen.getByText('Cached cash flow')).toBeInTheDocument();
    expect(screen.getByTestId('cash-flow-change').textContent).toBe('12000');
    expect(screen.getByTestId('cash-flow-chart')).toHaveAttribute(
      'data-income',
      '20000',
    );
    expect(screen.getByTestId('cash-flow-chart')).toHaveAttribute(
      'data-expenses',
      '8000',
    );
  });
});
