// We have to bundle in JS migrations manually to avoid having to `eval`
// them which doesn't play well with CSP. There isn't great, and eventually
// we can remove this migration.
import m1632571489012 from '../../../migrations/1632571489012_remove_cache.js';
import fs from '../../platform/server/fs';
import * as sqlite from '../../platform/server/sqlite';

const uuid = require('../../platform/uuid');

let MIGRATIONS_DIR = fs.migrationsPath;

let javascriptMigrations = {
  1632571489012: m1632571489012
};

export async function withMigrationsDir(dir, func) {
  let oldDir = MIGRATIONS_DIR;
  MIGRATIONS_DIR = dir;
  await func();
  MIGRATIONS_DIR = oldDir;
}

export function getMigrationsDir() {
  return MIGRATIONS_DIR;
}

function getMigrationId(name) {
  return parseInt(name.match(/^(\d)+/)[0]);
}

export function getUpMigration(id, names) {
  for (let m of names) {
    if (getMigrationId(m) === id) {
      return m;
    }
  }
}

export async function getAppliedMigrations(db) {
  const rows = await sqlite.runQuery(
    db,
    'SELECT * FROM __migrations__ ORDER BY id ASC',
    [],
    true
  );
  return rows.map(row => row.id);
}

export async function getMigrationList(migrationsDir) {
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

export function getPending(appliedIds, all) {
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
    transaction: func => sqlite.transaction(db, func)
  };

  if (javascriptMigrations[id] == null) {
    throw new Error('Could not find JS migration code to run for ' + id);
  }

  let run = javascriptMigrations[id];
  return run(dbInterface, () => uuid.v4Sync());
}

async function applySql(db, sql) {
  try {
    await sqlite.execQuery(db, sql);
  } catch (e) {
    console.log('Error applying sql:', sql);
    throw e;
  }
}

export async function applyMigration(db, name, migrationsDir) {
  const code = await fs.readFile(fs.join(migrationsDir, name));
  if (name.match(/\.js$/)) {
    await applyJavaScript(db, getMigrationId(name));
  } else {
    await applySql(db, code);
  }
  await sqlite.runQuery(db, 'INSERT INTO __migrations__ (id) VALUES (?)', [
    getMigrationId(name)
  ]);
}

function checkDatabaseValidity(appliedIds, available) {
  for (let i = 0; i < appliedIds.length; i++) {
    if (
      i >= available.length ||
      appliedIds[i] !== getMigrationId(available[i])
    ) {
      throw new Error('out-of-sync-migrations');
    }
  }
}

export async function migrate(db) {
  let appliedIds = await getAppliedMigrations(db);
  let available = await getMigrationList(MIGRATIONS_DIR);

  checkDatabaseValidity(appliedIds, available);

  const pending = getPending(appliedIds, available);

  for (let migration of pending) {
    await applyMigration(db, migration, MIGRATIONS_DIR);
  }

  return pending;
}
