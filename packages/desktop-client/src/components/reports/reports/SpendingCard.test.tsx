import type { ReactNode } from 'react';

import * as monthUtils from '@actual-app/core/shared/months';
import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { SpendingCard } from './SpendingCard';

const graphMocks = vi.hoisted(() => ({
  props: null as {
    compare: string;
    compareTo: string;
    data: { intervalData: unknown[] };
  } | null,
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

vi.mock('#components/reports/DateRange', () => ({
  DateRange: ({ end, start }: { end: string; start: string }) => (
    <div data-testid="date-range">{`${start}:${end}`}</div>
  ),
}));

vi.mock('#components/reports/graphs/SpendingGraph', () => ({
  SpendingGraph: (props: {
    compare: string;
    compareTo: string;
    data: { intervalData: unknown[] };
  }) => {
    graphMocks.props = props;
    return <div data-testid="spending-graph" />;
  },
}));

vi.mock('#components/reports/LoadingIndicator', () => ({
  LoadingIndicator: () => <div data-testid="spending-loading" />,
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

function makeReportData({
  compare,
  compareTo,
}: {
  compare: string;
  compareTo: string;
}) {
  return {
    averageRange: {
      endMonth: null,
      months: [],
      startMonth: null,
    },
    endDate: `${compare}-31`,
    intervalData: Array.from({ length: 28 }, (_, index) => {
      const day = (index + 1).toString().padStart(2, '0');

      return {
        average: 0,
        budget: 0,
        compare: -10_000,
        compareTo: -7_000,
        day,
        months: {
          [compare]: {
            cumulative: -10_000,
            daily: index === 0 ? -10_000 : 0,
            date: `${compare}-${day}`,
            month: compare,
          },
          [compareTo]: {
            cumulative: -7_000,
            daily: index === 0 ? -7_000 : 0,
            date: `${compareTo}-${day}`,
            month: compareTo,
          },
        },
      };
    }),
    startDate: `${compare}-01`,
    totalAssets: 0,
    totalDebts: -10_000,
    totalTotals: -10_000,
  };
}

describe('SpendingCard report cells', () => {
  beforeEach(() => {
    graphMocks.props = null;
  });

  it('renders cached report cell data', () => {
    const compare = monthUtils.currentMonth();
    const compareTo = monthUtils.subMonths(compare, 1);

    render(
      <SpendingCard
        widgetId="spending-widget"
        meta={{
          compare,
          compareTo,
          mode: 'single-month',
          name: 'Cached spending',
        }}
        reportData={makeReportData({ compare, compareTo })}
        onMetaChange={vi.fn()}
      />,
    );

    expect(screen.getByText('Cached spending')).toBeInTheDocument();
    expect(screen.getByTestId('date-range').textContent).toBe(
      `${compare}:${compareTo}`,
    );
    expect(screen.getByText('+fmt:3000')).toBeInTheDocument();
    expect(screen.getByTestId('spending-graph')).toBeInTheDocument();
    expect(graphMocks.props?.data.intervalData).toHaveLength(28);
    expect(graphMocks.props?.compare).toBe(compare);
    expect(graphMocks.props?.compareTo).toBe(compareTo);
  });
});
