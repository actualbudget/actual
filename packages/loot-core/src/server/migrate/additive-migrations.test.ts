import * as nativeFs from 'fs';
import * as path from 'path';

import type { Database } from '@jlongster/sql.js';
import { describe, expect, it } from 'vitest';

import * as sqlite from '#platform/server/sqlite';

import {
  ADDITIVE_ONLY_CUTOFF,
  applyMigration,
  getMigrationId,
  getMigrationList,
  migrate,
  withMigrationsDir,
} from './migrations';
import { findAdditiveViolations, snapshotSchema } from './schema-diff';
import type { SchemaSnapshot } from './schema-diff';

// Migrations newer than ADDITIVE_ONLY_CUTOFF must be additive-only:
// clients tolerate budgets and sync messages from newer app versions
// (see `replayPendingMessages` and `checkDatabaseValidity`), which is
// only safe if newer migrations never remove or rename what older
// clients depend on. Enforced by running the real migration chain and
// diffing the actual schema around each new migration.

const MIGRATIONS_DIR = path.resolve(__dirname, '../../../migrations');
const INIT_SQL = path.resolve(__dirname, '../sql/init.sql');

// Internal (non-CRDT-synced) tables, exempt from the synced-table rules
// at creation only (see `findAdditiveViolations`). Add new internal
// tables here.
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
  it('new migrations carry post-cutoff ids', async () => {
    // `checkDatabaseValidity` treats an unknown pre-cutoff id as
    // corruption, so merging a migration with a pre-cutoff id (e.g. a
    // long-lived PR keeping its original authoring timestamp) would
    // break every upgrade. The pre-cutoff set shipped long ago and is
    // frozen — if this count changed, renumber the new migration's id
    // to the present day.
    const ids = (await getMigrationList(MIGRATIONS_DIR)).map(getMigrationId);
    expect(ids.filter(id => id <= ADDITIVE_ONLY_CUTOFF).length).toBe(57);
  });

  it('every migration after the cutoff is additive-only', async () => {
    const db = await openTestDb(nativeFs.readFileSync(INIT_SQL, 'utf8'));

    const violations: string[] = [];
    let snapshot: SchemaSnapshot | null = null;
    for (const name of await getMigrationList(MIGRATIONS_DIR)) {
      if (getMigrationId(name) <= ADDITIVE_ONLY_CUTOFF) {
        await applyMigration(db, name, MIGRATIONS_DIR);
        snapshot = null;
        continue;
      }
      const before = snapshot ?? snapshotSchema(db);
      await applyMigration(db, name, MIGRATIONS_DIR);
      snapshot = snapshotSchema(db);
      violations.push(
        ...findAdditiveViolations(before, snapshot, NON_SYNCED_TABLES).map(
          violation => `${name}: ${violation}`,
        ),
      );
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

  it('tolerates an unknown migration id interleaved below the newest known one', async () => {
    const db = await openTestDb(nativeFs.readFileSync(INIT_SQL, 'utf8'));
    await withMigrationsDir(MIGRATIONS_DIR, async () => {
      await migrate(db);
      // A newer release may ship a migration whose id (an authoring
      // timestamp) sorts below ids this version already knows — it is
      // still additive-era and must not fail validation
      sqlite.runQuery(db, 'INSERT INTO __migrations__ (id) VALUES (?)', [
        ADDITIVE_ONLY_CUTOFF + 1,
      ]);
      await migrate(db);
    });
    sqlite.closeDatabase(db);
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
    [
      'adding a UNIQUE index to a synced table',
      TABLE_FOO,
      'CREATE UNIQUE INDEX foo_a ON foo (a);',
    ],
    [
      'adding a UNIQUE constraint via table rebuild',
      TABLE_FOO,
      `CREATE TABLE foo_new (id TEXT PRIMARY KEY, a TEXT UNIQUE, b TEXT);
       DROP TABLE foo;
       ALTER TABLE foo_new RENAME TO foo;`,
    ],
    [
      'adding a required column to an existing internal table',
      TABLE_FOO +
        'CREATE TABLE messages_pending (timestamp TEXT PRIMARY KEY, dataset TEXT NOT NULL);',
      'ALTER TABLE messages_pending ADD COLUMN extra TEXT NOT NULL;',
    ],
    [
      'removing a UNIQUE constraint',
      TABLE_FOO + 'CREATE UNIQUE INDEX foo_a ON foo (a);',
      'DROP INDEX foo_a;',
    ],
    [
      'adding a CHECK constraint',
      TABLE_FOO,
      'ALTER TABLE foo ADD COLUMN amount INTEGER CHECK(amount >= 0);',
    ],
    [
      'making a column NOT NULL with a DEFAULT via table rebuild',
      TABLE_FOO,
      `CREATE TABLE foo_new
         (id TEXT PRIMARY KEY, a TEXT NOT NULL DEFAULT 'x', b TEXT);
       DROP TABLE foo;
       ALTER TABLE foo_new RENAME TO foo;`,
    ],
    [
      'making a NOT NULL column nullable via table rebuild',
      "CREATE TABLE foo (id TEXT PRIMARY KEY, a TEXT NOT NULL DEFAULT 'x');",
      `CREATE TABLE foo_new (id TEXT PRIMARY KEY, a TEXT);
       DROP TABLE foo;
       ALTER TABLE foo_new RENAME TO foo;`,
    ],
    [
      'removing a DEFAULT from a NOT NULL column via table rebuild',
      "CREATE TABLE foo (id TEXT PRIMARY KEY, a TEXT NOT NULL DEFAULT 'x');",
      `CREATE TABLE foo_new (id TEXT PRIMARY KEY, a TEXT NOT NULL);
       DROP TABLE foo;
       ALTER TABLE foo_new RENAME TO foo;`,
    ],
    [
      'changing a CHECK expression via table rebuild',
      'CREATE TABLE foo (id TEXT PRIMARY KEY, amount INTEGER CHECK(amount >= 0));',
      `CREATE TABLE foo_new (id TEXT PRIMARY KEY, amount INTEGER CHECK(amount > 0));
       DROP TABLE foo;
       ALTER TABLE foo_new RENAME TO foo;`,
    ],
    [
      'changing a CHECK expression after a quoted paren',
      `CREATE TABLE foo
         (id TEXT PRIMARY KEY, a TEXT CHECK(a <> ')' AND a <> 'x'));`,
      `CREATE TABLE foo_new
         (id TEXT PRIMARY KEY, a TEXT CHECK(a <> ')' AND a <> 'y'));
       DROP TABLE foo;
       ALTER TABLE foo_new RENAME TO foo;`,
    ],
    [
      'adding a NOT NULL column whose DEFAULT is an explicit NULL',
      TABLE_FOO,
      `CREATE TABLE foo_new
         (id TEXT PRIMARY KEY, a TEXT, b TEXT, c TEXT NOT NULL DEFAULT NULL);
       DROP TABLE foo;
       ALTER TABLE foo_new RENAME TO foo;`,
    ],
    [
      "changing an existing column's type via table rebuild",
      TABLE_FOO,
      `CREATE TABLE foo_new (id TEXT PRIMARY KEY, a INTEGER, b TEXT);
       DROP TABLE foo;
       ALTER TABLE foo_new RENAME TO foo;`,
    ],
    [
      "changing an existing column's DEFAULT value via table rebuild",
      "CREATE TABLE foo (id TEXT PRIMARY KEY, a TEXT DEFAULT 'x');",
      `CREATE TABLE foo_new (id TEXT PRIMARY KEY, a TEXT DEFAULT 'y');
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
    [
      'adding a plain (non-unique) index',
      TABLE_FOO,
      'CREATE INDEX foo_a_idx ON foo (a);',
    ],
    [
      'creating a synced table with a UNIQUE constraint',
      TABLE_FOO,
      'CREATE TABLE gadgets (id TEXT PRIMARY KEY, name TEXT UNIQUE);',
    ],
    [
      'creating a synced table with a CHECK constraint',
      TABLE_FOO,
      'CREATE TABLE gadgets (id TEXT PRIMARY KEY, amount INTEGER CHECK(amount >= 0));',
    ],
    [
      'rebuilding a table with an identical CHECK, reformatted',
      'CREATE TABLE foo (id TEXT PRIMARY KEY, amount INTEGER CHECK(amount >= 0));',
      `CREATE TABLE foo_new
         (id TEXT PRIMARY KEY, amount INTEGER CHECK( amount   >= 0 ));
       DROP TABLE foo;
       ALTER TABLE foo_new RENAME TO foo;`,
    ],
    [
      'rebuilding a table with an identical CHECK containing a quoted paren',
      `CREATE TABLE foo
         (id TEXT PRIMARY KEY, a TEXT CHECK(a <> ')' AND a <> 'x'));`,
      `CREATE TABLE foo_new
         (id TEXT PRIMARY KEY, a TEXT CHECK(a <> ')' AND a <> 'x'));
       DROP TABLE foo;
       ALTER TABLE foo_new RENAME TO foo;`,
    ],
    [
      'adding a column whose quoted DEFAULT contains CHECK(...)',
      TABLE_FOO,
      "ALTER TABLE foo ADD COLUMN c TEXT DEFAULT 'CHECK(c > 0)';",
    ],
    [
      'rebuilding a table replacing an explicit DEFAULT NULL with no DEFAULT',
      'CREATE TABLE foo (id TEXT PRIMARY KEY, a TEXT DEFAULT NULL);',
      `CREATE TABLE foo_new (id TEXT PRIMARY KEY, a TEXT);
       DROP TABLE foo;
       ALTER TABLE foo_new RENAME TO foo;`,
    ],
  ])('sanity check: allows %s', async (_case, setup, migration) => {
    expect(await violationsFor(setup, migration)).toEqual([]);
  });
});
