import * as wasm from './engine.wasm';
import {
  findMigratedStorageKind,
  getSqliteStore,
  hasSqliteStore,
  initSqliteStorage,
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

// The web sqlite module: the official sqlite-wasm build over the OPFS pool
// store, or over the in-memory store persisted to IndexedDB where sync
// access handles are unavailable.
let activeBackend: StorageBackend = 'opfs';

export function setWasmBinary(binary: ArrayBuffer | Uint8Array) {
  wasm.setWasmBinary(binary);
}

// Resolves to the backend actually in use: `opfs` falls back to
// `memory-idb` when sync access handles are unavailable. `legacy` (the
// removed absurd-sql engine) is treated as the default; its data is
// migrated when a budget is next opened.
export async function init({
  baseURL,
  wasmBinary,
  storage = 'opfs',
}: {
  baseURL?: string;
  wasmBinary?: ArrayBuffer | Uint8Array;
  storage?: StorageBackend;
} = {}): Promise<StorageBackend> {
  await wasm.init({ baseURL, wasmBinary });
  activeBackend = await initSqliteStorage(
    storage === 'legacy' ? 'opfs' : storage,
  );
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

export function prepare(db: Database, sql: string): Statement {
  return wasm.prepare(db, sql);
}

// Frees a prepared statement that is no longer needed (for example when
// it is evicted from a statement cache). Closing the database also frees
// its statements, so this is only an optimisation for long sessions.
export function finalizeStatement(statement: Statement) {
  wasm.finalizeStatement(statement);
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
  return fetchAll
    ? wasm.runQuery<T>(db, sql, params, true)
    : wasm.runQuery(db, sql, params, false);
}

export function execQuery(db: Database, sql: string) {
  wasm.execQuery(db, sql);
}

export function transaction(
  db: Database,
  fn: () => void,
  options?: TransactionOptions,
) {
  wasm.transaction(db, fn, options);
}

export async function asyncTransaction(db: Database, fn: () => Promise<void>) {
  await wasm.asyncTransaction(db, fn);
}

export async function openDatabase(
  pathOrBuffer?: string | Uint8Array,
): Promise<Database> {
  return wasm.openDatabase(pathOrBuffer);
}

export function closeDatabase(db: Database) {
  wasm.closeDatabase(db);
}

export async function exportDatabase(db: Database): Promise<Uint8Array> {
  return wasm.exportDatabase(db);
}
