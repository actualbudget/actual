import LRU from 'lru-cache';
import * as sqlite from '../../platform/server/sqlite';
import fs from '../../platform/server/fs';

let dbPath;
let db;

export function getDatabase() {
  return db;
}

export function setDatabase(db_) {
  db = db_;
  resetQueryCache();
}

export function getDatabasePath() {
  return dbPath;
}

export async function openDatabase(id) {
  if (db) {
    await sqlite.closeDatabase(db);
  }

  dbPath = fs.join(fs.getBudgetDir(id), 'db.sqlite');
  setDatabase(await sqlite.openDatabase(dbPath));

  // await execQuery('PRAGMA journal_mode = WAL');
}

export async function reopenDatabase() {
  await sqlite.closeDatabase(db);
  setDatabase(await sqlite.openDatabase(dbPath));
}

export async function closeDatabase() {
  if (db) {
    await sqlite.closeDatabase(db);
    setDatabase(null);
  }
}

// This manages an LRU cache of prepared query statements. This is
// only needed in hot spots when you are running lots of queries.
let _queryCache = new LRU({ max: 100 });
export function cache(sql) {
  let cached = _queryCache.get(sql);
  if (cached) {
    return cached;
  }

  let prepared = sqlite.prepare(db, sql);
  _queryCache.set(sql, prepared);
  return prepared;
}

function resetQueryCache() {
  _queryCache = new LRU({ max: 100 });
}
