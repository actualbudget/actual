import * as nativeFs from 'fs';
import * as path from 'path';

import type { Database } from '@jlongster/sql.js';
import { describe, expect, it } from 'vitest';

import * as sqlite from '#platform/server/sqlite';

import { applyMigration, getMigrationId, getMigrationList } from './migrations';
import { findAdditiveViolations, snapshotSchema } from './schema-diff';

// Migrations newer than this id must be additive-only. Clients tolerate
// budgets and sync messages from newer app versions (see
// `replayPendingMessages` and `checkDatabaseValidity`), which is only
// safe if newer migrations never remove or rename what older clients
// depend on. This is enforced by actually running the migration chain
// and diffing the real schema around each new migration (see
// ./schema-diff.ts), so nothing a migration does — comments, string
// literals, table rebuilds — can hide a destructive change.
// Dropping/recreating views is fine: they hold no data, but their
// columns must stay backwards-compatible (a code-review concern, not
// enforceable here).
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

async function openTestDb(setupSql: string): Promise<Database> {
  await sqlite.init();
  const db = await sqlite.openDatabase(':memory:');
  sqlite.execQuery(db, setupSql);
  return db;
}

// The additive-only violations that `migrationSql` introduces on a
// database prepared with `setupSql`
async function violationsFor(
  setupSql: string,
  migrationSql: string,
): Promise<string[]> {
  const db = await openTestDb(setupSql);
  const before = snapshotSchema(db);
  sqlite.execQuery(db, migrationSql);
  const violations = findAdditiveViolations(
    before,
    snapshotSchema(db),
    NON_SYNCED_TABLES,
  );
  sqlite.closeDatabase(db);
  return violations;
}

describe('migrations are additive-only', () => {
  it('every migration after the cutoff is additive-only', async () => {
    const db = await openTestDb(nativeFs.readFileSync(INIT_SQL, 'utf8'));

    const violations: string[] = [];
    for (const name of await getMigrationList(MIGRATIONS_DIR)) {
      const before = snapshotSchema(db);
      await applyMigration(db, name, MIGRATIONS_DIR);
      if (getMigrationId(name) > ADDITIVE_ONLY_CUTOFF) {
        violations.push(
          ...findAdditiveViolations(
            before,
            snapshotSchema(db),
            NON_SYNCED_TABLES,
          ).map(violation => `${name}: ${violation}`),
        );
      }
    }
    sqlite.closeDatabase(db);

    expect(
      violations,
      'Migrations must be additive-only so that older clients keep ' +
        'working: no dropping or renaming tables/columns, new columns ' +
        'in synced tables must be nullable or have a DEFAULT, and new ' +
        'synced tables need a single primary key named "id" (sync ' +
        'builds rows one column at a time, addressed by id). If you ' +
        'need to retire a column, stop reading it but leave it in ' +
        'place. New internal (non-synced) tables go in ' +
        'NON_SYNCED_TABLES in this test.',
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
    [
      'creating a synced table whose primary key is not "id"',
      TABLE_FOO,
      'CREATE TABLE gadgets (uuid TEXT PRIMARY KEY, name TEXT);',
    ],
    [
      'creating a synced table with a composite primary key',
      TABLE_FOO,
      'CREATE TABLE gadgets (id TEXT, name TEXT, PRIMARY KEY (id, name));',
    ],
    [
      'creating a synced table with no primary key',
      TABLE_FOO,
      'CREATE TABLE gadgets (name TEXT);',
    ],
    [
      'making an existing column required via table rebuild',
      TABLE_FOO,
      `CREATE TABLE foo_new (id TEXT PRIMARY KEY, a TEXT NOT NULL, b TEXT);
       DROP TABLE foo;
       ALTER TABLE foo_new RENAME TO foo;`,
    ],
    [
      'changing primary-key membership via table rebuild',
      TABLE_FOO,
      `CREATE TABLE foo_new (id TEXT, a TEXT, b TEXT, PRIMARY KEY (id, a));
       DROP TABLE foo;
       ALTER TABLE foo_new RENAME TO foo;`,
    ],
  ])('sanity check: flags %s', async (_case, setup, migration) => {
    expect(await violationsFor(setup, migration)).not.toEqual([]);
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
