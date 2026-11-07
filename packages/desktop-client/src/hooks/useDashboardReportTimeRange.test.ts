import { createElement } from 'react';
import type { ReactNode } from 'react';
import { MemoryRouter } from 'react-router';

import type { NetWorthWidget } from '@actual-app/core/types/models';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import {
  resolveDashboardTimeRange,
  useDashboardReportTimeRange,
} from './useDashboardReportTimeRange';

const dashboardScope = {
  start: '2026-03',
  end: '2026-08',
  mode: 'sliding-window' as const,
};

describe('resolveDashboardTimeRange', () => {
  it('inherits dashboard dates or anchors an independent LIVE range to its end', () => {
    expect(
      resolveDashboardTimeRange(dashboardScope, true, {
        start: '2025-01',
        end: '2025-03',
        mode: 'sliding-window',
      }),
    ).toEqual(['2026-03', '2026-08', 'sliding-window']);

    expect(
      resolveDashboardTimeRange(dashboardScope, false, {
        start: '2025-01',
        end: '2025-03',
        mode: 'sliding-window',
      }),
    ).toEqual(['2026-06', '2026-08', 'sliding-window']);

    expect(
      resolveDashboardTimeRange(dashboardScope, false, {
        start: '2025-01',
        end: '2025-03',
        mode: 'static',
      }),
    ).toEqual(['2025-01', '2025-03', 'static']);
  });
});

it('shares the temporary range choice without changing widget metadata', () => {
  const widget: NetWorthWidget = {
    id: 'widget',
    dashboard_page_id: 'default',
    type: 'net-worth-card',
    x: 0,
    y: 0,
    width: 4,
    height: 2,
    tombstone: false,
    meta: null,
  };
  const queryClient = new QueryClient();
  function wrapper({ children }: { children: ReactNode }) {
    return createElement(
      QueryClientProvider,
      { client: queryClient },
      createElement(
        MemoryRouter,
        {
          initialEntries: [
            '/reports?dashboardWidget=widget&dashboardStart=2026-03&dashboardEnd=2026-08&dashboardMode=sliding-window',
          ],
        },
        children,
      ),
    );
  }
  const { result } = renderHook(
    () => ({
      report: useDashboardReportTimeRange(widget),
      header: useDashboardReportTimeRange(widget),
    }),
    { wrapper },
  );

  expect(result.current.report.isUsingDashboardRange).toBe(true);
  act(() => result.current.header.setUseDashboardDateRange(false));
  expect(result.current.report.isUsingDashboardRange).toBe(false);
  act(() => result.current.header.setUseDashboardDateRange(true));
  expect(result.current.report.isUsingDashboardRange).toBe(true);
  expect(widget.meta).toBeNull();
});
