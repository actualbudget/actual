import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import * as fs from '#platform/server/fs';
import { app as dashboardApp } from '#server/dashboard/app';
import * as db from '#server/db';
import { loadMappings } from '#server/db/mappings';
import { runMutator } from '#server/mutators';
import type { CustomReportEntity, CustomReportTagScope } from '#types/models';

import { app as reportApp, reportModel } from './app';

const dashboardImportPath = '/tmp/custom-report-dashboard.json';

const report: CustomReportEntity = {
  id: 'report-id',
  name: 'Tags report',
  startDate: '2026-01-01',
  endDate: '2026-01-31',
  isDateStatic: true,
  dateRange: 'This month',
  mode: 'total',
  groupBy: 'Tag',
  interval: 'Daily',
  balanceType: 'Payment',
  sortBy: 'desc',
  showEmpty: false,
  showOffBudget: false,
  showHiddenCategories: false,
  includeCurrentInterval: false,
  showUncategorized: true,
  trimIntervals: false,
  showTrendLines: false,
  graphType: 'TableGraph',
  conditions: [],
  conditionsOp: 'and',
};

async function writeDashboardReport(meta: unknown) {
  await fs.writeFile(
    dashboardImportPath,
    JSON.stringify({
      version: 1,
      widgets: [
        {
          type: 'custom-report',
          x: 0,
          y: 0,
          width: 4,
          height: 2,
          dashboard_page_id: 'exported-dashboard-page-id',
          meta,
        },
      ],
    }),
  );
}

describe('custom report tag scope mapping', () => {
  beforeEach(async () => {
    await global.emptyDatabase()();
    await loadMappings();
  });

  afterEach(async () => {
    if (await fs.exists(dashboardImportPath)) {
      await fs.removeFile(dashboardImportPath);
    }
  });

  it('updates tag scope through SQLite and AQL, retaining missing IDs and other metadata', async () => {
    const tagScope = {
      mode: 'selected',
      tagIds: ['visible-id', 'missing-id'],
    } satisfies CustomReportTagScope;
    await db.insertWithSchema(
      'custom_reports',
      reportModel.fromJS({
        ...report,
        tagScope,
        metadata: { presentation: 'compact' },
      }),
    );

    const [selectedReport] = await reportApp.handlers['report/get']();
    expect(selectedReport).toMatchObject({
      tagScope,
      metadata: { presentation: 'compact' },
    });

    await db.updateWithSchema(
      'custom_reports',
      reportModel.fromJS({ ...selectedReport, tagScope: { mode: 'all' } }),
    );
    const [allTagsReport] = await reportApp.handlers['report/get']();
    expect(allTagsReport).toMatchObject({
      tagScope: { mode: 'all' },
      metadata: { presentation: 'compact' },
    });

    await db.updateWithSchema(
      'custom_reports',
      reportModel.fromJS({ ...allTagsReport, tagScope: undefined }),
    );
    const [clearedReport] = await reportApp.handlers['report/get']();
    expect(clearedReport.tagScope).toBeUndefined();
    expect(clearedReport.metadata).toEqual({ presentation: 'compact' });
  });

  it('loads reports that have no metadata', async () => {
    const reportWithoutMetadata = reportModel.fromJS(report);
    delete reportWithoutMetadata.metadata;
    await db.insertWithSchema('custom_reports', reportWithoutMetadata);

    const [loadedReport] = await reportApp.handlers['report/get']();
    expect(loadedReport.tagScope).toBeUndefined();
  });

  it.each([
    { balanceType: 'Budgeted' },
    { tagScope: { mode: 'selected' } },
    { tagScope: { mode: 'selected', tagIds: 'red-id' } },
    { tagScope: { mode: 'selected', tagIds: [42] } },
    { tagScope: { mode: 'unknown' } },
    { tagScope: null },
  ])('rejects invalid imported tag reports: %j', async invalid => {
    await writeDashboardReport({ ...report, ...invalid });

    await expect(
      runMutator(() =>
        dashboardApp.handlers['dashboard-import']({
          filePath: dashboardImportPath,
          dashboardPageId: 'dashboard-page-id',
        }),
      ),
    ).rejects.toMatchObject({ cause: 'validation-error' });
    expect(await reportApp.handlers['report/get']()).toEqual([]);
  });

  it.each<CustomReportTagScope>([
    { mode: 'all' },
    { mode: 'selected', tagIds: [] },
    {
      mode: 'selected',
      tagIds: ['existing-id', 'missing-id'],
    },
  ])(
    'restores tag scope when importing a deleted report: %j',
    async tagScope => {
      await db.insertWithSchema(
        'custom_reports',
        reportModel.fromJS({ ...report, tagScope }),
      );
      await db.insertWithSchema('dashboard_pages', {
        id: 'dashboard-page-id',
        name: 'Dashboard',
      });

      const [exportedReport] = await reportApp.handlers['report/get']();
      await writeDashboardReport(exportedReport);

      await db.delete_('custom_reports', report.id);
      await runMutator(() =>
        dashboardApp.handlers['dashboard-import']({
          filePath: dashboardImportPath,
          dashboardPageId: 'dashboard-page-id',
        }),
      );

      const [importedReport] = await reportApp.handlers['report/get']();
      expect(importedReport.tagScope).toEqual(tagScope);
    },
  );
});
