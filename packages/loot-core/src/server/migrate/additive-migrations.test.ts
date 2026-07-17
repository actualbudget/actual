import * as nativeFs from 'fs';
import * as path from 'path';

import type { Database } from '@jlongster/sql.js';
import { describe, expect, it } from 'vitest';

import * as sqlite from '#platform/server/sqlite';

import { applyMigration, getMigrationId, getMigrationList } from './migrations';

// Migrations newer than this id must be additive-only. Clients tolerate
// budgets and sync messages from newer app versions (see
// `replayPendingMessages` and `checkDatabaseValidity`), which is only
// safe if newer migrations never remove or rename what older clients
// depend on. This is enforced by actually running the migration chain
// and diffing the real schema before/after each new migration, so
// nothing a migration does (comments, string literals, table rebuilds)
// can hide a destructive change. Dropping/recreating views is fine —
// they hold no data — but their columns must stay backwards-compatible
// (a code-review concern, not enforceable here).
const ADDITIVE_ONLY_CUTOFF = 1780606215001;

const MIGRATIONS_DIR = path.resolve(__dirname, '../../../migrations');
const INIT_SQL = path.resolve(__dirname, '../sql/init.sql');

// Tables that are not CRDT-synced. Sync builds rows one column at a
// time, so in a synced table every column beyond the primary key must
// be nullable or have a DEFAULT — otherwise the first per-column INSERT
// can never satisfy the constraints. Internal tables are always written
// with full rows by app code, so they may use NOT NULL freely. Add new
// internal tables here.
const NON_SYNCED_TABLES = new Set(['messages_pending']);

// table name -> columns, from PRAGMA table_info
type Schema = Map<
  string,
  Array<{
    name: string;
    notnull: number;
    dflt_value: string | null;
    pk: number;
  }>
>;

function snapshotSchema(db: Database): Schema {
  const tables = sqlite.runQuery<{ name: string }>(
    db,
    "SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%'",
    [],
    true,
  );
  return new Map(
    tables.map(({ name }) => [
      name,
      sqlite.runQuery(db, `PRAGMA table_info("${name}")`, [], true),
    ]),
  );
}

function findViolations(before: Schema, after: Schema): string[] {
  const violations: string[] = [];

  for (const [table, beforeColumns] of before) {
    const afterColumns = after.get(table);
    if (!afterColumns) {
      violations.push(`table "${table}" was removed or renamed`);
      continue;
    }
    for (const column of beforeColumns) {
      if (!afterColumns.some(c => c.name === column.name)) {
        violations.push(
          `column "${table}.${column.name}" was removed or renamed`,
        );
      }
    }
  }

  for (const [table, afterColumns] of after) {
    if (NON_SYNCED_TABLES.has(table)) {
      continue;
    }
    const beforeColumns = before.get(table);
    for (const column of afterColumns) {
      const isNew = !beforeColumns?.some(c => c.name === column.name);
      if (isNew && column.notnull && column.dflt_value == null && !column.pk) {
        violations.push(
          `new column "${table}.${column.name}" is NOT NULL without a DEFAULT`,
        );
      }
    }
  }

  return violations;
}

// Applies `migrationSql` to a scratch database prepared with `setupSql`
// and returns the additive-only violations it introduces
async function violationsFor(
  setupSql: string,
  migrationSql: string,
): Promise<string[]> {
  await sqlite.init();
  const db = await sqlite.openDatabase(':memory:');
  sqlite.execQuery(db, setupSql);
  const before = snapshotSchema(db);
  sqlite.execQuery(db, migrationSql);
  const violations = findViolations(before, snapshotSchema(db));
  sqlite.closeDatabase(db);
  return violations;
}

describe('migrations are additive-only', () => {
  it('every migration after the cutoff is additive-only', async () => {
    await sqlite.init();
    const db = await sqlite.openDatabase(':memory:');
    sqlite.execQuery(db, nativeFs.readFileSync(INIT_SQL, 'utf8'));

    const violations: string[] = [];
    for (const name of await getMigrationList(MIGRATIONS_DIR)) {
      const isChecked = getMigrationId(name) > ADDITIVE_ONLY_CUTOFF;
      const before = isChecked ? snapshotSchema(db) : null;
      await applyMigration(db, name, MIGRATIONS_DIR);
      if (before) {
        violations.push(
          ...findViolations(before, snapshotSchema(db)).map(
            violation => `${name}: ${violation}`,
          ),
        );
      }
    }
    sqlite.closeDatabase(db);

    expect(
      violations,
      `Destructive migrations found (${violations.join('; ')}). ` +
        'Migrations must be additive-only so that older clients keep ' +
        'working: no dropping or renaming tables/columns, and new ' +
        'columns in synced tables must be nullable or have a DEFAULT ' +
        '(sync builds rows one column at a time). If you need to ' +
        'retire a column, stop reading it but leave it in place. New ' +
        'internal (non-synced) tables go in NON_SYNCED_TABLES in this ' +
        'test.',
    ).toEqual([]);
  });

  const TABLE_FOO = 'CREATE TABLE foo (id TEXT PRIMARY KEY, a TEXT, b TEXT);';

  it.each([
    ['dropping a table', TABLE_FOO, 'DROP TABLE foo;'],
    ['renaming a table', TABLE_FOO, 'ALTER TABLE foo RENAME TO bar;'],
    ['renaming a column', TABLE_FOO, 'ALTER TABLE foo RENAME COLUMN a TO c;'],
    [
      'dropping a column via table rebuild',
      TABLE_FOO,
      `CREATE TABLE foo_new (id TEXT PRIMARY KEY, b TEXT);
       INSERT INTO foo_new SELECT id, b FROM foo;
       DROP TABLE foo;
       ALTER TABLE foo_new RENAME TO foo;`,
    ],
    [
      'adding a required column without a default',
      TABLE_FOO,
      'ALTER TABLE foo ADD COLUMN c TEXT NOT NULL;',
    ],
    [
      'creating a synced table with required columns lacking defaults',
      TABLE_FOO,
      `CREATE TABLE gadgets
         (id TEXT PRIMARY KEY,
          name TEXT NOT NULL,
          size INTEGER NOT NULL,
          color TEXT,
          shape TEXT DEFAULT 'round');`,
    ],
  ])('sanity check: flags %s', async (_case, setup, migration) => {
    expect((await violationsFor(setup, migration)).length).toBeGreaterThan(0);
  });

  it.each([
    [
      'adding nullable and defaulted columns',
      TABLE_FOO,
      `ALTER TABLE foo ADD COLUMN c TEXT;
       ALTER TABLE foo ADD COLUMN d TEXT NOT NULL DEFAULT 'x';`,
    ],
    [
      'creating a table with nullable and defaulted columns',
      TABLE_FOO,
      `CREATE TABLE gadgets
         (id TEXT PRIMARY KEY, name TEXT, size INTEGER NOT NULL DEFAULT 0);`,
    ],
    [
      'dropping and recreating a view',
      TABLE_FOO + 'CREATE VIEW v_foo AS SELECT id, a FROM foo;',
      `DROP VIEW v_foo;
       CREATE VIEW v_foo AS SELECT id, a, b FROM foo;`,
    ],
    [
      'creating an internal (non-synced) table with required columns',
      TABLE_FOO,
      `CREATE TABLE messages_pending
         (timestamp TEXT PRIMARY KEY, dataset TEXT NOT NULL);`,
    ],
  ])('sanity check: allows %s', async (_case, setup, migration) => {
    expect(await violationsFor(setup, migration)).toEqual([]);
  });
});
