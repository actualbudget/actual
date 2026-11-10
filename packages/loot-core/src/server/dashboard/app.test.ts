import { beforeEach, describe, expect, it } from 'vitest';

import { aqlQuery } from '#server/aql';
import * as db from '#server/db';
import { loadMappings } from '#server/db/mappings';
import { runMutator } from '#server/mutators';
import { setSyncingMode } from '#server/sync';
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
});

describe('dashboard page order', () => {
  beforeEach(async () => {
    await global.emptyDatabase()();
    await loadMappings();
  });

  // The migrations seed a default dashboard, so start the list with it
  async function getPageNames() {
    const pages = await db.all<Pick<db.DbDashboardPage, 'name'>>(
      'SELECT name FROM dashboard_pages WHERE tombstone = 0 ORDER BY sort_order, id',
    );
    return pages.map(page => page.name);
  }

  async function createPage(name: string) {
    return await runMutator(() =>
      dashboardApp.handlers['dashboard-create']({ name }),
    );
  }

  it('adds new dashboards at the end', async () => {
    await createPage('Second');
    await createPage('Third');

    expect(await getPageNames()).toEqual(['Main', 'Second', 'Third']);
  });

  it('moves a dashboard before the target', async () => {
    await createPage('Second');
    const thirdId = await createPage('Third');
    const [main] = await db.all<Pick<db.DbDashboardPage, 'id'>>(
      "SELECT id FROM dashboard_pages WHERE name = 'Main'",
    );

    await runMutator(() =>
      dashboardApp.handlers['dashboard-move']({
        id: thirdId,
        targetId: main.id,
      }),
    );

    expect(await getPageNames()).toEqual(['Third', 'Main', 'Second']);
  });

  it('moves a dashboard to the end when there is no target', async () => {
    const secondId = await createPage('Second');
    await createPage('Third');

    await runMutator(() =>
      dashboardApp.handlers['dashboard-move']({
        id: secondId,
        targetId: null,
      }),
    );

    expect(await getPageNames()).toEqual(['Main', 'Third', 'Second']);
  });

  it('shoves dashboards that have the same sort order', async () => {
    // Older clients create dashboards with the column default
    await db.insertWithSchema('dashboard_pages', {
      id: 'a',
      name: 'A',
      sort_order: 1000000000,
    });
    await db.insertWithSchema('dashboard_pages', {
      id: 'b',
      name: 'B',
      sort_order: 1000000000,
    });

    await runMutator(() =>
      dashboardApp.handlers['dashboard-move']({ id: 'b', targetId: 'a' }),
    );

    expect(await getPageNames()).toEqual(['Main', 'B', 'A']);
  });

  it('moves a dashboard into the middle of dashboards with the same sort order', async () => {
    // The ids sort the moved dashboard first, so a tie with the dashboard
    // before the target would show it in the wrong place
    for (const [id, name] of [
      ['m', 'M'],
      ['z', 'Z'],
      ['a', 'A'],
    ]) {
      await db.insertWithSchema('dashboard_pages', {
        id,
        name,
        sort_order: id === 'a' ? 2000000000 : 1000000000,
      });
    }
    expect(await getPageNames()).toEqual(['Main', 'M', 'Z', 'A']);

    await runMutator(() =>
      dashboardApp.handlers['dashboard-move']({ id: 'a', targetId: 'z' }),
    );

    expect(await getPageNames()).toEqual(['Main', 'M', 'A', 'Z']);
  });

  it('syncs the sort order of every dashboard on a move', async () => {
    await createPage('Second');
    const thirdId = await createPage('Third');
    // Each device backfills sort_order locally, so a device can hold
    // values that were never synced
    db.runQuery(
      "UPDATE dashboard_pages SET sort_order = 999 WHERE name = 'Second'",
    );
    const pageIds = (
      await db.all<Pick<db.DbDashboardPage, 'id'>>(
        'SELECT id FROM dashboard_pages WHERE tombstone = 0',
      )
    ).map(page => page.id);

    // Messages are only stored in messages_crdt while syncing is enabled
    setSyncingMode('enabled');
    try {
      await runMutator(() =>
        dashboardApp.handlers['dashboard-move']({
          id: thirdId,
          targetId: null,
        }),
      );
    } finally {
      setSyncingMode('disabled');
    }

    const messages = await db.all<Pick<db.DbCrdtMessage, 'row'>>(
      "SELECT row FROM messages_crdt WHERE dataset = 'dashboard_pages' AND column = 'sort_order'",
    );
    expect(new Set(messages.map(message => message.row))).toEqual(
      new Set(pageIds),
    );
  });

  it('keeps the order when a dashboard is moved before itself', async () => {
    const secondId = await createPage('Second');
    await createPage('Third');

    await runMutator(() =>
      dashboardApp.handlers['dashboard-move']({
        id: secondId,
        targetId: secondId,
      }),
    );

    expect(await getPageNames()).toEqual(['Main', 'Second', 'Third']);
  });

  it('rejects a dashboard that does not exist', async () => {
    await expect(
      runMutator(() =>
        dashboardApp.handlers['dashboard-move']({
          id: 'missing',
          targetId: null,
        }),
      ),
    ).rejects.toThrow('Dashboard page not found: missing');
  });

  it('rejects a target dashboard that does not exist', async () => {
    const secondId = await createPage('Second');
    await createPage('Third');

    await expect(
      runMutator(() =>
        dashboardApp.handlers['dashboard-move']({
          id: secondId,
          targetId: 'missing',
        }),
      ),
    ).rejects.toThrow('Dashboard page not found: missing');
    expect(await getPageNames()).toEqual(['Main', 'Second', 'Third']);
  });
});

describe('dashboard queries', () => {
  beforeEach(async () => {
    await global.emptyDatabase()();
    await loadMappings();
  });

  it('retrieves dashboard pages and widgets', async () => {
    const initialPages = await dashboardApp.handlers['dashboard-get-pages']();
    expect(initialPages.length).toBeGreaterThan(0);

    await db.insertWithSchema('dashboard_pages', {
      id: 'page-1',
      name: 'Custom Page',
    });

    const pages = await dashboardApp.handlers['dashboard-get-pages']();
    expect(pages).toHaveLength(initialPages.length + 1);
    expect(pages.find(p => p.id === 'page-1')?.name).toBe('Custom Page');

    await runMutator(() =>
      dashboardApp.handlers['dashboard-add-widget']({
        type: 'net-worth-card',
        width: 6,
        height: 3,
        x: 0,
        y: 0,
        meta: null,
        dashboard_page_id: 'page-1',
      }),
    );

    const widgets = await dashboardApp.handlers['dashboard-get-widgets']({
      pageId: 'page-1',
    });
    expect(widgets).toHaveLength(1);
    expect(widgets[0].type).toBe('net-worth-card');
  });
});
