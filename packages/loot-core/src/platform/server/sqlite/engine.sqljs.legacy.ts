// @ts-strict-ignore
import initSqlJS from '@jlongster/sql.js';
import type { Database, SqlJsStatic, Statement } from '@jlongster/sql.js';

import { logger } from '#platform/server/log';

import { normalise } from './normalise';
import { regexp } from './regexp';
import type { SqlParam } from './types';
import { unicodeLike } from './unicodeLike';

export type { SqlParam } from './types';

// Legacy web engine: sql.js over absurd-sql. Today's code moved behind the
// facade in `index.ts` (which owns the transaction helpers) until the
// sqlite-wasm engine becomes the default.

// Types exported from sql.js (and Emscripten) are incomplete, so we need to redefine them here
type FSStream = (typeof FS)['FSStream'] & {
  node: (typeof FS)['FSNode'] & {
    contents: {
      readIfFallback: () => Promise<unknown>;
    };
  };
};
type FS = Omit<typeof FS, 'lookupPath' | 'open' | 'close'> & {
  lookupPath: (
    path: string,
    opts?: { follow?: boolean },
  ) => { node: (typeof FS)['FSNode'] & { link?: string } };
  open: (path: string, flags: string, mode?: number) => FSStream;
  close: (stream: FSStream) => void;
};
export type SqlJsModule = SqlJsStatic & {
  FS: FS;
  reset_filesystem: () => void;
  register_for_idb: (idb: IDBDatabase) => void;
};

let SQL: SqlJsModule | null = null;

// Opt-in: when set, the wasm is instantiated from these bytes instead of being
// fetched via `locateFile`. The browser build of `@actual-app/api` uses this to
// ship a fully self-contained worker (no `sql-wasm.wasm` request). Dormant for
// every other consumer (web app and Node build never call `setWasmBinary`).
let wasmBinaryOverride: ArrayBuffer | Uint8Array | undefined;

export function setWasmBinary(binary: ArrayBuffer | Uint8Array) {
  wasmBinaryOverride = binary;
}

export async function init({
  baseURL = process.env.PUBLIC_URL,
  wasmBinary = wasmBinaryOverride,
}: { baseURL?: string; wasmBinary?: ArrayBuffer | Uint8Array } = {}) {
  // `initSqlJS` doesn't actually return a real promise, so make sure
  // we're returning a real one for correct semantics
  return new Promise((resolve, reject) => {
    initSqlJS({
      locateFile: file => baseURL + file,
      ...(wasmBinary ? { wasmBinary: wasmBinary as ArrayBuffer } : {}),
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

function verifyParamTypes(sql: string | Statement, arr: SqlParam[] = []) {
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
  sql: string | Statement,
  params?: SqlParam[],
  fetchAll?: false,
): { changes: unknown };
export function runQuery<T>(
  db: Database,
  sql: string | Statement,
  params: SqlParam[],
  fetchAll: true,
): T[];
export function runQuery<T>(
  db: Database,
  sql: string | Statement,
  params: SqlParam[] = [],
  fetchAll = false,
): T[] | { changes: unknown } {
  if (params) {
    verifyParamTypes(sql, params);
  }

  const stmt = typeof sql === 'string' ? db.prepare(sql) : sql;

  try {
    if (fetchAll) {
      try {
        stmt.bind(params);
        const columns = stmt.getColumnNames();
        const rows = [];

        while (stmt.step()) {
          const values = stmt.get();
          const row = {};
          for (let i = 0; i < columns.length; i++) {
            row[columns[i]] = values[i];
          }
          rows.push(row);
        }
        return rows;
      } catch (e) {
        logger.log(sql);
        throw e;
      }
    }

    stmt.run(params);
    return { changes: db.getRowsModified() };
  } finally {
    // sql.js keeps statements alive in the WASM heap until they are freed.
    if (typeof sql === 'string') {
      stmt.free();
    } else {
      stmt.reset();
    }
  }
}

export function execQuery(db: Database, sql: string) {
  db.exec(sql);
}

export async function openDatabase(pathOrBuffer?: string | Uint8Array) {
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
        // absurd-sql serves every page cache miss with a synchronous
        // round trip to IndexedDB, so allow the cache to hold a whole
        // large budget file. SQLite allocates cache pages lazily, so
        // small files don't pay for the ceiling. The value is in KiB.
        db.exec(`
          PRAGMA journal_mode=MEMORY;
          PRAGMA cache_size=-64000;
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
