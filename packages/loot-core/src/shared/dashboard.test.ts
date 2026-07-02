import { describe, expect, it } from 'vitest';

import type {
  CustomReportEntity,
  CustomReportWidget,
  NetWorthWidget,
} from '#types/models';

import { serializeDashboardWidget } from './dashboard';

const baseCustomReport: CustomReportEntity = {
  id: 'report-1',
  name: 'My Report',
  startDate: '2024-01-01',
  endDate: '2024-12-31',
  isDateStatic: false,
  dateRange: 'This year',
  mode: 'total',
  groupBy: 'Category',
  interval: 'Monthly',
  balanceType: 'Expense',
  showEmpty: false,
  showOffBudget: false,
  showHiddenCategories: false,
  includeCurrentInterval: false,
  showUncategorized: false,
  trimIntervals: false,
  showTrendLines: false,
  graphType: 'BarGraph',
  conditionsOp: 'and',
};

describe('serializeDashboardWidget', () => {
  it('strips id/tombstone from a non-custom-report widget and preserves other fields', () => {
    const widget: NetWorthWidget = {
      id: 'widget-1',
      dashboard_page_id: 'page-1',
      type: 'net-worth-card',
      x: 1,
      y: 2,
      width: 6,
      height: 2,
      meta: { mode: 'trend' },
      tombstone: false,
    };

    const result = serializeDashboardWidget(widget, new Map());

    expect(result).toEqual({
      dashboard_page_id: 'page-1',
      type: 'net-worth-card',
      x: 1,
      y: 2,
      width: 6,
      height: 2,
      meta: { mode: 'trend' },
    });
  });

  it('replaces meta with the full CustomReportEntity for custom-report widgets', () => {
    const widget: CustomReportWidget = {
      id: 'widget-2',
      dashboard_page_id: 'page-1',
      type: 'custom-report',
      x: 0,
      y: 0,
      width: 4,
      height: 2,
      meta: { id: 'report-1' },
      tombstone: false,
    };

    const customReportMap = new Map([['report-1', baseCustomReport]]);
    const result = serializeDashboardWidget(widget, customReportMap);

    expect(result.meta).toEqual(baseCustomReport);
    expect(result).toMatchObject({
      type: 'custom-report',
      x: 0,
      y: 0,
      width: 4,
      height: 2,
    });
  });

  it('throws when a custom-report widget references a missing report', () => {
    const widget: CustomReportWidget = {
      id: 'widget-3',
      dashboard_page_id: 'page-1',
      type: 'custom-report',
      x: 0,
      y: 0,
      width: 4,
      height: 2,
      meta: { id: 'missing-report' },
      tombstone: false,
    };

    expect(() => serializeDashboardWidget(widget, new Map())).toThrow(
      'Custom report not found for widget: widget-3',
    );
  });
});
