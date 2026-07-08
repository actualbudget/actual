import React from 'react';

import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { CalendarCard } from './CalendarCard';

const connectionMocks = vi.hoisted(() => ({
  send: vi.fn(),
}));

const graphMocks = vi.hoisted(() => ({
  props: null as {
    data: Array<{
      date: Date;
      expenseValue: number;
      incomeValue: number;
    }>;
    start: Date;
  } | null,
}));

vi.mock('@actual-app/components/block', () => ({
  Block: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

vi.mock('@actual-app/components/button', () => ({
  Button: React.forwardRef<
    HTMLButtonElement,
    {
      children: React.ReactNode;
      onPress?: () => void;
    }
  >(({ children, onPress }, ref) => (
    <button ref={ref} onClick={onPress}>
      {children}
    </button>
  )),
}));

vi.mock('@actual-app/components/hooks/useResponsive', () => ({
  useResponsive: () => ({ isNarrowWidth: false }),
}));

vi.mock('@actual-app/components/icons/v1', () => ({
  SvgArrowThickDown: () => <span />,
  SvgArrowThickUp: () => <span />,
}));

vi.mock('@actual-app/components/tooltip', () => ({
  Tooltip: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

vi.mock('@actual-app/components/view', () => ({
  View: React.forwardRef<HTMLDivElement, { children?: React.ReactNode }>(
    ({ children }, ref) => <div ref={ref}>{children}</div>,
  ),
}));

vi.mock('@actual-app/core/platform/client/connection', () => ({
  send: connectionMocks.send,
}));

vi.mock('react-i18next', () => ({
  Trans: ({ children }: { children: React.ReactNode }) => <>{children}</>,
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

vi.mock('#components/reports/CalendarCardSkeleton', () => ({
  CalendarCardSkeleton: () => <div data-testid="calendar-loading" />,
}));

vi.mock('#components/reports/DateRange', () => ({
  DateRange: ({ end, start }: { end: string; start: string }) => (
    <div data-testid="date-range">{`${start}:${end}`}</div>
  ),
}));

vi.mock('#components/reports/graphs/CalendarGraph', () => ({
  CalendarGraph: (props: {
    data: Array<{
      date: Date;
      expenseValue: number;
      incomeValue: number;
    }>;
    start: Date;
  }) => {
    graphMocks.props = props;
    return <div data-testid="calendar-graph" />;
  },
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

vi.mock('#hooks/useMergedRefs', () => ({
  useMergedRefs: () => () => {},
}));

vi.mock('#hooks/useNavigate', () => ({
  useNavigate: () => vi.fn(),
}));

vi.mock('#hooks/useResizeObserver', () => ({
  useResizeObserver: () => () => {},
}));

describe('CalendarCard report cells', () => {
  beforeEach(() => {
    graphMocks.props = null;
    connectionMocks.send.mockReset();
    connectionMocks.send.mockReturnValue(new Promise(() => {}));
  });

  it('renders cached report cell data', () => {
    render(
      <CalendarCard
        widgetId="calendar-widget"
        meta={{
          name: 'Cached calendar',
          timeFrame: {
            start: '2017-01',
            end: '2017-01',
            mode: 'static',
          },
        }}
        reportData={{
          calendarData: [
            {
              data: [
                {
                  date: '2017-01-01',
                  expenseSize: 100,
                  expenseValue: 8_000,
                  incomeSize: 100,
                  incomeValue: 20_000,
                },
              ],
              end: '2017-01-31',
              start: '2017-01-01',
              totalExpense: 8_000,
              totalIncome: 20_000,
            },
          ],
        }}
        onMetaChange={vi.fn()}
      />,
    );

    expect(screen.getByText('Cached calendar')).toBeInTheDocument();
    expect(screen.getByTestId('date-range').textContent).toBe(
      '2017-01:2017-01',
    );
    expect(screen.getByTestId('calendar-graph')).toBeInTheDocument();
    expect(graphMocks.props?.start).toBeInstanceOf(Date);
    expect(graphMocks.props?.data[0]).toMatchObject({
      expenseValue: 8_000,
      incomeValue: 20_000,
    });
    expect(graphMocks.props?.data[0].date).toBeInstanceOf(Date);
  });
});
