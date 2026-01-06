// @ts-strict-ignore
import initSqlJS, { type Database } from '@jlongster/sql.js';

import { logger } from '../log';

import { normalise } from './normalise';
import { unicodeLike } from './unicodeLike';

import type { SqlJsModule } from '.';

let SQL: SqlJsModule | null = null;

export async function init({
  baseURL = process.env.PUBLIC_URL,
}: { baseURL?: string } = {}) {
  // `initSqlJS` doesn't actually return a real promise, so make sure
  // we're returning a real one for correct semantics
  return new Promise((resolve, reject) => {
    initSqlJS({
      locateFile: file => baseURL + file,
    }).then(
      sql => {
        SQL = sql as SqlJsModule;
        resolve(undefined);
      },
      err => {
        reject(err);
      },
    );
  });
}

export function _getModule() {
  if (SQL == null) {
    throw new Error('_getModule: sql.js must be initialized first');
  }
  return SQL;
}

function verifyParamTypes(sql: string, arr: (string | number)[] = []) {
  arr.forEach(val => {
    if (typeof val !== 'string' && typeof val !== 'number' && val !== null) {
      throw new Error('Invalid field type ' + val + ' for sql ' + sql);
    }
  });
}

export function prepare(db: Database, sql: string) {
  return db.prepare(sql);
}

export function runQuery(
  db: Database,
  sql: string,
  params?: (string | number)[],
  fetchAll?: false,
): { changes: unknown };
export function runQuery(
  db: Database,
  sql: string,
  params: (string | number)[],
  fetchAll: true,
): unknown[];
export function runQuery(
  db: Database,
  sql: string,
  params: (string | number)[] = [],
  fetchAll = false,
): unknown[] | { changes: unknown } {
  if (params) {
    verifyParamTypes(sql, params);
  }

  const stmt = typeof sql === 'string' ? db.prepare(sql) : sql;

  if (fetchAll) {
    try {
      stmt.bind(params);
      const rows = [];

      while (stmt.step()) {
        rows.push(stmt.getAsObject());
      }

      if (typeof sql === 'string') {
        stmt.free();
      } else {
        stmt.reset();
      }
      return rows;
    } catch (e) {
      logger.log(sql);
      throw e;
    }
  } else {
    stmt.run(params);
    return { changes: db.getRowsModified() };
  }
}

export function execQuery(db: Database, sql: string) {
  db.exec(sql);
}

let transactionDepth = 0;

export function transaction(db: Database, fn: () => void) {
  let before, after, undo;
  if (transactionDepth > 0) {
    before = 'SAVEPOINT __actual_sp';
    after = 'RELEASE __actual_sp';
    undo = 'ROLLBACK TO __actual_sp';
  } else {
    before = 'BEGIN';
    after = 'COMMIT';
    undo = 'ROLLBACK';
  }

  execQuery(db, before);
  transactionDepth++;

  try {
    fn();
    execQuery(db, after);
  } catch (ex) {
    execQuery(db, undo);

    if (undo !== 'ROLLBACK') {
      execQuery(db, after);
    }

    throw ex;
  } finally {
    transactionDepth--;
  }
}

// See the comment about this function in index.electron.js. You
// shouldn't normally use this. I'd like to get rid of it.
export async function asyncTransaction(db: Database, fn: () => Promise<void>) {
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

function regexp(regex: string, text: string) {
  return new RegExp(regex).test(text || '') ? 1 : 0;
}

export async function openDatabase(pathOrBuffer?: string | Buffer) {
  let db = null;
  if (pathOrBuffer) {
    if (typeof pathOrBuffer !== 'string') {
      db = new SQL.Database(pathOrBuffer);
    } else {
      const path = pathOrBuffer;
      if (path !== ':memory:') {
        if (typeof SharedArrayBuffer === 'undefined') {
          const stream = SQL.FS.open(SQL.FS.readlink(path), 'a+');
          await stream.node.contents.readIfFallback();
          SQL.FS.close(stream);
        }

        db = new SQL.Database(
          path.includes('/blocked') ? path : SQL.FS.readlink(path),
          // @ts-expect-error 2nd argument missed in sql.js types
          { filename: true },
        );
        db.exec(`
          PRAGMA journal_mode=MEMORY;
          PRAGMA cache_size=-10000;
        `);
      }
    }
  }

  if (db === null) {
    db = new SQL.Database();
  }

  // Define Unicode-aware LOWER, UPPER, and LIKE implementation.
  // This is necessary because sql.js uses SQLite build without ICU support.
  //
  // Note that this function should ideally be created with a deterministic flag
  // to allow SQLite to better optimize calls to it by factoring them out of inner loops
  // but SQL.js does not support this: https://github.com/sql-js/sql.js/issues/551
  db.create_function('UNICODE_LOWER', arg => arg?.toLowerCase());
  db.create_function('UNICODE_UPPER', arg => arg?.toUpperCase());
  db.create_function('UNICODE_LIKE', unicodeLike);
  db.create_function('REGEXP', regexp);
  db.create_function('NORMALISE', normalise);
  return db;
}

export function closeDatabase(db: Database) {
  db.close();
}

export async function exportDatabase(db: Database) {
  return db.export();
}
