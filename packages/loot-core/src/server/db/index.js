import * as sqlite from '../../platform/server/sqlite';
import { sendMessages } from '../sync';
import { schema, schemaConfig } from '../aql/schema';
import {
  accountModel,
  categoryModel,
  categoryGroupModel,
  payeeModel,
  payeeRuleModel
} from '../models';
import { groupById } from '../../shared/util';
import {
  makeClock,
  setClock,
  serializeClock,
  deserializeClock,
  makeClientId,
  Timestamp
} from '../crdt';
import {
  convertForInsert,
  convertForUpdate,
  convertFromSelect
} from '../aql/schema-helpers';
import { getDatabase } from './db-connection';

export { toDateRepr, fromDateRepr } from '../models';
export * from "./db-connection"
export * from "./accounts";
export * from "./categories";
export * from "./payees";
export * from "./transactions";

const uuid = require('../../platform/uuid');

export async function loadClock() {
  let row = await first('SELECT * FROM messages_clock');
  if (row) {
    let clock = deserializeClock(row.clock);
    setClock(clock);
  } else {
    // No clock exists yet (first run of the app), so create a default
    // one.
    let timestamp = new Timestamp(0, 0, makeClientId());
    let clock = makeClock(timestamp);
    setClock(clock);

    await runQuery('INSERT INTO messages_clock (id, clock) VALUES (?, ?)', [
      1,
      serializeClock(clock)
    ]);
  }
}

// Functions

export function runQuery(sql, params, fetchAll) {
  // const unrecord = perf.record('sqlite');
  const result = sqlite.runQuery(getDatabase(), sql, params, fetchAll);
  // unrecord();
  return result;
}

export function execQuery(sql) {
  sqlite.execQuery(getDatabase(), sql);
}

export function transaction(fn) {
  return sqlite.transaction(getDatabase(), fn);
}

export function asyncTransaction(fn) {
  return sqlite.asyncTransaction(getDatabase(), fn);
}

// This function is marked as async because `runQuery` is no longer
// async. We return a promise here until we've audited all the code to
// make sure nothing calls `.then` on this.
export async function all(sql, params) {
  return runQuery(sql, params, true);
}

export async function first(sql, params) {
  const arr = await runQuery(sql, params, true);
  return arr.length === 0 ? null : arr[0];
}

// The underlying sql system is now sync, but we can't update `first` yet
// without auditing all uses of it
export function firstSync(sql, params) {
  const arr = runQuery(sql, params, true);
  return arr.length === 0 ? null : arr[0];
}

// This function is marked as async because `runQuery` is no longer
// async. We return a promise here until we've audited all the code to
// make sure nothing calls `.then` on this.
export async function run(sql, params) {
  return runQuery(sql, params);
}

export async function select(table, id) {
  const rows = await runQuery(
    'SELECT * FROM ' + table + ' WHERE id = ?',
    [id],
    true
  );
  return rows[0];
}

export async function update(table, params) {
  let fields = Object.keys(params).filter(k => k !== 'id');

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
        timestamp: Timestamp.send()
      };
    })
  );
}

export async function insertWithUUID(table, row) {
  if (!row.id) {
    row = { ...row, id: uuid.v4Sync() };
  }

  await insert(table, row);

  // We can't rely on the return value of insert because if the
  // primary key is text, sqlite returns the internal row id which we
  // don't care about. We want to return the generated UUID.
  return row.id;
}

export async function insert(table, row) {
  let fields = Object.keys(row).filter(k => k !== 'id');

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
        timestamp: Timestamp.send()
      };
    })
  );
}

export async function delete_(table, id) {
  await sendMessages([
    {
      dataset: table,
      row: id,
      column: 'tombstone',
      value: 1,
      timestamp: Timestamp.send()
    }
  ]);
}

export async function selectWithSchema(table, sql, params) {
  let rows = await runQuery(sql, params, true);
  return rows
    .map(row => convertFromSelect(schema, schemaConfig, table, row))
    .filter(Boolean);
}

export async function selectFirstWithSchema(table, sql, params) {
  let rows = await selectWithSchema(table, sql, params);
  return rows.length > 0 ? rows[0] : null;
}

export function insertWithSchema(table, row) {
  // Even though `insertWithUUID` does this, we need to do it here so
  // the schema validation passes
  if (!row.id) {
    row = { ...row, id: uuid.v4Sync() };
  }

  return insertWithUUID(
    table,
    convertForInsert(schema, schemaConfig, table, row)
  );
}

export function updateWithSchema(table, fields) {
  return update(table, convertForUpdate(schema, schemaConfig, table, fields));
}
