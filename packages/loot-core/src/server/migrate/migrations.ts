// @ts-strict-ignore
// We have to bundle in JS migrations manually to avoid having to `eval`
// them which doesn't play well with CSP. There isn't great, and eventually
// we can remove this migration.
import type { Database } from '@jlongster/sql.js';

import m1632571489012 from '#migrations/1632571489012_remove_cache';
import m1722717601000 from '#migrations/1722717601000_reports_move_selected_categories';
import m1722804019000 from '#migrations/1722804019000_create_dashboard_table';
import m1723665565000 from '#migrations/1723665565000_prefs';
import m1765518577215 from '#migrations/1765518577215_multiple_dashboards';
import * as fs from '#platform/server/fs';
import { logger } from '#platform/server/log';
import * as sqlite from '#platform/server/sqlite';
import * as prefs from '#server/prefs';

let MIGRATIONS_DIR = fs.migrationsPath;

const javascriptMigrations = {
  1632571489012: m1632571489012,
  1722717601000: m1722717601000,
  1722804019000: m1722804019000,
  1723665565000: m1723665565000,
  1765518577215: m1765518577215,
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

export function getMigrationId(name: string): number {
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
    sqlite.runQuery(db, 'DELETE FROM __migrations__ WHERE id = ?', [
      badFiltersMigration,
    ]);
    sqlite.runQuery(db, 'INSERT INTO __migrations__ (id) VALUES (?)', [
      newFiltersMigration,
    ]);
  }
}

export async function getAppliedMigrations(db: Database): Promise<number[]> {
  const rows = sqlite.runQuery<{ id: number }>(
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

async function applyJavaScript(db, id) {
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

async function applySql(db, sql) {
  try {
    sqlite.execQuery(db, sql);
  } catch (e) {
    logger.log('Error applying sql:', sql);
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
  sqlite.runQuery(db, 'INSERT INTO __migrations__ (id) VALUES (?)', [
    getMigrationId(name),
  ]);
}

// Migrations with ids after this point are additive-only, enforced by
// additive-migrations.test.ts. A database containing unknown applied
// ids from that era was touched by a newer release — including one
// whose migration id happens to sort below ids this version already
// knows (authored earlier, merged later) — and is still safe to open.
// Unknown ids from before this point indicate a corrupt or
// incompatible database.
export const ADDITIVE_ONLY_CUTOFF = 1780606215001;

function checkDatabaseValidity(
  appliedIds: number[],
  available: string[],
): void {
  // A migrated database with no migrations on disk means the install is
  // broken — without this guard every applied id would count as
  // "unknown but tolerable" below and the checks would pass vacuously
  if (available.length === 0 && appliedIds.length > 0) {
    logger.error('No migrations found on disk for a migrated database:', {
      appliedIds,
    });
    throw new Error('out-of-sync-migrations');
  }

  const allAvailableIds = available.map(getMigrationId);
  const availableIds = new Set(allAvailableIds);
  const unknownIds = appliedIds.filter(id => !availableIds.has(id));

  if (unknownIds.some(id => id <= ADDITIVE_ONLY_CUTOFF)) {
    logger.error(
      'Database is out of sync with migrations (unknown migration from before the additive-only era):',
      {
        appliedIds,
        available,
      },
    );
    throw new Error('out-of-sync-migrations');
  }

  const knownAppliedIds = appliedIds.filter(id => availableIds.has(id));

  // A database touched by a newer version must already contain every
  // migration this app knows (append-only migrations guarantee the newer
  // version knew them all). A known migration missing next to an
  // unknown one means the database is corrupt — running it now, after
  // later migrations already ran, would be unsafe.
  if (unknownIds.length > 0 && knownAppliedIds.length !== available.length) {
    logger.error(
      'Database is out of sync with migrations (missing known migration next to an unknown one):',
      {
        appliedIds,
        available,
      },
    );
    throw new Error('out-of-sync-migrations');
  }

  // Pre-cutoff migrations shipped strictly append-only, so the applied
  // ones must form an ordered prefix of the available list — a gap
  // there means the database is corrupt. Post-cutoff, a gap is just a
  // pending interleaved-id migration that `migrate` applies next.
  const preCutoffAvailableIds = allAvailableIds.filter(
    id => id <= ADDITIVE_ONLY_CUTOFF,
  );
  const preCutoffAppliedIds = knownAppliedIds.filter(
    id => id <= ADDITIVE_ONLY_CUTOFF,
  );

  // A post-cutoff migration only ever runs after the entire pre-cutoff
  // chain, so one applied next to a missing pre-cutoff migration means
  // the database is corrupt
  if (
    appliedIds.some(id => id > ADDITIVE_ONLY_CUTOFF) &&
    preCutoffAppliedIds.length !== preCutoffAvailableIds.length
  ) {
    logger.error(
      'Database is out of sync with migrations (missing pre-cutoff migration next to an applied post-cutoff one):',
      {
        appliedIds,
        available,
      },
    );
    throw new Error('out-of-sync-migrations');
  }
  for (let i = 0; i < preCutoffAppliedIds.length; i++) {
    if (preCutoffAppliedIds[i] !== preCutoffAvailableIds[i]) {
      logger.error(
        'Database is out of sync with migrations (migration id mismatch):',
        {
          appliedIds,
          available,
          missing: available.filter(
            m => !appliedIds.includes(getMigrationId(m)),
          ),
        },
      );
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
