import type {
  Database as SqlJsDatabase,
  Statement as SqlJsStatement,
} from '@jlongster/sql.js';

import * as legacy from './engine.sqljs.legacy';
import * as wasm from './engine.wasm';
import type { PreparedStatement, WasmDatabase } from './engine.wasm';
import {
  findMigratedStorageKind,
  getSqliteStore,
  hasSqliteStore,
  initSqliteStorage,
  revertToLegacy,
} from './storage';
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
export {
  BudgetInUseError,
  StorageMigrationError,
  StorageUnavailableError,
} from './storage/errors';
// Used by the legacy filesystem layer and its tests
export { _getModule } from './engine.sqljs.legacy';
export type { SqlJsModule } from './engine.sqljs.legacy';

// The web sqlite module is a facade over two engines: the legacy sql.js
// build over absurd-sql, and the official sqlite-wasm build. `init` picks
// one from the storage backend; everything else forwards to it. Callers
// only see the opaque `Database` and `Statement` handles from `./types`.
let activeBackend: StorageBackend = 'legacy';

function isWasmEngineActive() {
  return activeBackend !== 'legacy';
}

function asSqlJs(db: Database): SqlJsDatabase {
  return db as unknown as SqlJsDatabase;
}

function asSqlJsStatement(sql: string | Statement): string | SqlJsStatement {
  return sql as unknown as string | SqlJsStatement;
}

function asWasm(db: Database): WasmDatabase {
  return db as unknown as WasmDatabase;
}

function asWasmStatement(sql: string | Statement): string | PreparedStatement {
  return sql as unknown as string | PreparedStatement;
}

// The browser build of `@actual-app/api` embeds the sqlite-wasm binary and
// runs that engine only; the web app fetches it from `kcab/`.
export function setWasmBinary(binary: ArrayBuffer | Uint8Array) {
  wasm.setWasmBinary(binary);
}

// Resolves to the backend actually in use: `opfs` falls back to
// `memory-idb` when sync access handles are unavailable.
export async function init({
  baseURL,
  wasmBinary,
  storage = 'legacy',
}: {
  baseURL?: string;
  wasmBinary?: ArrayBuffer | Uint8Array;
  storage?: StorageBackend;
} = {}): Promise<StorageBackend> {
  if (storage === 'legacy') {
    await legacy.init({ baseURL, wasmBinary });
    activeBackend = 'legacy';
  } else {
    await wasm.init({ baseURL, wasmBinary });
    activeBackend = await initSqliteStorage(storage);
  }
  return activeBackend;
}

export function getStorageBackend(): StorageBackend {
  return activeBackend;
}

// A backend already holding migrated data, if any. Chosen over the flag at
// startup so a cleared flag can never show an empty app.
export async function findMigratedStorageBackend(): Promise<StorageBackend | null> {
  return findMigratedStorageKind();
}

// Persist anything pending (the IndexedDB fallback writes lazily)
export async function flushSqliteStorage(): Promise<void> {
  if (hasSqliteStore()) {
    await getSqliteStore().flush();
  }
}

// Let go of storage handles and locks so another worker can take over
export async function releaseSqliteStorage(): Promise<void> {
  if (hasSqliteStore()) {
    await getSqliteStore().releaseAll();
  }
}

// Move every budget back to absurd-sql's layout (the opt-in phase's way
// back); the next start then picks the legacy engine
export async function revertSqliteStorageToLegacy(): Promise<void> {
  if (hasSqliteStore()) {
    await revertToLegacy();
  }
}

export function prepare(db: Database, sql: string): Statement {
  const statement = isWasmEngineActive()
    ? wasm.prepare(asWasm(db), sql)
    : legacy.prepare(asSqlJs(db), sql);
  return statement as unknown as Statement;
}

// Frees a prepared statement that is no longer needed (for example when
// it is evicted from a statement cache). Closing the database also frees
// its statements, so this is only an optimisation for long sessions.
export function finalizeStatement(statement: Statement) {
  if (isWasmEngineActive()) {
    wasm.finalizeStatement(statement as unknown as PreparedStatement);
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
  if (isWasmEngineActive()) {
    return fetchAll
      ? wasm.runQuery<T>(asWasm(db), asWasmStatement(sql), params, true)
      : wasm.runQuery(asWasm(db), asWasmStatement(sql), params, false);
  }
  return fetchAll
    ? legacy.runQuery<T>(asSqlJs(db), asSqlJsStatement(sql), params, true)
    : legacy.runQuery(asSqlJs(db), asSqlJsStatement(sql), params, false);
}

export function execQuery(db: Database, sql: string) {
  if (isWasmEngineActive()) {
    wasm.execQuery(asWasm(db), sql);
  } else {
    legacy.execQuery(asSqlJs(db), sql);
  }
}

let transactionDepth = 0;

export function transaction(
  db: Database,
  fn: () => void,
  { immediate = false }: TransactionOptions = {},
) {
  let before, after, undo;
  if (transactionDepth > 0) {
    before = 'SAVEPOINT __actual_sp';
    after = 'RELEASE __actual_sp';
    undo = 'ROLLBACK TO __actual_sp';
  } else {
    before = immediate ? 'BEGIN IMMEDIATE' : 'BEGIN';
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

// See the comment about this function in index.electron.ts. You
// shouldn't normally use this. I'd like to get rid of it.
export async function asyncTransaction(db: Database, fn: () => Promise<void>) {
  // Support nested transactions by "coalescing" them into the parent
  // one if one is already started
  if (transactionDepth === 0) {
    execQuery(db, 'BEGIN TRANSACTION');
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
      execQuery(db, 'COMMIT');
    }
  }
}

export async function openDatabase(
  pathOrBuffer?: string | Uint8Array,
): Promise<Database> {
  const db = isWasmEngineActive()
    ? await wasm.openDatabase(pathOrBuffer)
    : await legacy.openDatabase(pathOrBuffer);
  return db as unknown as Database;
}

export function closeDatabase(db: Database) {
  if (isWasmEngineActive()) {
    wasm.closeDatabase(asWasm(db));
  } else {
    legacy.closeDatabase(asSqlJs(db));
  }
}

export async function exportDatabase(db: Database): Promise<Uint8Array> {
  return isWasmEngineActive()
    ? wasm.exportDatabase(asWasm(db))
    : legacy.exportDatabase(asSqlJs(db));
}
