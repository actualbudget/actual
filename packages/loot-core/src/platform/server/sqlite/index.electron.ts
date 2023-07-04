import Database from 'better-sqlite3';
import { v4 as uuidv4 } from 'uuid';

import { removeFile, readFile } from '../fs';

function verifyParamTypes(sql, arr) {
  arr.forEach(val => {
    if (typeof val !== 'string' && typeof val !== 'number' && val !== null) {
      console.log(sql, arr);
      throw new Error('Invalid field type ' + val + ' for sql ' + sql);
    }
  });
}

export async function init() {}

export function prepare(db, sql) {
  return db.prepare(sql);
}

export function runQuery(db, sql, params = [], fetchAll) {
  if (params) {
    verifyParamTypes(sql, params);
  }

  let stmt;
  try {
    stmt = typeof sql === 'string' ? db.prepare(sql) : sql;
  } catch (e) {
    console.log('error', sql);
    throw e;
  }

  if (fetchAll) {
    try {
      let result = stmt.all(...params);
      return result;
    } catch (e) {
      console.log('error', sql);
      throw e;
    }
  } else {
    try {
      let info = stmt.run(...params);
      return { changes: info.changes, insertId: info.lastInsertRowid };
    } catch (e) {
      // console.log('error', sql);
      throw e;
    }
  }
}

export function execQuery(db, sql) {
  db.exec(sql);
}

export function transaction(db, fn) {
  db.transaction(fn)();
}

// **Important**: this is an unsafe function since sqlite executes
// executes statements sequentially. It would be easy for other code
// to run statements in between our transaction and get caught up in
// it. This is rarely used, and only needed for specific cases (like
// batch importing a bunch of data). Don't use this.
let transactionDepth = 0;
export async function asyncTransaction(db, fn) {
  // Support nested transactions by "coalescing" them into the parent
  // one if one is already started
  if (transactionDepth === 0) {
    db.exec('BEGIN TRANSACTION');
  }
  transactionDepth++;

  try {
    await fn();
  } finally {
    transactionDepth--;
    // We always commit because rollback is more dangerous - any
    // queries that ran *in-between* this async function would be
    // lost. Right now we are only using transactions for speed
    // purposes unfortunately
    if (transactionDepth === 0) {
      db.exec('COMMIT');
    }
  }
}

export function openDatabase(pathOrBuffer) {
  let db = new Database(pathOrBuffer);
  // Define Unicode-aware LOWER and UPPER implementation.
  // This is necessary because better-sqlite3 uses SQLite build without ICU support.
  db.function('UNICODE_LOWER', { deterministic: true }, (arg: string | null) =>
    arg?.toLowerCase(),
  );
  db.function('UNICODE_UPPER', { deterministic: true }, (arg: string | null) =>
    arg?.toUpperCase(),
  );
  return db;
}

export function closeDatabase(db) {
  return db.close();
}

export async function exportDatabase(db) {
  // electron does not support better-sqlite serialize since v21
  // save to file and read in the raw data.
  let name = `backup-for-export-${uuidv4()}.db`;

  await db.backup(name);

  let data = await readFile(name);
  await removeFile(name);

  return data;
}
