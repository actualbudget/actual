// @ts-strict-ignore
import {
  makeClock,
  setClock,
  serializeClock,
  deserializeClock,
  makeClientId,
  Timestamp,
} from '@actual-app/crdt';
import { Database } from '@jlongster/sql.js';
import { LRUCache } from 'lru-cache';
import { v4 as uuidv4 } from 'uuid';

import * as fs from '../../platform/server/fs';
import * as sqlite from '../../platform/server/sqlite';
import {
  schema,
  schemaConfig,
  convertForInsert,
  convertForUpdate,
  convertFromSelect,
} from '../aql';
import { sendMessages } from '../sync';

import { DbClockMessage } from './types';

export * from './types';

export { toDateRepr, fromDateRepr } from '../models';

let dbPath: string | null = null;
let db: Database | null = null;

// Util

export function getDatabasePath() {
  return dbPath;
}

export async function openDatabase(id?: string) {
  if (db) {
    await sqlite.closeDatabase(db);
  }

  dbPath = fs.join(fs.getBudgetDir(id), 'db.sqlite');
  setDatabase(await sqlite.openDatabase(dbPath));

  // await execQuery('PRAGMA journal_mode = WAL');
}

export async function closeDatabase() {
  if (db) {
    await sqlite.closeDatabase(db);
    setDatabase(null);
  }
}

export function setDatabase(db_: Database) {
  db = db_;
  resetQueryCache();
}

export function getDatabase() {
  return db;
}

export async function loadClock() {
  const row = await first<DbClockMessage>('SELECT * FROM messages_clock');
  if (row) {
    const clock = deserializeClock(row.clock);
    setClock(clock);
  } else {
    // No clock exists yet (first run of the app), so create a default
    // one.
    const timestamp = new Timestamp(0, 0, makeClientId());
    const clock = makeClock(timestamp);
    setClock(clock);

    await runQuery('INSERT INTO messages_clock (id, clock) VALUES (?, ?)', [
      1,
      serializeClock(clock),
    ]);
  }
}

// Functions
export function runQuery(
  sql: string,
  params?: Array<string | number>,
  fetchAll?: false,
): { changes: unknown };

export function runQuery<T>(
  sql: string,
  params: Array<string | number> | undefined,
  fetchAll: true,
): T[];

export function runQuery<T>(
  sql: string,
  params: (string | number)[],
  fetchAll: boolean,
) {
  if (fetchAll) {
    return sqlite.runQuery<T>(db, sql, params, true);
  } else {
    return sqlite.runQuery(db, sql, params, false);
  }
}

export function execQuery(sql: string) {
  sqlite.execQuery(db, sql);
}

// This manages an LRU cache of prepared query statements. This is
// only needed in hot spots when you are running lots of queries.
let _queryCache = new LRUCache<string, string>({ max: 100 });
export function cache(sql: string) {
  const cached = _queryCache.get(sql);
  if (cached) {
    return cached;
  }

  const prepared = sqlite.prepare(db, sql);
  _queryCache.set(sql, prepared);
  return prepared;
}

function resetQueryCache() {
  _queryCache = new LRUCache<string, string>({ max: 100 });
}

export function transaction(fn: () => void) {
  return sqlite.transaction(db, fn);
}

export function asyncTransaction(fn: () => Promise<void>) {
  return sqlite.asyncTransaction(db, fn);
}

// This function is marked as async because `runQuery` is no longer
// async. We return a promise here until we've audited all the code to
// make sure nothing calls `.then` on this.
export async function all<T>(sql: string, params?: (string | number)[]) {
  return runQuery<T>(sql, params, true);
}

export async function first<T>(sql, params?: (string | number)[]) {
  const arr = await runQuery<T>(sql, params, true);
  return arr.length === 0 ? null : arr[0];
}

// The underlying sql system is now sync, but we can't update `first` yet
// without auditing all uses of it
export function firstSync<T>(sql, params?: (string | number)[]) {
  const arr = runQuery<T>(sql, params, true);
  return arr.length === 0 ? null : arr[0];
}

// This function is marked as async because `runQuery` is no longer
// async. We return a promise here until we've audited all the code to
// make sure nothing calls `.then` on this.
export async function run(sql, params?: (string | number)[]) {
  return runQuery(sql, params);
}

export async function select(table, id) {
  const rows = await runQuery(
    'SELECT * FROM ' + table + ' WHERE id = ?',
    [id],
    true,
  );
  // TODO: In the next phase, we will make this function generic
  // and pass the type of the return type to `runQuery`.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return rows[0] as any;
}

export async function update(table, params) {
  const fields = Object.keys(params).filter(k => k !== 'id');

  if (params.id == null) {
    throw new Error('update: id is required');
  }

  await sendMessages(
    fields.map(k => {
      return {
        dataset: table,
        row: params.id,
        column: k,
        value: params[k],
        timestamp: Timestamp.send(),
      };
    }),
  );
}

export async function insertWithUUID(table, row) {
  if (!row.id) {
    row = { ...row, id: uuidv4() };
  }

  await insert(table, row);

  // We can't rely on the return value of insert because if the
  // primary key is text, sqlite returns the internal row id which we
  // don't care about. We want to return the generated UUID.
  return row.id;
}

export async function insert(table, row) {
  const fields = Object.keys(row).filter(k => k !== 'id');

  if (row.id == null) {
    throw new Error('insert: id is required');
  }

  await sendMessages(
    fields.map(k => {
      return {
        dataset: table,
        row: row.id,
        column: k,
        value: row[k],
        timestamp: Timestamp.send(),
      };
    }),
  );
}

export async function delete_(table, id) {
  await sendMessages([
    {
      dataset: table,
      row: id,
      column: 'tombstone',
      value: 1,
      timestamp: Timestamp.send(),
    },
  ]);
}

export async function deleteAll(table: string) {
  const rows = await all<{ id: string }>(`
    SELECT id FROM ${table} WHERE tombstone = 0
  `);
  await Promise.all(rows.map(({ id }) => delete_(table, id)));
}

export async function selectWithSchema(table, sql, params) {
  const rows = await runQuery(sql, params, true);
  const convertedRows = rows
    .map(row => convertFromSelect(schema, schemaConfig, table, row))
    .filter(Boolean);
  // TODO: Make convertFromSelect generic so we don't need this cast
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return convertedRows as any[];
}

export async function selectFirstWithSchema(table, sql, params) {
  const rows = await selectWithSchema(table, sql, params);
  return rows.length > 0 ? rows[0] : null;
}

export function insertWithSchema(table, row) {
  // Even though `insertWithUUID` does this, we need to do it here so
  // the schema validation passes
  if (!row.id) {
    row = { ...row, id: uuidv4() };
  }

  return insertWithUUID(
    table,
    convertForInsert(schema, schemaConfig, table, row),
  );
}

export function updateWithSchema(table, fields) {
  return update(table, convertForUpdate(schema, schemaConfig, table, fields));
}
