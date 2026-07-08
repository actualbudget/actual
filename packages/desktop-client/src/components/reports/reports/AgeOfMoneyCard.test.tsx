import type { ReactNode } from 'react';

import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { AgeOfMoneyCard } from './AgeOfMoneyCard';

const connectionMocks = vi.hoisted(() => ({
  send: vi.fn(),
}));

const graphMocks = vi.hoisted(() => ({
  props: null as {
    data: Array<{ ageOfMoney: number; date: string }>;
  } | null,
}));

vi.mock('@actual-app/components/block', () => ({
  Block: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}));

vi.mock('@actual-app/components/hooks/useResponsive', () => ({
  useResponsive: () => ({ isNarrowWidth: false }),
}));

vi.mock('@actual-app/components/view', () => ({
  View: ({ children }: { children?: ReactNode }) => <div>{children}</div>,
}));

vi.mock('@actual-app/core/platform/client/connection', () => ({
  send: connectionMocks.send,
}));

vi.mock('react-i18next', () => ({
  Trans: ({ children }: { children: ReactNode }) => children,
  useTranslation: () => ({
    t: (value: string, params?: Record<string, unknown>) =>
      params?.days == null
        ? value
        : value.replace('{{days}}', String(params.days)),
  }),
}));

vi.mock('#components/PrivacyFilter', () => ({
  PrivacyFilter: ({ children }: { children: ReactNode }) => children,
}));

vi.mock('#components/reports/DateRange', () => ({
  DateRange: ({ end, start }: { end: string; start: string }) => (
    <div data-testid="date-range">{`${start}:${end}`}</div>
  ),
}));

vi.mock('#components/reports/graphs/AgeOfMoneyGraph', () => ({
  AgeOfMoneyGraph: (props: {
    data: Array<{ ageOfMoney: number; date: string }>;
  }) => {
    graphMocks.props = props;
    return <div data-testid="age-of-money-graph" />;
  },
}));

vi.mock('#components/reports/LoadingIndicator', () => ({
  LoadingIndicator: () => <div data-testid="age-of-money-loading" />,
}));

vi.mock('#components/reports/ReportCard', () => ({
  ReportCard: ({ children }: { children: ReactNode }) => (
    <section>{children}</section>
  ),
}));

vi.mock('#components/reports/ReportCardName', () => ({
  ReportCardName: ({ name }: { name: string }) => <h2>{name}</h2>,
}));

describe('AgeOfMoneyCard report cells', () => {
  beforeEach(() => {
    graphMocks.props = null;
    connectionMocks.send.mockReset();
    connectionMocks.send.mockReturnValue(new Promise(() => undefined));
  });

  it('renders cached report cell data', () => {
    render(
      <AgeOfMoneyCard
        widgetId="age-of-money-widget"
        meta={{
          name: 'Cached age',
          timeFrame: {
            start: '2017-01',
            end: '2017-01',
            mode: 'static',
          },
        }}
        reportData={{
          currentAge: 20,
          graphData: [{ ageOfMoney: 20, date: 'Jan 2017' }],
          insufficientData: false,
          trend: 'up',
        }}
        onMetaChange={vi.fn()}
      />,
    );

    expect(screen.getByText('Cached age')).toBeInTheDocument();
    expect(screen.getByText('20 days')).toBeInTheDocument();
    expect(screen.getByText('↑ Improving')).toBeInTheDocument();
    expect(screen.getByTestId('date-range').textContent).toBe(
      '2017-01:2017-01',
    );
    expect(screen.getByTestId('age-of-money-graph')).toBeInTheDocument();
    expect(graphMocks.props?.data).toEqual([
      { ageOfMoney: 20, date: 'Jan 2017' },
    ]);
  });
});
