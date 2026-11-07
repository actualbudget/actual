import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { beforeEach, describe, expect, it } from 'vitest';

import { aqlQuery } from '#server/aql';
import * as db from '#server/db';
import { loadMappings } from '#server/db/mappings';
import { runMutator } from '#server/mutators';
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
