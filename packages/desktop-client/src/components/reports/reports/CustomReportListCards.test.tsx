import type { ReactNode } from 'react';

import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { CustomReportListCards } from './CustomReportListCards';

const graphMocks = vi.hoisted(() => ({
  props: null as {
    balanceType: string;
    data: unknown;
    graphType: string;
    groupBy: string;
    intervalsCount: number;
    mode: string;
  } | null,
}));

vi.mock('@actual-app/components/hooks/useResponsive', () => ({
  useResponsive: () => ({ isNarrowWidth: false }),
}));

vi.mock('@actual-app/components/icons/v1', () => ({
  SvgExclamationSolid: () => <span />,
}));

vi.mock('@actual-app/components/text', () => ({
  Text: ({ children }: { children: ReactNode }) => <span>{children}</span>,
}));

vi.mock('@actual-app/components/tooltip', () => ({
  Tooltip: ({ children }: { children: ReactNode }) => children,
}));

vi.mock('@actual-app/components/view', () => ({
  View: ({ children }: { children?: ReactNode }) => <div>{children}</div>,
}));

vi.mock('react-i18next', () => ({
  Trans: ({ children }: { children: ReactNode }) => children,
  useTranslation: () => ({ t: (value: string) => value }),
}));

vi.mock('#components/reports/ChooseGraph', () => ({
  ChooseGraph: (props: {
    balanceType: string;
    data: unknown;
    graphType: string;
    groupBy: string;
    intervalsCount: number;
    mode: string;
  }) => {
    graphMocks.props = props;
    return <div data-testid="custom-report-graph" />;
  },
}));

vi.mock('#components/reports/DateRange', () => ({
  DateRange: ({ end, start }: { end: string; start: string }) => (
    <div data-testid="date-range">{`${start}:${end}`}</div>
  ),
}));

vi.mock('#components/reports/LoadingIndicator', () => ({
  LoadingIndicator: () => <div data-testid="custom-report-loading" />,
}));

vi.mock('#components/reports/ReportCard', () => ({
  ReportCard: ({ children }: { children: ReactNode }) => (
    <section>{children}</section>
  ),
}));

vi.mock('#components/reports/ReportCardName', () => ({
  ReportCardName: ({ name }: { name: string }) => <h2>{name}</h2>,
}));

vi.mock('#components/reports/util', () => ({
  calculateHasWarning: () => false,
}));

vi.mock('#hooks/useAccounts', () => ({
  useAccounts: () => ({ data: [] }),
}));

vi.mock('#hooks/useCategories', () => ({
  useCategories: () => ({ data: { grouped: [], list: [] } }),
}));

vi.mock('#hooks/usePayees', () => ({
  usePayees: () => ({ data: [] }),
}));

vi.mock('#redux', () => ({
  useDispatch: () => vi.fn(),
}));

vi.mock('#reports/mutations', () => ({
  useUpdateReportMutation: () => ({ mutate: vi.fn() }),
}));

describe('CustomReportListCards report cells', () => {
  beforeEach(() => {
    graphMocks.props = null;
  });

  it('renders cached report cell data', () => {
    render(
      <CustomReportListCards
        widgetId="custom-report-widget"
        report={{
          balanceType: 'Payment',
          conditions: [],
          conditionsOp: 'and',
          dateRange: 'Last 6 months',
          endDate: '2017-01-31',
          graphType: 'BarGraph',
          groupBy: 'Category',
          id: 'custom-report',
          includeCurrentInterval: true,
          interval: 'Monthly',
          isDateStatic: true,
          mode: 'total',
          name: 'Cached custom report',
          showEmpty: false,
          showHiddenCategories: true,
          showOffBudget: false,
          showTrendLines: false,
          showUncategorized: true,
          sortBy: 'desc',
          startDate: '2017-01-01',
          trimIntervals: false,
        }}
        reportData={{
          data: [
            {
              id: 'groceries',
              intervalData: [],
              name: 'Groceries',
              netAssets: 0,
              netDebts: -8_000,
              totalAssets: 0,
              totalBudgeted: -8_000,
              totalDebts: -8_000,
              totalTotals: -8_000,
            },
          ],
          endDate: '2017-01-31',
          groupedData: [],
          intervalData: [
            {
              date: "Jan '17",
              netAssets: 0,
              netDebts: -8_000,
              totalAssets: 0,
              totalBudgeted: -8_000,
              totalDebts: -8_000,
              totalTotals: -8_000,
            },
          ],
          intervalsCount: 1,
          legend: [],
          netAssets: 0,
          netDebts: -8_000,
          startDate: '2017-01-01',
          totalAssets: 0,
          totalBudgeted: -8_000,
          totalDebts: -8_000,
          totalTotals: -8_000,
        }}
      />,
    );

    expect(screen.getByText('Cached custom report')).toBeInTheDocument();
    expect(screen.getByTestId('date-range').textContent).toBe(
      '2017-01-01:2017-01-31',
    );
    expect(screen.getByTestId('custom-report-graph')).toBeInTheDocument();
    expect(graphMocks.props?.intervalsCount).toBe(1);
    expect(graphMocks.props?.balanceType).toBe('Payment');
    expect(graphMocks.props?.graphType).toBe('BarGraph');
    expect(graphMocks.props?.groupBy).toBe('Category');
  });
});
