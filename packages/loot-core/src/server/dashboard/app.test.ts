import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { beforeEach, describe, expect, it } from 'vitest';

import { aqlQuery } from '#server/aql';
import * as db from '#server/db';
import { loadMappings } from '#server/db/mappings';
import { runMutator } from '#server/mutators';
import { setSyncingMode } from '#server/sync';
import { q } from '#shared/query';
import type { DashboardWidgetEntity } from '#types/models';

import { app, isWidgetType } from './app';

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
  'fx-impact-card',
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
      app.handlers['dashboard-update']([
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
      app.handlers['dashboard-update']([
        { id: 'widget-1', meta: { content: '## Notes' } },
      ]),
    );

    expect((await getTestWidgets(['widget-1']))[0].meta).toEqual({
      content: '## Notes',
    });
  });
});

describe('FX impact widget import and export', () => {
  const fxWidget = {
    type: 'fx-impact-card' as const,
    x: 0,
    y: 0,
    width: 4,
    height: 2,
    meta: {
      name: 'Yen exposure',
      timeFrame: { start: '2025-01', end: '2025-12', mode: 'static' as const },
      accounts: ['b-acct', 'a-acct'],
      currencies: ['JPY'],
    },
  };

  function importFile(json: string, dashboardPageId: string) {
    const filePath = join(mkdtempSync(join(tmpdir(), 'fx-dash-')), 'd.json');
    writeFileSync(filePath, json);
    return app.handlers['dashboard-import']({ filePath, dashboardPageId });
  }

  /**
   * The file the dashboard export writes: Overview's onExport serializes the
   * page's `dashboard` rows without id and tombstone.
   */
  async function exportFile(dashboardPageId: string) {
    const { data } = await aqlQuery(
      q('dashboard').filter({ dashboard_page_id: dashboardPageId }).select('*'),
    );
    const widgets: DashboardWidgetEntity[] = data;
    return JSON.stringify(
      {
        version: 1,
        widgets: widgets.map(widget => ({
          ...widget,
          id: undefined,
          tombstone: undefined,
        })),
      },
      null,
      2,
    );
  }

  beforeEach(async () => {
    await global.emptyDatabase()();
    await loadMappings();
  });

  it('round-trips the saved configuration through the import handler', async () => {
    const first = await app.handlers['dashboard-create']({ name: 'One' });
    const second = await app.handlers['dashboard-create']({ name: 'Two' });
    expect(
      await importFile(
        JSON.stringify({ version: 1, widgets: [fxWidget] }),
        first,
      ),
    ).toEqual({ status: 'ok' });
    const once = await exportFile(first);
    expect(JSON.parse(once)).toEqual({
      version: 1,
      widgets: [{ ...fxWidget, dashboard_page_id: first }],
    });
    await importFile(once, second);
    expect(JSON.parse(await exportFile(second))).toEqual({
      version: 1,
      widgets: [{ ...fxWidget, dashboard_page_id: second }],
    });
  });

  it('imports a widget with no saved configuration', async () => {
    const page = await app.handlers['dashboard-create']({ name: 'One' });
    await importFile(
      JSON.stringify({ version: 1, widgets: [{ ...fxWidget, meta: null }] }),
      page,
    );
    expect(JSON.parse(await exportFile(page)).widgets).toEqual([
      { ...fxWidget, meta: null, dashboard_page_id: page },
    ]);
  });

  it('imports every time-frame mode and a range beyond the request cap', async () => {
    const page = await app.handlers['dashboard-create']({ name: 'One' });
    const modes = [
      'sliding-window',
      'static',
      'full',
      'lastMonth',
      'lastYear',
      'yearToDate',
      'priorYearToDate',
      'currentQuarter',
      'previousQuarter',
    ] as const;
    const widgets = [
      ...modes.map((mode, y) => ({
        ...fxWidget,
        y,
        meta: { timeFrame: { start: '2000-01', end: '2025-12', mode } },
      })),
      { ...fxWidget, y: 9, meta: {} },
    ];
    expect(
      await importFile(JSON.stringify({ version: 1, widgets }), page),
    ).toEqual({ status: 'ok' });
    expect(JSON.parse(await exportFile(page)).widgets).toEqual(
      widgets.map(widget => ({ ...widget, dashboard_page_id: page })),
    );
  });

  it('round-trips the month and day bounds the report header saves', async () => {
    // Prior year to date, switched from Live to Static, keeps its month start
    // and day end: on 2026-10-17, and on the web tests' 2017-01-01
    // (FxImpact.test.tsx). Day-shaped live ranges keep both days.
    const saved = [
      { start: '2025-01', end: '2025-10-17', mode: 'static' },
      { start: '2016-01', end: '2016-01-01', mode: 'static' },
      { start: '2026-10-11', end: '2026-10-17', mode: 'sliding-window' },
    ] as const;
    const widgets = saved.map((timeFrame, y) => ({
      ...fxWidget,
      y,
      meta: { ...fxWidget.meta, timeFrame },
    }));
    const first = await app.handlers['dashboard-create']({ name: 'One' });
    const second = await app.handlers['dashboard-create']({ name: 'Two' });
    expect(
      await importFile(JSON.stringify({ version: 1, widgets }), first),
    ).toEqual({ status: 'ok' });
    const once = await exportFile(first);
    expect(JSON.parse(once).widgets).toEqual(
      widgets.map(widget => ({ ...widget, dashboard_page_id: first })),
    );
    expect(await importFile(once, second)).toEqual({ status: 'ok' });
    expect(JSON.parse(await exportFile(second)).widgets).toEqual(
      widgets.map(widget => ({ ...widget, dashboard_page_id: second })),
    );
  });

  it.each([
    ['a non-object meta', 7],
    ['an array meta', []],
    ['a non-string name', { name: 3 }],
    ['non-array currencies', { currencies: 7 }],
    ['non-string accounts', { accounts: ['a', 2] }],
    ['a non-object time frame', { timeFrame: '2025-01' }],
    [
      'an unknown time-frame mode',
      { timeFrame: { ...fxWidget.meta.timeFrame, mode: 'week' } },
    ],
    [
      'a malformed time-frame month',
      { timeFrame: { ...fxWidget.meta.timeFrame, start: 2025 } },
    ],
    ...[
      '2025-13',
      '2025-00',
      '2025-02-30',
      '2025-10-1',
      '2025-1-01',
      '20251017',
      '2025-10-17T00:00:00Z',
    ].map((end): [string, object] => [
      `an impossible or non-canonical end ${end}`,
      { timeFrame: { ...fxWidget.meta.timeFrame, end } },
    ]),
  ])('rejects %s before replacing the page', async (_name, meta) => {
    const page = await app.handlers['dashboard-create']({ name: 'One' });
    await importFile(JSON.stringify({ version: 1, widgets: [fxWidget] }), page);
    const before = await exportFile(page);
    await expect(
      importFile(
        JSON.stringify({ version: 1, widgets: [{ ...fxWidget, meta }] }),
        page,
      ),
    ).rejects.toThrow('Invalid widget.0.meta');
    expect(await exportFile(page)).toEqual(before);
  });

  it('still rejects an unknown widget type', async () => {
    const page = await app.handlers['dashboard-create']({ name: 'One' });
    await expect(
      importFile(
        JSON.stringify({
          version: 1,
          widgets: [{ ...fxWidget, type: 'fx-impact' }],
        }),
        page,
      ),
    ).rejects.toThrow('Invalid widget.0.type value fx-impact.');
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
    return await runMutator(() => app.handlers['dashboard-create']({ name }));
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
      app.handlers['dashboard-move']({
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
      app.handlers['dashboard-move']({
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
      app.handlers['dashboard-move']({ id: 'b', targetId: 'a' }),
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
      app.handlers['dashboard-move']({ id: 'a', targetId: 'z' }),
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
        app.handlers['dashboard-move']({
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
      app.handlers['dashboard-move']({
        id: secondId,
        targetId: secondId,
      }),
    );

    expect(await getPageNames()).toEqual(['Main', 'Second', 'Third']);
  });

  it('rejects a dashboard that does not exist', async () => {
    await expect(
      runMutator(() =>
        app.handlers['dashboard-move']({
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
        app.handlers['dashboard-move']({
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
    const initialPages = await app.handlers['dashboard-get-pages']();
    expect(initialPages.length).toBeGreaterThan(0);

    await db.insertWithSchema('dashboard_pages', {
      id: 'page-1',
      name: 'Custom Page',
    });

    const pages = await app.handlers['dashboard-get-pages']();
    expect(pages).toHaveLength(initialPages.length + 1);
    expect(pages.find(p => p.id === 'page-1')?.name).toBe('Custom Page');

    await runMutator(() =>
      app.handlers['dashboard-add-widget']({
        type: 'net-worth-card',
        width: 6,
        height: 3,
        x: 0,
        y: 0,
        meta: null,
        dashboard_page_id: 'page-1',
      }),
    );

    const widgets = await app.handlers['dashboard-get-widgets']({
      pageId: 'page-1',
    });
    expect(widgets).toHaveLength(1);
    expect(widgets[0].type).toBe('net-worth-card');
  });
});
