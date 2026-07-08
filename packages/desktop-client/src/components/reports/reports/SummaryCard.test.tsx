import React from 'react';

import type { SummaryWidget } from '@actual-app/core/types/models';
import type { ReportSpreadsheetCell } from '@actual-app/core/types/report-spreadsheet';
import { act, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useDashboardReportCells } from '../useReportCells';

import { SummaryCard } from './SummaryCard';

const connectionMocks = vi.hoisted(() => ({
  listen: vi.fn(),
  reportCellsChanged: undefined as
    | ((cells: ReportSpreadsheetCell[]) => void)
    | undefined,
  send: vi.fn(),
}));

vi.mock('@actual-app/core/platform/client/connection', () => ({
  listen: connectionMocks.listen,
  send: connectionMocks.send,
}));

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (value: string) => value }),
}));

vi.mock('#components/reports/DateRange', () => ({
  DateRange: ({ end, start }: { end: string; start: string }) => (
    <div data-testid="date-range">{`${start}:${end}`}</div>
  ),
}));

vi.mock('#components/reports/ReportCard', () => ({
  ReportCard: ({ children }: { children: React.ReactNode }) => (
    <section>{children}</section>
  ),
}));

vi.mock('#components/reports/ReportCardName', () => ({
  ReportCardName: ({ name }: { name: string }) => <h2>{name}</h2>,
}));

vi.mock('#components/reports/ReportCardValueSkeleton', () => ({
  ReportCardValueSkeleton: () => <div data-testid="summary-skeleton" />,
}));

vi.mock('#components/reports/SummaryNumber', () => ({
  SummaryNumber: ({ value }: { value: number }) => (
    <div data-testid="summary-value">{value}</div>
  ),
}));

const summaryWidget = {
  id: 'summary-widget',
  dashboard_page_id: 'dashboard-page',
  type: 'summary-card',
  width: 3,
  height: 2,
  x: 0,
  y: 0,
  meta: {
    content: JSON.stringify({ type: 'sum' }),
    name: 'Cached summary',
    timeFrame: {
      start: '2017-01',
      end: '2017-01',
      mode: 'static',
    },
  },
  tombstone: false,
} satisfies SummaryWidget;

function makeReportCell(total: number): ReportSpreadsheetCell {
  return {
    widgetId: summaryWidget.id,
    name: 'report:summary-widget:test!data',
    value: {
      dividend: total,
      divisor: 0,
      fromRange: 'Jan 17',
      toRange: 'Jan 17',
      total,
    },
  };
}

function TestDashboardSummaryCard() {
  const cells = useDashboardReportCells('dashboard-page', [summaryWidget]);

  return (
    <SummaryCard
      widgetId={summaryWidget.id}
      meta={summaryWidget.meta}
      reportData={cells[summaryWidget.id]?.value}
      onMetaChange={vi.fn()}
    />
  );
}

describe('SummaryCard report cells', () => {
  beforeEach(() => {
    connectionMocks.reportCellsChanged = undefined;
    connectionMocks.listen.mockReset();
    connectionMocks.send.mockReset();
    connectionMocks.listen.mockImplementation(
      (
        eventName: string,
        callback: (cells: ReportSpreadsheetCell[]) => void,
      ) => {
        if (eventName === 'report-cells-changed') {
          connectionMocks.reportCellsChanged = callback;
        }
        return () => {};
      },
    );
    connectionMocks.send.mockImplementation((methodName: string) => {
      if (methodName === 'get-latest-transaction') {
        return Promise.resolve({ date: '2017-01-31' });
      }
      if (methodName === 'report-spreadsheet/prepare-dashboard') {
        return Promise.resolve({
          cells: {
            [summaryWidget.id]: makeReportCell(10_000),
          },
        });
      }
      throw new Error(`Unexpected send call: ${methodName}`);
    });
  });

  it('renders prepared cached data and updates when report cells change', async () => {
    render(<TestDashboardSummaryCard />);

    expect(screen.getByTestId('summary-skeleton')).toBeInTheDocument();
    await waitFor(() => {
      expect(screen.getByTestId('summary-value').textContent).toBe('10000');
    });

    const listener = connectionMocks.reportCellsChanged;
    if (!listener) {
      throw new Error('Expected report-cells-changed listener');
    }

    act(() => {
      listener([makeReportCell(25_000)]);
    });

    expect(screen.getByTestId('summary-value').textContent).toBe('25000');
  });
});
