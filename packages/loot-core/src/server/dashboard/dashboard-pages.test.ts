import { beforeEach, describe, expect, it } from 'vitest';

import { aqlQuery } from '#server/aql';
import { loadMappings } from '#server/db/mappings';
import { SORT_INCREMENT } from '#server/db/sort';
import { runMutator } from '#server/mutators';
import { q } from '#shared/query';
import type { DashboardPageEntity } from '#types/models';

import { app as dashboardApp } from './app';

async function getPages() {
  const { data } = await aqlQuery(q('dashboard_pages').select('*'));
  return data as DashboardPageEntity[];
}

function createPage(name: string) {
  return runMutator(() => dashboardApp.handlers['dashboard-create']({ name }));
}

describe('dashboard page ordering', () => {
  beforeEach(async () => {
    await global.emptyDatabase()();
    await loadMappings();
  });

  it('gives the seeded page a sort order', async () => {
    const pages = await getPages();

    // `multiple_dashboards` seeds exactly one page, and it is the first row
    // in the table on every device — which is what lets it be the page that
    // adopts widgets synced from a device whose seeded page has another id
    expect(pages).toHaveLength(1);
    expect(pages[0].sort_order).toBe(SORT_INCREMENT);
  });

  it('appends newly created pages after the existing ones', async () => {
    const [seeded] = await getPages();

    await createPage('Second');
    await createPage('Third');

    expect((await getPages()).map(({ sort_order }) => sort_order)).toEqual([
      seeded.sort_order,
      seeded.sort_order + SORT_INCREMENT,
      seeded.sort_order + SORT_INCREMENT * 2,
    ]);
  });

  it('returns pages in sort order, seeded page first', async () => {
    await createPage('Second');
    await createPage('Third');

    expect((await getPages()).map(({ name }) => name)).toEqual([
      'Main',
      'Second',
      'Third',
    ]);
  });

  it('keeps the remaining pages ordered after a delete', async () => {
    const secondId = await createPage('Second');
    await createPage('Third');

    await runMutator(() =>
      dashboardApp.handlers['dashboard-delete'](secondId as string),
    );

    expect((await getPages()).map(({ name }) => name)).toEqual([
      'Main',
      'Third',
    ]);
  });
});

describe('dashboard page widgets', () => {
  beforeEach(async () => {
    await global.emptyDatabase()();
    await loadMappings();
  });

  it('keeps a widget pointed at the page it was added to', async () => {
    const [seeded] = await getPages();
    const secondId = (await createPage('Second')) as string;

    await runMutator(() =>
      dashboardApp.handlers['dashboard-add-widget']({
        type: 'markdown-card',
        width: 4,
        height: 2,
        meta: { content: 'hi' },
        dashboard_page_id: secondId,
      }),
    );

    const { data } = await aqlQuery(
      q('dashboard')
        .filter({ type: 'markdown-card', dashboard_page_id: secondId })
        .select('*'),
    );
    expect(data).toHaveLength(1);
    expect(seeded.id).not.toBe(secondId);
  });
});
