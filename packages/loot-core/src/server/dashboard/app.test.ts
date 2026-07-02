import AdmZip from 'adm-zip';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { aqlQuery } from '#server/aql';
import type { DashboardWidgetEntity } from '#types/models';

import { app, isWidgetType } from './app';

vi.mock('#server/aql', () => ({
  aqlQuery: vi.fn(),
}));

const aqlQueryMock = vi.mocked(aqlQuery);

type DashboardPageRow = {
  id: string;
  name: string;
};

function mockDashboardExportData({
  pages,
  widgets,
}: {
  pages: DashboardPageRow[];
  widgets: DashboardWidgetEntity[];
}) {
  aqlQueryMock
    .mockResolvedValueOnce({ data: pages, dependencies: [] })
    .mockResolvedValueOnce({ data: widgets, dependencies: [] })
    .mockResolvedValueOnce({ data: [], dependencies: [] });
}

function allWidgetTypes<T extends DashboardWidgetEntity['type'][]>(
  ...types: T &
    (DashboardWidgetEntity['type'] extends T[number] ? unknown : never)
): T {
  return types;
}

const ALL_WIDGET_TYPES = allWidgetTypes(
  'net-worth-card',
  'cash-flow-card',
  'spending-card',
  'crossover-card',
  'budget-analysis-card',
  'markdown-card',
  'summary-card',
  'calendar-card',
  'formula-card',
  'custom-report',
  'sankey-card',
  'balance-forecast-card',
  'age-of-money-card',
);

beforeEach(() => {
  aqlQueryMock.mockReset();
});

describe('isWidgetType', () => {
  it('all known widget types should be recognized', () => {
    for (const type of ALL_WIDGET_TYPES) {
      expect(isWidgetType(type)).toBe(true);
    }
  });

  it('unknown widget types should be rejected', () => {
    expect(isWidgetType('unknown-card')).toBe(false);
  });
});

describe('dashboard-export-all', () => {
  const brokenCustomReportWidget: DashboardWidgetEntity = {
    id: 'widget-bad',
    dashboard_page_id: 'page-bad',
    type: 'custom-report',
    x: 0,
    y: 0,
    width: 4,
    height: 2,
    meta: { id: 'missing-report' },
    tombstone: false,
  };

  it('exports healthy dashboards when another dashboard references a missing custom report', async () => {
    const healthyWidget: DashboardWidgetEntity = {
      id: 'widget-good',
      dashboard_page_id: 'page-good',
      type: 'markdown-card',
      x: 0,
      y: 0,
      width: 4,
      height: 2,
      meta: { content: 'hello' },
      tombstone: false,
    };

    mockDashboardExportData({
      pages: [
        { id: 'page-good', name: 'Healthy Dashboard' },
        { id: 'page-bad', name: 'Broken Reports' },
      ],
      widgets: [healthyWidget, brokenCustomReportWidget],
    });

    const response = await app.handlers['dashboard-export-all']();

    expect(response.skippedDashboards).toEqual([
      { name: 'Broken Reports', reason: 'missing-custom-report' },
    ]);

    if (!('data' in response)) {
      throw new Error('Expected dashboard export data');
    }

    const zip = new AdmZip(response.data);
    const entries = zip.getEntries().map(entry => entry.entryName);

    expect(entries).toEqual(['1-healthy-dashboard.json']);

    const exportedDashboard = JSON.parse(
      zip.readAsText('1-healthy-dashboard.json'),
    );

    expect(exportedDashboard).toEqual({
      version: 1,
      widgets: [
        {
          dashboard_page_id: 'page-good',
          type: 'markdown-card',
          x: 0,
          y: 0,
          width: 4,
          height: 2,
          meta: { content: 'hello' },
        },
      ],
    });
  });

  it('returns all-dashboards-failed when every dashboard is skipped', async () => {
    mockDashboardExportData({
      pages: [{ id: 'page-bad', name: 'Broken Reports' }],
      widgets: [brokenCustomReportWidget],
    });

    const response = await app.handlers['dashboard-export-all']();

    expect(response).toEqual({
      error: 'all-dashboards-failed',
      skippedDashboards: [
        { name: 'Broken Reports', reason: 'missing-custom-report' },
      ],
    });
  });
});
