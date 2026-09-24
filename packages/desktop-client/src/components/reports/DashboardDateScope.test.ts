import { expect, it } from 'vitest';

import { addDashboardDateScopeToUrl } from './DashboardDateScope';

it('serializes the resolved dashboard editing snapshot', () => {
  expect(
    addDashboardDateScopeToUrl(
      '/reports/net-worth?id=report',
      { start: '2026-03', end: '2026-08', mode: 'sliding-window' },
      'widget-id',
    ),
  ).toBe(
    '/reports/net-worth?id=report&dashboardStart=2026-03&dashboardEnd=2026-08&dashboardMode=sliding-window&dashboardWidget=widget-id',
  );
});
