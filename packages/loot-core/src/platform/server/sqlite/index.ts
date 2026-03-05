// @ts-strict-ignore
import sqlite3InitModule from '@sqlite.org/sqlite-wasm';
import type {
  Database,
  PreparedStatement,
  SAHPoolUtil,
  Sqlite3Static,
  SqlValue,
} from '@sqlite.org/sqlite-wasm';

import { logger } from '../log';

import { normalise } from './normalise';
import { unicodeLike } from './unicodeLike';

export type { Database, PreparedStatement };
export type Statement = PreparedStatement;

let sqlite3: Sqlite3Static | null = null;
let sahPoolUtil: SAHPoolUtil | null = null;

export async function init({
  baseURL = process.env.PUBLIC_URL,
}: { baseURL?: string } = {}) {
  // The Emscripten-level `locateFile` option isn't in the TypeScript types
  // but is supported at runtime to resolve the .wasm file path.
  // In Node.js (tests), omit locateFile so it resolves relative to the module.
  const opts: Record<string, unknown> = {};
  if (baseURL) {
    opts.locateFile = (file: string) => baseURL + file;
  }
  sqlite3 = await (
    sqlite3InitModule as (
      opts?: Record<string, unknown>,
    ) => Promise<Sqlite3Static>
  )(opts);

  // Install the OPFS SAH Pool VFS for persistent storage.
  // This works in Web Workers without requiring SharedArrayBuffer or COOP/COEP headers.
  if (
    typeof globalThis.FileSystemHandle !== 'undefined' &&
    typeof globalThis.FileSystemDirectoryHandle !== 'undefined' &&
    typeof navigator !== 'undefined'
  ) {
    try {
      sahPoolUtil = await sqlite3.installOpfsSAHPoolVfs({
        initialCapacity: 16,
        directory: '.actual-budget',
        name: 'opfs-sahpool',
      });
    } catch (e) {
      logger.log('OPFS SAH Pool VFS not available, using in-memory only:', e);
    }
  }
}

export function _getModule() {
  if (sqlite3 == null) {
    throw new Error('_getModule: sqlite3 must be initialized first');
  }
  return sqlite3;
}

export function _getSAHPoolUtil() {
  return sahPoolUtil;
}

function verifyParamTypes(
  sql: string | PreparedStatement,
  arr: (string | number)[] = [],
) {
  arr.forEach(val => {
    if (typeof val !== 'string' && typeof val !== 'number' && val !== null) {
      const sqlDesc = typeof sql === 'string' ? sql : '[PreparedStatement]';
      throw new Error('Invalid field type ' + val + ' for sql ' + sqlDesc);
    }
  });
}

export function prepare(db: Database, sql: string) {
  return db.prepare(sql);
}

export function runQuery(
  db: Database,
  sql: string | PreparedStatement,
  params?: (string | number)[],
  fetchAll?: false,
): { changes: unknown };
export function runQuery<T>(
  db: Database,
  sql: string | PreparedStatement,
  params: (string | number)[],
  fetchAll: true,
): T[];
export function runQuery<T>(
  db: Database,
  sql: string | PreparedStatement,
  params: (string | number)[] = [],
  fetchAll = false,
): T[] | { changes: unknown } {
  if (params) {
    verifyParamTypes(sql, params);
  }

  const stmt = typeof sql === 'string' ? db.prepare(sql) : sql;
  const hasParams = params && params.length > 0;

  if (fetchAll) {
    try {
      if (hasParams) {
        stmt.bind(params);
      }
      const rows = [];

      while (stmt.step()) {
        rows.push(stmt.get({}) as T);
      }

      if (typeof sql === 'string') {
        stmt.finalize();
      } else {
        stmt.reset();
      }
      return rows;
    } catch (e) {
      logger.log(sql);
      throw e;
    }
  } else {
    if (hasParams) {
      stmt.bind(params);
    }
    stmt.step();
    if (typeof sql === 'string') {
      stmt.finalize();
    } else {
      stmt.reset();
    }
    return { changes: db.changes() };
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

function toStr(val: SqlValue | undefined): string {
  if (val == null) return '';
  if (typeof val === 'string') return val;
  if (typeof val === 'number' || typeof val === 'bigint') return val.toString();
  return '';
}

function regexp(_ctxPtr: number, ...args: SqlValue[]) {
  const regex = toStr(args[0]);
  const text = toStr(args[1]);
  return new RegExp(regex).test(text) ? 1 : 0;
}

export async function openDatabase(pathOrBuffer?: string | Uint8Array) {
  if (sqlite3 == null) {
    throw new Error('openDatabase: sqlite3 must be initialized first');
  }

  let db: Database;
  if (pathOrBuffer) {
    if (typeof pathOrBuffer !== 'string') {
      // Load from a buffer: create in-memory DB then deserialize
      db = new sqlite3.oo1.DB();
      const rc = sqlite3.capi.sqlite3_deserialize(
        db.pointer,
        'main',
        sqlite3.wasm.allocFromTypedArray(pathOrBuffer),
        pathOrBuffer.byteLength,
        pathOrBuffer.byteLength,
        sqlite3.capi.SQLITE_DESERIALIZE_FREEONCLOSE |
          sqlite3.capi.SQLITE_DESERIALIZE_RESIZEABLE,
      );
      db.checkRc(rc);
    } else {
      const path = pathOrBuffer;
      if (path !== ':memory:') {
        // Open a persistent database using OPFS SAH Pool VFS if available
        if (sahPoolUtil) {
          db = new sahPoolUtil.OpfsSAHPoolDb(path);
        } else {
          // Fallback to in-memory database when OPFS is not available
          db = new sqlite3.oo1.DB(path, 'c');
        }
        db.exec(`
          PRAGMA journal_mode=MEMORY;
          PRAGMA cache_size=-10000;
        `);
      } else {
        db = new sqlite3.oo1.DB(':memory:');
      }
    }
  } else {
    db = new sqlite3.oo1.DB();
  }

  // Define Unicode-aware LOWER, UPPER, and LIKE implementation.
  db.createFunction('UNICODE_LOWER', {
    xFunc: (_ctxPtr: number, ...args: SqlValue[]) => {
      const arg = args[0];
      return typeof arg === 'string' ? arg.toLowerCase() : null;
    },
    arity: 1,
  });
  db.createFunction('UNICODE_UPPER', {
    xFunc: (_ctxPtr: number, ...args: SqlValue[]) => {
      const arg = args[0];
      return typeof arg === 'string' ? arg.toUpperCase() : null;
    },
    arity: 1,
  });
  db.createFunction('UNICODE_LIKE', {
    xFunc: (_ctxPtr: number, ...args: SqlValue[]) =>
      unicodeLike(toStr(args[0]), toStr(args[1])),
    arity: 2,
  });
  db.createFunction('REGEXP', {
    xFunc: regexp,
    arity: 2,
  });
  db.createFunction('NORMALISE', {
    xFunc: (_ctxPtr: number, ...args: SqlValue[]) => normalise(toStr(args[0])),
    arity: 1,
  });
  return db;
}

export function closeDatabase(db: Database) {
  db.close();
}

export async function exportDatabase(db: Database) {
  if (sqlite3 == null) {
    throw new Error('exportDatabase: sqlite3 must be initialized first');
  }

  // Use sqlite3_serialize to export the database to a byte array
  const pSize = sqlite3.wasm.pstack.alloc(8);
  try {
    const pData = sqlite3.capi.sqlite3_serialize(db.pointer, 'main', pSize, 0);
    if (!pData) {
      throw new Error('Failed to serialize database');
    }
    const size = Number(sqlite3.wasm.peek(pSize, 'i64'));
    const data = sqlite3.wasm.heap8u().slice(pData, pData + size);
    sqlite3.wasm.dealloc(pData);
    return data;
  } finally {
    sqlite3.wasm.pstack.restore(pSize);
  }
}
