import { describe, expect, it } from 'vitest';

import { resolveDashboardTimeRange } from './useDashboardReportTimeRange';

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
