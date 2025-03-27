// @ts-strict-ignore
// We have to bundle in JS migrations manually to avoid having to `eval`
// them which doesn't play well with CSP. There isn't great, and eventually
// we can remove this migration.
import { Database } from '@jlongster/sql.js';
import { sql } from 'drizzle-orm';

import drizzleMigrations from '../../../drizzle/migrations.json';
import m1632571489012 from '../../../migrations/1632571489012_remove_cache';
import m1722717601000 from '../../../migrations/1722717601000_reports_move_selected_categories';
import m1722804019000 from '../../../migrations/1722804019000_create_dashboard_table';
import m1723665565000 from '../../../migrations/1723665565000_prefs';
import * as fs from '../../platform/server/fs';
import * as pglite from '../../platform/server/pglite';
import * as sqlite from '../../platform/server/sqlite';
import * as prefs from '../prefs';

let MIGRATIONS_DIR = fs.migrationsPath;

const javascriptMigrations = {
  1632571489012: m1632571489012,
  1722717601000: m1722717601000,
  1722804019000: m1722804019000,
  1723665565000: m1723665565000,
};

export async function withMigrationsDir(
  dir: string,
  func: () => Promise<void>,
): Promise<void> {
  const oldDir = MIGRATIONS_DIR;
  MIGRATIONS_DIR = dir;
  await func();
  MIGRATIONS_DIR = oldDir;
}

export function getMigrationsDir(): string {
  return MIGRATIONS_DIR;
}

function getMigrationId(name: string): number {
  return parseInt(name.match(/^(\d)+/)[0]);
}

export function getUpMigration(id, names) {
  for (const m of names) {
    if (getMigrationId(m) === id) {
      return m;
    }
  }
}

async function patchBadMigrations(db: Database) {
  const badFiltersMigration = 1685375406832;
  const newFiltersMigration = 1688749527273;
  const appliedIds = await getAppliedMigrations(db);
  if (appliedIds.includes(badFiltersMigration)) {
    await sqlite.runQuery(db, 'DELETE FROM __migrations__ WHERE id = ?', [
      badFiltersMigration,
    ]);
    await sqlite.runQuery(db, 'INSERT INTO __migrations__ (id) VALUES (?)', [
      newFiltersMigration,
    ]);
  }
}

export async function getAppliedMigrations(db: Database): Promise<number[]> {
  const rows = await sqlite.runQuery<{ id: number }>(
    db,
    'SELECT * FROM __migrations__ ORDER BY id ASC',
    [],
    true,
  );
  return rows.map(row => row.id);
}

export async function getMigrationList(
  migrationsDir: string,
): Promise<string[]> {
  const files = await fs.listDir(migrationsDir);
  return files
    .filter(name => name.match(/(\.sql|\.js)$/))
    .sort((m1, m2) => {
      const id1 = getMigrationId(m1);
      const id2 = getMigrationId(m2);
      if (id1 < id2) {
        return -1;
      } else if (id1 > id2) {
        return 1;
      }
      return 0;
    });
}

export function getPending(appliedIds: number[], all: string[]): string[] {
  return all.filter(name => {
    const id = getMigrationId(name);
    return appliedIds.indexOf(id) === -1;
  });
}

async function applyJavaScript(db: Database, id) {
  const dbInterface = {
    runQuery: (query, params, fetchAll) =>
      sqlite.runQuery(db, query, params, fetchAll),
    execQuery: query => sqlite.execQuery(db, query),
    transaction: func => sqlite.transaction(db, func),
  };

  if (javascriptMigrations[id] == null) {
    throw new Error('Could not find JS migration code to run for ' + id);
  }

  const run = javascriptMigrations[id];
  return run(dbInterface, {
    fs,
    fileId: prefs.getPrefs()?.id,
  });
}

async function applySql(db: Database, sql: string) {
  try {
    await sqlite.execQuery(db, sql);
  } catch (e) {
    console.log('Error applying sql:', sql);
    throw e;
  }
}

export async function applyMigration(
  db: Database,
  name: string,
  migrationsDir: string,
): Promise<void> {
  const code = await fs.readFile(fs.join(migrationsDir, name));
  if (name.match(/\.js$/)) {
    await applyJavaScript(db, getMigrationId(name));
  } else {
    await applySql(db, code);
  }
  await sqlite.runQuery(db, 'INSERT INTO __migrations__ (id) VALUES (?)', [
    getMigrationId(name),
  ]);
}

function checkDatabaseValidity(
  appliedIds: number[],
  available: string[],
): void {
  for (let i = 0; i < appliedIds.length; i++) {
    if (
      i >= available.length ||
      appliedIds[i] !== getMigrationId(available[i])
    ) {
      console.error('Database is out of sync with migrations:', {
        appliedIds,
        available,
      });
      throw new Error('out-of-sync-migrations');
    }
  }
}

export async function migrate(db: Database): Promise<string[]> {
  await patchBadMigrations(db);
  const appliedIds = await getAppliedMigrations(db);
  const available = await getMigrationList(MIGRATIONS_DIR);

  checkDatabaseValidity(appliedIds, available);

  const pending = getPending(appliedIds, available);

  for (const migration of pending) {
    await applyMigration(db, migration, MIGRATIONS_DIR);
  }

  return pending;
}

async function ensureMigrationsTable(db: pglite.PgliteDatabase) {
  await db.execute(`
    CREATE TABLE IF NOT EXISTS drizzle_migrations (
      hash TEXT PRIMARY KEY,
      created_at TIMESTAMP NOT NULL DEFAULT NOW()
    )
  `);
}

async function getMigratedHashes(db: pglite.PgliteDatabase): Promise<string[]> {
  const result = await db.execute(`
    SELECT hash FROM drizzle_migrations ORDER BY created_at ASC
  `);
  return result.rows.map(row => row.hash as string);
}

async function recordMigration(db: pglite.PgliteDatabase, hash: string) {
  await db.execute(
    sql`
      INSERT INTO drizzle_migrations (hash, created_at)
      VALUES (${hash}, NOW())
      ON CONFLICT DO NOTHING
    `,
  );
}

export async function migratePGlite(db: pglite.PgliteDatabase) {
  console.log('🚀 Starting pglite migration...');

  // Ensure migrations table exists
  await ensureMigrationsTable(db);

  // Get already executed migrations
  const executedHashes = await getMigratedHashes(db);

  // Filter and execute pending migrations
  const pendingMigrations = drizzleMigrations.filter(
    migration => !executedHashes.includes(migration.hash),
  );

  if (pendingMigrations.length === 0) {
    console.log('✨ No pending migrations found.');
    return;
  }

  console.log(`📦 Found ${pendingMigrations.length} pending migrations`);

  // Execute migrations in sequence
  for (const migration of pendingMigrations) {
    console.log(`⚡ Executing migration: ${migration.hash}`);
    try {
      // Execute each SQL statement in sequence
      for (const sql of migration.sql) {
        await db.execute(sql);
      }

      // Record successful migration
      await recordMigration(db, migration.hash);
      console.log(`✅ Successfully completed migration: ${migration.hash}`);
    } catch (error) {
      console.error(`❌ Failed to execute migration ${migration.hash}:`, error);
      throw error;
    }
  }

  console.log('🎉 All migrations completed successfully');
}
