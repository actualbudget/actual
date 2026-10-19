import * as wasm from './engine.wasm';
import type { PreparedStatement, WasmDatabase } from './engine.wasm';
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
// access handles are unavailable. Callers only see the opaque `Database`
// and `Statement` handles from `./types`.
let activeBackend: StorageBackend = 'opfs';

function asWasm(db: Database): WasmDatabase {
  return db as unknown as WasmDatabase;
}

function asWasmStatement(sql: string | Statement): string | PreparedStatement {
  return sql as unknown as string | PreparedStatement;
}

// The browser build of `@actual-app/api` embeds the sqlite-wasm binary; the
// web app fetches it from `kcab/`.
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
  return wasm.prepare(asWasm(db), sql) as unknown as Statement;
}

// Frees a prepared statement that is no longer needed (for example when
// it is evicted from a statement cache). Closing the database also frees
// its statements, so this is only an optimisation for long sessions.
export function finalizeStatement(statement: Statement) {
  wasm.finalizeStatement(statement as unknown as PreparedStatement);
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
    ? wasm.runQuery<T>(asWasm(db), asWasmStatement(sql), params, true)
    : wasm.runQuery(asWasm(db), asWasmStatement(sql), params, false);
}

export function execQuery(db: Database, sql: string) {
  wasm.execQuery(asWasm(db), sql);
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
  const db = await wasm.openDatabase(pathOrBuffer);
  return db as unknown as Database;
}

export function closeDatabase(db: Database) {
  wasm.closeDatabase(asWasm(db));
}

export async function exportDatabase(db: Database): Promise<Uint8Array> {
  return wasm.exportDatabase(asWasm(db));
}
