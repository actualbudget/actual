import React from 'react';

import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { BalanceForecastCard } from './BalanceForecastCard';

const chartMocks = vi.hoisted(() => ({
  data: null as Array<{ balance: number; date: string }> | null,
}));

vi.mock('@actual-app/components/block', () => ({
  Block: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

vi.mock('@actual-app/components/view', () => ({
  View: ({ children }: { children?: React.ReactNode }) => <div>{children}</div>,
}));

vi.mock('react-i18next', () => ({
  Trans: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  useTranslation: () => ({ t: (value: string) => value }),
}));

vi.mock('recharts', () => ({
  Line: () => null,
  LineChart: ({ data }: { data: Array<{ balance: number; date: string }> }) => {
    chartMocks.data = data;
    return <div data-testid="balance-forecast-chart" />;
  },
  ReferenceLine: () => null,
  ResponsiveContainer: ({ children }: { children: React.ReactNode }) => (
    <>{children}</>
  ),
  Tooltip: () => null,
}));

vi.mock('#components/PrivacyFilter', () => ({
  PrivacyFilter: ({ children }: { children: React.ReactNode }) => (
    <>{children}</>
  ),
}));

vi.mock('#components/reports/Container', () => ({
  Container: ({
    children,
  }: {
    children: (width: number, height: number) => React.ReactNode;
  }) => <>{children(320, 180)}</>,
}));

vi.mock('#components/reports/DateRange', () => ({
  DateRange: ({ end, start }: { end: string; start: string }) => (
    <div data-testid="date-range">{`${start}:${end}`}</div>
  ),
}));

vi.mock('#components/reports/LoadingIndicator', () => ({
  LoadingIndicator: () => <div data-testid="balance-forecast-loading" />,
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

vi.mock('#hooks/useSyncedPref', () => ({
  useSyncedPref: () => ['envelope'],
}));

describe('BalanceForecastCard report cells', () => {
  beforeEach(() => {
    chartMocks.data = null;
  });

  it('renders cached report cell data', () => {
    render(
      <BalanceForecastCard
        widgetId="balance-forecast-widget"
        meta={{
          name: 'Cached forecast',
          timeFrame: {
            start: '2017-01',
            end: '2017-01',
            mode: 'static',
          },
        }}
        reportData={{
          error: null,
          forecastData: {
            dataPoints: [
              {
                accountId: 'checking',
                accountName: 'Checking',
                balance: 12_345,
                date: '2017-01-31',
                transactions: [],
              },
            ],
            forecastEndDate: '2017-01-31',
            forecastStartDate: '2017-01-01',
            lowestBalance: {
              accountId: 'checking',
              accountName: 'Checking',
              balance: 12_345,
              date: '2017-01-31',
            },
          },
        }}
        onMetaChange={vi.fn()}
      />,
    );

    expect(screen.getByText('Cached forecast')).toBeInTheDocument();
    expect(screen.getByTestId('date-range').textContent).toBe(
      '2017-01:2017-01',
    );
    expect(screen.getByText(/fmt:12345/)).toBeInTheDocument();
    expect(screen.getByTestId('balance-forecast-chart')).toBeInTheDocument();
    expect(chartMocks.data).toEqual([{ balance: 12_345, date: '2017-01' }]);
  });
});
