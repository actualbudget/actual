import { v4 as uuidv4 } from 'uuid';
import { beforeEach, describe, expect, it } from 'vitest';

import * as fs from '#platform/server/fs';
import { aqlQuery } from '#server/aql';
import * as db from '#server/db';
import { loadMappings } from '#server/db/mappings';
import { runMutator } from '#server/mutators';
import { q } from '#shared/query';
import type { DashboardWidgetEntity } from '#types/models';

import { app as dashboardApp, isWidgetType } from './app';

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
  'monte-carlo-card',
);

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

describe('dashboard-update', () => {
  beforeEach(async () => {
    await global.emptyDatabase()();
    await loadMappings();
  });

  async function addWidget(id: string, x: number) {
    await db.insertWithSchema('dashboard', {
      id,
      type: 'markdown-card',
      width: 4,
      height: 2,
      x,
      y: 0,
      meta: { content: 'test content' },
      dashboard_page_id: 'dashboard-page-id',
    });
  }

  // An empty database still carries the default dashboard the migrations
  // seed, so only look at the widgets the test added
  async function getTestWidgets(ids: string[]) {
    const { data } = await aqlQuery(
      q('dashboard')
        .filter({ id: { $oneof: ids } })
        .select('*'),
    );
    return (data as DashboardWidgetEntity[]).sort((a, b) =>
      a.id.localeCompare(b.id),
    );
  }

  it('persists every widget in a layout change', async () => {
    await addWidget('widget-1', 0);
    await addWidget('widget-2', 4);
    await addWidget('widget-3', 8);

    await runMutator(() =>
      dashboardApp.handlers['dashboard-update']([
        { id: 'widget-1', x: 8, y: 2 },
        { id: 'widget-2', x: 0, y: 4 },
        { id: 'widget-3', x: 4, y: 6 },
      ]),
    );

    expect(
      (await getTestWidgets(['widget-1', 'widget-2', 'widget-3'])).map(
        ({ id, x, y }) => ({ id, x, y }),
      ),
    ).toEqual([
      { id: 'widget-1', x: 8, y: 2 },
      { id: 'widget-2', x: 0, y: 4 },
      { id: 'widget-3', x: 4, y: 6 },
    ]);
  });

  it('round-trips a meta object', async () => {
    await addWidget('widget-1', 0);

    await runMutator(() =>
      dashboardApp.handlers['dashboard-update']([
        { id: 'widget-1', meta: { content: '## Notes' } },
      ]),
    );

    expect((await getTestWidgets(['widget-1']))[0].meta).toEqual({
      content: '## Notes',
    });
  });

  it('rejects duplicate widget IDs in a batch update', async () => {
    await addWidget('widget-1', 0);

    await expect(
      runMutator(() =>
        dashboardApp.handlers['dashboard-update']([
          { id: 'widget-1', x: 2, y: 0 },
          { id: 'widget-1', x: 4, y: 0 },
        ]),
      ),
    ).rejects.toThrow('Duplicate widget id in batch: widget-1');
  });
});

describe('dashboard metadata validation', () => {
  beforeEach(async () => {
    await global.emptyDatabase()();
    await loadMappings();
  });

  it('rejects adding custom-report widget without meta.id', async () => {
    await expect(
      runMutator(() =>
        dashboardApp.handlers['dashboard-add-widget']({
          type: 'custom-report',
          width: 4,
          height: 2,
          dashboard_page_id: 'dashboard-page-id',
          meta: null,
        } as unknown as Parameters<
          (typeof dashboardApp.handlers)['dashboard-add-widget']
        >[0]),
      ),
    ).rejects.toThrow('custom-report widget requires meta.id');
  });

  it('rejects adding markdown-card widget without meta.content', async () => {
    await expect(
      runMutator(() =>
        dashboardApp.handlers['dashboard-add-widget']({
          type: 'markdown-card',
          width: 4,
          height: 2,
          dashboard_page_id: 'dashboard-page-id',
          meta: null,
        } as unknown as Parameters<
          (typeof dashboardApp.handlers)['dashboard-add-widget']
        >[0]),
      ),
    ).rejects.toThrow('markdown-card widget requires meta.content');
  });

  it('rejects updating custom-report widget to null metadata', async () => {
    await db.insertWithSchema('dashboard', {
      id: 'report-widget-1',
      type: 'custom-report',
      width: 4,
      height: 2,
      x: 0,
      y: 0,
      dashboard_page_id: 'dashboard-page-id',
      meta: { id: 'report-1' },
    });

    await expect(
      runMutator(() =>
        dashboardApp.handlers['dashboard-update-widget']({
          id: 'report-widget-1',
          meta: null,
        }),
      ),
    ).rejects.toThrow('custom-report widget requires meta.id');

    await expect(
      runMutator(() =>
        dashboardApp.handlers['dashboard-update']([
          {
            id: 'report-widget-1',
            meta: null,
          },
        ]),
      ),
    ).rejects.toThrow('custom-report widget requires meta.id');
  });

  it('rejects updating markdown-card widget to null metadata', async () => {
    await db.insertWithSchema('dashboard', {
      id: 'markdown-widget-1',
      type: 'markdown-card',
      width: 4,
      height: 2,
      x: 0,
      y: 0,
      dashboard_page_id: 'dashboard-page-id',
      meta: { content: 'hello' },
    });

    await expect(
      runMutator(() =>
        dashboardApp.handlers['dashboard-update-widget']({
          id: 'markdown-widget-1',
          meta: null,
        }),
      ),
    ).rejects.toThrow('markdown-card widget requires meta.content');

    await expect(
      runMutator(() =>
        dashboardApp.handlers['dashboard-update']([
          {
            id: 'markdown-widget-1',
            meta: null,
          },
        ]),
      ),
    ).rejects.toThrow('markdown-card widget requires meta.content');
  });

  it('preserves valid partial updates on custom-report widget without meta', async () => {
    await db.insertWithSchema('dashboard', {
      id: 'report-widget-2',
      type: 'custom-report',
      width: 4,
      height: 2,
      x: 0,
      y: 0,
      dashboard_page_id: 'dashboard-page-id',
      meta: { id: 'report-1' },
    });

    await runMutator(() =>
      dashboardApp.handlers['dashboard-update-widget']({
        id: 'report-widget-2',
        width: 8,
      }),
    );

    const { data } = await aqlQuery(
      q('dashboard').filter({ id: 'report-widget-2' }).select('*'),
    );
    expect(data[0].width).toBe(8);
    expect(data[0].meta).toEqual({ id: 'report-1' });
  });

  it('allows layout-only updates on existing widgets with invalid metadata', async () => {
    await db.insertWithSchema('dashboard', {
      id: 'legacy-markdown-widget',
      type: 'markdown-card',
      width: 4,
      height: 2,
      x: 0,
      y: 0,
      dashboard_page_id: 'dashboard-page-id',
      meta: {},
    });

    await runMutator(() =>
      dashboardApp.handlers['dashboard-update']([
        { id: 'legacy-markdown-widget', x: 4, y: 2 },
      ]),
    );

    const { data: updatedBatch } = await aqlQuery(
      q('dashboard').filter({ id: 'legacy-markdown-widget' }).select('*'),
    );
    expect(updatedBatch[0].x).toBe(4);
    expect(updatedBatch[0].y).toBe(2);

    await runMutator(() =>
      dashboardApp.handlers['dashboard-update-widget']({
        id: 'legacy-markdown-widget',
        width: 6,
      }),
    );

    const { data: updatedSingle } = await aqlQuery(
      q('dashboard').filter({ id: 'legacy-markdown-widget' }).select('*'),
    );
    expect(updatedSingle[0].width).toBe(6);
  });

  it('normalizes markdown-card metadata without content during dashboard import', async () => {
    const importPath = `/tmp/test-dashboard-import-${uuidv4()}.json`;
    try {
      await fs.writeFile(
        importPath,
        JSON.stringify({
          version: 1,
          widgets: [
            {
              type: 'markdown-card',
              x: 0,
              y: 0,
              width: 4,
              height: 2,
              dashboard_page_id: 'dashboard-page-id',
              meta: {},
            },
          ],
        }),
      );

      await db.insertWithSchema('dashboard_pages', {
        id: 'dashboard-page-id',
        name: 'Dashboard',
      });

      await runMutator(() =>
        dashboardApp.handlers['dashboard-import']({
          filePath: importPath,
          dashboardPageId: 'dashboard-page-id',
        }),
      );

      const { data } = await aqlQuery(
        q('dashboard')
          .filter({ dashboard_page_id: 'dashboard-page-id' })
          .select('*'),
      );
      expect(data).toHaveLength(1);
      expect(data[0].type).toBe('markdown-card');
      expect(data[0].meta).toEqual({ content: '' });
    } finally {
      if (await fs.exists(importPath)) {
        await fs.removeFile(importPath);
      }
    }
  });
});
