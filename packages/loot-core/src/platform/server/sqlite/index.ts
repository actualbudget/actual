// @ts-strict-ignore
import type {
  Database as SqlJsDatabase,
  Statement as SqlJsStatement,
} from '@jlongster/sql.js';

import * as legacy from './engine.sqljs.legacy';
import * as wasm from './engine.wasm';
import type {
  Database,
  SqlParam,
  Statement,
  StorageBackend,
  TransactionOptions,
} from './types';

export type {
  Database,
  SqlParam,
  Statement,
  StorageBackend,
  TransactionOptions,
} from './types';
// Used by the legacy filesystem layer and its tests
export { _getModule } from './engine.sqljs.legacy';
export type { SqlJsModule } from './engine.sqljs.legacy';

// The web sqlite module is a facade over two engines: the legacy sql.js
// build over absurd-sql, and the official sqlite-wasm build. `init`
// picks one from the storage backend; everything else forwards to it.
let useWasmEngine = false;

function asSqlJs(db: Database): SqlJsDatabase {
  return db as unknown as SqlJsDatabase;
}

function asSqlJsStatement(sql: string | Statement): string | SqlJsStatement {
  return sql as unknown as string | SqlJsStatement;
}

export function setWasmBinary(binary: ArrayBuffer | Uint8Array) {
  legacy.setWasmBinary(binary);
  wasm.setWasmBinary(binary);
}

export async function init({
  baseURL,
  wasmBinary,
  storage = 'legacy',
}: {
  baseURL?: string;
  wasmBinary?: ArrayBuffer | Uint8Array;
  storage?: StorageBackend;
} = {}): Promise<void> {
  useWasmEngine = storage !== 'legacy';
  if (useWasmEngine) {
    await wasm.init({ baseURL, wasmBinary });
  } else {
    await legacy.init({ baseURL, wasmBinary });
  }
}

export function prepare(db: Database, sql: string): Statement {
  if (useWasmEngine) {
    return wasm.prepare(db, sql);
  }
  return legacy.prepare(asSqlJs(db), sql) as unknown as Statement;
}

// Frees a prepared statement that is no longer needed (for example when
// it is evicted from a statement cache). Closing the database also frees
// its statements, so this is only an optimisation for long sessions.
export function finalizeStatement(statement: Statement) {
  if (useWasmEngine) {
    wasm.finalizeStatement(statement);
  } else {
    (statement as unknown as SqlJsStatement).free();
  }
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
  if (useWasmEngine) {
    return fetchAll
      ? wasm.runQuery<T>(db, sql, params, true)
      : wasm.runQuery(db, sql, params, false);
  }
  return fetchAll
    ? legacy.runQuery<T>(asSqlJs(db), asSqlJsStatement(sql), params, true)
    : legacy.runQuery(asSqlJs(db), asSqlJsStatement(sql), params, false);
}

export function execQuery(db: Database, sql: string) {
  if (useWasmEngine) {
    wasm.execQuery(db, sql);
  } else {
    legacy.execQuery(asSqlJs(db), sql);
  }
}

export function transaction(
  db: Database,
  fn: () => void,
  options?: TransactionOptions,
) {
  if (useWasmEngine) {
    wasm.transaction(db, fn, options);
  } else {
    legacy.transaction(asSqlJs(db), fn, options);
  }
}

export async function asyncTransaction(db: Database, fn: () => Promise<void>) {
  if (useWasmEngine) {
    await wasm.asyncTransaction(db, fn);
  } else {
    await legacy.asyncTransaction(asSqlJs(db), fn);
  }
}

export async function openDatabase(
  pathOrBuffer?: string | Uint8Array,
): Promise<Database> {
  if (useWasmEngine) {
    return wasm.openDatabase(pathOrBuffer);
  }
  return (await legacy.openDatabase(pathOrBuffer)) as unknown as Database;
}

export function closeDatabase(db: Database) {
  if (useWasmEngine) {
    wasm.closeDatabase(db);
  } else {
    legacy.closeDatabase(asSqlJs(db));
  }
}

export async function exportDatabase(db: Database): Promise<Uint8Array> {
  if (useWasmEngine) {
    return wasm.exportDatabase(db);
  }
  return legacy.exportDatabase(asSqlJs(db));
}
