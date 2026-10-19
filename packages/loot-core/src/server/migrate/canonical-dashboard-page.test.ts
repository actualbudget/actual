import * as nativeFs from 'fs';
import * as path from 'path';

import type { Database } from '@jlongster/sql.js';
import { beforeEach, describe, expect, it } from 'vitest';

import * as sqlite from '#platform/server/sqlite';
import { DEFAULT_DASHBOARD_PAGE_ID } from '#shared/dashboard';

import { applyMigration, getMigrationId, getMigrationList } from './migrations';

const MIGRATIONS_DIR = path.resolve(__dirname, '../../../migrations');
const INIT_SQL = path.resolve(__dirname, '../sql/init.sql');

const MIGRATION_NAME = '1792441821604_canonical_dashboard_page.js';
const MIGRATION_ID = getMigrationId(MIGRATION_NAME);

// A database migrated up to, but not including, the migration under test —
// so it looks exactly like a device that has run `multiple_dashboards` and
// has a locally generated default page id
async function openDbBeforeMigration(): Promise<Database> {
  await sqlite.init();
  const db = await sqlite.openDatabase(':memory:');
  sqlite.execQuery(db, nativeFs.readFileSync(INIT_SQL, 'utf8'));

  for (const name of await getMigrationList(MIGRATIONS_DIR)) {
    if (getMigrationId(name) >= MIGRATION_ID) {
      break;
    }
    await applyMigration(db, name, MIGRATIONS_DIR);
  }

  return db;
}

function runMigration(db: Database) {
  return applyMigration(db, MIGRATION_NAME, MIGRATIONS_DIR);
}

function pageIds(db: Database): string[] {
  return sqlite
    .runQuery<{ id: string }>(db, 'SELECT id FROM dashboard_pages', [], true)
    .map(({ id }) => id);
}

function widgetPageIds(db: Database): Array<string | null> {
  return sqlite
    .runQuery<{ dashboard_page_id: string | null }>(
      db,
      'SELECT dashboard_page_id FROM dashboard',
      [],
      true,
    )
    .map(({ dashboard_page_id }) => dashboard_page_id);
}

function addPage(db: Database, id: string, { synced }: { synced: boolean }) {
  sqlite.runQuery(db, 'INSERT INTO dashboard_pages (id, name) VALUES (?, ?)', [
    id,
    `Page ${id}`,
  ]);

  if (synced) {
    // Pages created through the app go through `insertWithSchema`, which
    // records a sync message per column
    sqlite.runQuery(
      db,
      `INSERT INTO messages_crdt (timestamp, dataset, row, column, value)
       VALUES (?, 'dashboard_pages', ?, 'name', ?)`,
      [`timestamp-${id}`, id, `Page ${id}`],
    );
  }
}

function addWidget(db: Database, id: string, dashboardPageId: string | null) {
  sqlite.runQuery(
    db,
    `INSERT INTO dashboard (id, type, width, height, x, y, dashboard_page_id)
     VALUES (?, 'markdown-card', 4, 2, 0, 0, ?)`,
    [id, dashboardPageId],
  );
}

describe('canonical dashboard page migration', () => {
  let db: Database;

  beforeEach(async () => {
    db = await openDbBeforeMigration();
  });

  it('re-points the seeded page at the shared default id', async () => {
    const [seededId] = pageIds(db);
    expect(seededId).not.toBe(DEFAULT_DASHBOARD_PAGE_ID);

    await runMigration(db);

    expect(pageIds(db)).toEqual([DEFAULT_DASHBOARD_PAGE_ID]);
    // The default widgets travel with it
    expect(new Set(widgetPageIds(db))).toEqual(
      new Set([DEFAULT_DASHBOARD_PAGE_ID]),
    );
  });

  it('adopts widgets whose page does not exist on this device', async () => {
    // What a widget synced from a device with a different seeded page id
    // looks like locally
    addWidget(db, 'synced-widget', 'page-from-the-other-device');
    addWidget(db, 'page-less-widget', null);

    await runMigration(db);

    expect(new Set(widgetPageIds(db))).toEqual(
      new Set([DEFAULT_DASHBOARD_PAGE_ID]),
    );
  });

  it('leaves pages created in the app alone', async () => {
    const [seededId] = pageIds(db);
    addPage(db, 'user-created-page', { synced: true });
    addWidget(db, 'user-widget', 'user-created-page');

    await runMigration(db);

    expect(new Set(pageIds(db))).toEqual(
      new Set([DEFAULT_DASHBOARD_PAGE_ID, 'user-created-page']),
    );
    expect(pageIds(db)).not.toContain(seededId);
    expect(
      sqlite.runQuery<{ dashboard_page_id: string }>(
        db,
        'SELECT dashboard_page_id FROM dashboard WHERE id = ?',
        ['user-widget'],
        true,
      )[0].dashboard_page_id,
    ).toBe('user-created-page');
  });

  it('keeps the ids as they are when the seeded page is ambiguous', async () => {
    // `sync-reset` clears messages_crdt, leaving no way to tell which page
    // the migration seeded
    const before = pageIds(db);
    addPage(db, 'second-page', { synced: false });
    addWidget(db, 'orphan', 'page-from-the-other-device');

    await runMigration(db);

    expect(new Set(pageIds(db))).toEqual(new Set([...before, 'second-page']));
    // Orphans are still adopted, so nothing is invisible
    expect(
      sqlite.runQuery<{ dashboard_page_id: string }>(
        db,
        'SELECT dashboard_page_id FROM dashboard WHERE id = ?',
        ['orphan'],
        true,
      )[0].dashboard_page_id,
    ).toBe(before[0]);
  });

  it('is a no-op once the default page is already canonical', async () => {
    await runMigration(db);
    const pagesAfterFirstRun = pageIds(db);
    const widgetsAfterFirstRun = widgetPageIds(db);

    // `applyMigration` records the id it just ran; drop it so the same
    // migration can run a second time
    sqlite.runQuery(db, 'DELETE FROM __migrations__ WHERE id = ?', [
      MIGRATION_ID,
    ]);
    await runMigration(db);

    expect(pageIds(db)).toEqual(pagesAfterFirstRun);
    expect(widgetPageIds(db)).toEqual(widgetsAfterFirstRun);
  });
});
