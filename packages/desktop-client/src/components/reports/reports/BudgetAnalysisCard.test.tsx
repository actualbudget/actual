import React from 'react';

import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { BudgetAnalysisCard } from './BudgetAnalysisCard';

const graphMocks = vi.hoisted(() => ({
  props: null as {
    balanceOnly?: boolean;
    data: { intervalData: unknown[] };
    graphType?: 'Line' | 'Bar';
    showBalance?: boolean;
  } | null,
}));

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (value: string) => value }),
}));

vi.mock('#components/FinancialText', () => ({
  FinancialText: ({ children }: { children: React.ReactNode }) => (
    <span>{children}</span>
  ),
}));

vi.mock('#components/PrivacyFilter', () => ({
  PrivacyFilter: ({ children }: { children: React.ReactNode }) => (
    <>{children}</>
  ),
}));

vi.mock('#components/reports/DateRange', () => ({
  DateRange: ({ end, start }: { end: string; start: string }) => (
    <div data-testid="date-range">{`${start}:${end}`}</div>
  ),
}));

vi.mock('#components/reports/graphs/BudgetAnalysisGraph', () => ({
  BudgetAnalysisGraph: (props: {
    balanceOnly?: boolean;
    data: { intervalData: unknown[] };
    graphType?: 'Line' | 'Bar';
    showBalance?: boolean;
  }) => {
    graphMocks.props = props;
    return <div data-testid="budget-analysis-graph" />;
  },
}));

vi.mock('#components/reports/LoadingIndicator', () => ({
  LoadingIndicator: () => <div data-testid="budget-analysis-loading" />,
}));

vi.mock('#components/reports/ReportCard', () => ({
  ReportCard: ({ children }: { children: React.ReactNode }) => (
    <section>{children}</section>
  ),
}));

vi.mock('#components/reports/ReportCardName', () => ({
  ReportCardName: ({ name }: { name: string }) => <h2>{name}</h2>,
}));

vi.mock('#hooks/useFormat', () => ({
  useFormat: () => (value: unknown) => `fmt:${value}`,
}));

describe('BudgetAnalysisCard report cells', () => {
  beforeEach(() => {
    graphMocks.props = null;
  });

  it('renders cached report cell data', () => {
    render(
      <BudgetAnalysisCard
        widgetId="budget-analysis-widget"
        meta={{
          balanceOnly: false,
          graphType: 'Bar',
          name: 'Cached budget analysis',
          showBalance: true,
          timeFrame: {
            end: '2024-01',
            mode: 'static',
            start: '2024-01',
          },
        }}
        reportData={{
          endDate: '2024-01-31',
          finalOverspendingAdjustment: 0,
          intervalData: [
            {
              balance: 30_000,
              budgeted: 50_000,
              date: '2024-01',
              overspendingAdjustment: 0,
              spent: -20_000,
            },
          ],
          startDate: '2024-01-01',
          totalBudgeted: 50_000,
          totalOverspendingAdjustment: 0,
          totalSpent: -20_000,
        }}
        onMetaChange={vi.fn()}
      />,
    );

    expect(screen.getByText('Cached budget analysis')).toBeInTheDocument();
    expect(screen.getByTestId('date-range').textContent).toBe(
      '2024-01:2024-01',
    );
    expect(screen.getByText('fmt:30000')).toBeInTheDocument();
    expect(screen.getByTestId('budget-analysis-graph')).toBeInTheDocument();
    expect(graphMocks.props?.data.intervalData).toHaveLength(1);
    expect(graphMocks.props?.graphType).toBe('Bar');
    expect(graphMocks.props?.showBalance).toBe(true);
    expect(graphMocks.props?.balanceOnly).toBe(false);
  });
});
