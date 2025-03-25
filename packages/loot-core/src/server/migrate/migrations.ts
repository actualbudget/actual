// @ts-strict-ignore
// We have to bundle in JS migrations manually to avoid having to `eval`
// them which doesn't play well with CSP. There isn't great, and eventually
// we can remove this migration.
import { PGlite } from '@electric-sql/pglite';
import { Database } from '@jlongster/sql.js';

import m1632571489012 from '../../../migrations/1632571489012_remove_cache';
import m1632571489012PGlite from '../../../migrations/1632571489012_remove_cache.pglite';
import m1722717601000 from '../../../migrations/1722717601000_reports_move_selected_categories';
import m1722717601000PGlite from '../../../migrations/1722717601000_reports_move_selected_categories.pglite';
import m1722804019000 from '../../../migrations/1722804019000_create_dashboard_table';
import m1722804019000PGlite from '../../../migrations/1722804019000_create_dashboard_table.pglite';
import m1723665565000 from '../../../migrations/1723665565000_prefs';
import m1723665565000PGlite from '../../../migrations/1723665565000_prefs.pglite';
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

const javascriptMigrationsPGlite = {
  1632571489012: m1632571489012PGlite,
  1722717601000: m1722717601000PGlite,
  1722804019000: m1722804019000PGlite,
  1723665565000: m1723665565000PGlite,
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

async function patchBadMigrationsPGlite(db: PGlite) {
  const badFiltersMigration = 1685375406832;
  const newFiltersMigration = 1688749527273;
  const pgAppliedIds = await getAppliedMigrationsPGlite(db);
  if (pgAppliedIds.includes(badFiltersMigration)) {
    await pglite.runQuery(db, 'DELETE FROM __migrations__ WHERE id = $1', [
      badFiltersMigration,
    ]);
    await pglite.runQuery(db, 'INSERT INTO __migrations__ (id) VALUES ($1)', [
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

export async function getAppliedMigrationsPGlite(
  db: PGlite,
): Promise<number[]> {
  const rows = await pglite.runQuery<{ id: number }>(
    db,
    'SELECT id FROM __migrations__ ORDER BY id ASC',
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
    .filter(name => !name.includes('pglite'))
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

export async function getMigrationListPGlite(
  migrationsDir: string,
): Promise<string[]> {
  const files = await fs.listDir(migrationsDir);
  return files
    .filter(name => name.match(/(\.sql|\.js)$/))
    .filter(name => name.includes('pglite'))
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

async function applyJavaScriptPGlite(db: PGlite, id) {
  const dbInterface = {
    runQuery: (query, params, fetchAll) =>
      pglite.runQuery(db, query, params, fetchAll),
    execQuery: query => pglite.execQuery(db, query),
    transaction: func => pglite.transaction(db, func),
  };

  if (javascriptMigrationsPGlite[id] == null) {
    throw new Error('Could not find JS migration code to run for ' + id);
  }

  const run = javascriptMigrationsPGlite[id];
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

async function applySqlPGlite(db: PGlite, sql: string) {
  try {
    await pglite.execQuery(db, sql);
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

export async function applyMigrationPGlite(
  db: PGlite,
  name: string,
  migrationsDir: string,
): Promise<void> {
  const code = await fs.readFile(fs.join(migrationsDir, name));
  if (name.match(/\.js$/)) {
    await applyJavaScriptPGlite(db, getMigrationId(name));
  } else {
    await applySqlPGlite(db, code);
  }
  await pglite.runQuery(db, 'INSERT INTO __migrations__ (id) VALUES ($1)', [
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

export async function migratePGlite(db: PGlite): Promise<string[]> {
  await patchBadMigrationsPGlite(db);
  const appliedIds = await getAppliedMigrationsPGlite(db);
  const available = await getMigrationListPGlite(MIGRATIONS_DIR);

  checkDatabaseValidity(appliedIds, available);

  const pending = getPending(appliedIds, available);

  for (const migration of pending) {
    await applyMigrationPGlite(db, migration, MIGRATIONS_DIR);
  }

  return pending;
}
