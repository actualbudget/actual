import type {
  Database as SqlJsDatabase,
  Statement as SqlJsStatement,
} from '@jlongster/sql.js';

import * as legacy from './engine.sqljs.legacy';
import { wasmEngine } from './engine.wasm';
import { getSqliteStore, initSqliteStorage, revertToLegacy } from './storage';
import { hasMigratedSqliteFiles } from './storage/files-store';
import type {
  Database,
  SqliteEngine,
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
// build over absurd-sql, and the official sqlite-wasm build on the sqlite
// storage. `init` picks one from the storage backend; everything else
// forwards to it. Callers only see the opaque `Database` and `Statement`
// handles from `./types`.

function asSqlJs(db: Database): SqlJsDatabase {
  return db as unknown as SqlJsDatabase;
}

function asSqlJsStatement(sql: string | Statement): string | SqlJsStatement {
  return sql as unknown as string | SqlJsStatement;
}

const legacyEngine: SqliteEngine = {
  init: async options => {
    await legacy.init(options);
  },
  setWasmBinary: binary => legacy.setWasmBinary(binary),
  prepare: (db, sql) =>
    legacy.prepare(asSqlJs(db), sql) as unknown as Statement,
  finalizeStatement: statement =>
    (statement as unknown as SqlJsStatement).free(),
  runQuery: <T>(
    db: Database,
    sql: string | Statement,
    params: SqlParam[],
    fetchAll: boolean,
  ) =>
    fetchAll
      ? legacy.runQuery<T>(asSqlJs(db), asSqlJsStatement(sql), params, true)
      : legacy.runQuery(asSqlJs(db), asSqlJsStatement(sql), params, false),
  execQuery: (db, sql) => legacy.execQuery(asSqlJs(db), sql),
  openDatabase: async pathOrBuffer =>
    (await legacy.openDatabase(pathOrBuffer)) as unknown as Database,
  closeDatabase: db => legacy.closeDatabase(asSqlJs(db)),
  exportDatabase: db => legacy.exportDatabase(asSqlJs(db)),
};

let activeEngine: SqliteEngine = legacyEngine;
let activeBackend: StorageBackend = 'legacy';

// Opt-in: the browser build of `@actual-app/api` embeds the wasm of the
// engine it ships and hands it over here before `init`, so the engine is
// instantiated from these bytes instead of fetching them.
let wasmBinaryOverride: ArrayBuffer | Uint8Array | undefined;

export function setWasmBinary(binary: ArrayBuffer | Uint8Array) {
  wasmBinaryOverride = binary;
}

// Starts the engine for the requested storage and resolves to the backend
// actually in use: data already moved to the new storage wins over a
// `legacy` request and data held in OPFS over a `memory-idb` one, so a
// cleared or stale flag never shows an empty app, and `opfs` falls back to
// `memory-idb` where sync access handles are unavailable.
export async function init({
  baseURL,
  wasmBinary,
  storage = 'legacy',
}: {
  baseURL?: string;
  wasmBinary?: ArrayBuffer | Uint8Array;
  storage?: StorageBackend;
} = {}): Promise<StorageBackend> {
  // The legacy engine reads neither store's data and the fallback cannot
  // read OPFS pools, while the OPFS store adopts the fallback's rows, so
  // data the requested engine could not read means asking for OPFS instead
  // (which itself falls back where sync access handles are missing)
  const requested =
    (storage === 'legacy' && (await hasMigratedSqliteFiles())) ||
    (storage === 'memory-idb' && (await hasMigratedSqliteFiles('opfs')))
      ? 'opfs'
      : storage;
  if (requested === 'legacy') {
    activeEngine = legacyEngine;
    await legacyEngine.init({
      baseURL,
      wasmBinary: wasmBinary ?? wasmBinaryOverride,
    });
    activeBackend = 'legacy';
  } else {
    activeEngine = wasmEngine;
    await wasmEngine.init({
      baseURL,
      wasmBinary: wasmBinary ?? wasmBinaryOverride,
    });
    activeBackend = await initSqliteStorage(requested);
  }
  return activeBackend;
}

export function getStorageBackend(): StorageBackend {
  return activeBackend;
}

// Persist anything pending (the IndexedDB fallback writes lazily)
export async function flushSqliteStorage(): Promise<void> {
  if (activeBackend !== 'legacy') {
    await getSqliteStore().flush();
  }
}

// Let go of storage handles and locks, so another worker can take over or
// so a page that is leaving holds nothing back
export async function releaseSqliteStorage(): Promise<void> {
  if (activeBackend === 'legacy') {
    legacy.releaseBudgetLocks();
  } else {
    await getSqliteStore().releaseAll();
  }
}

// Move every budget back to absurd-sql's layout (the opt-in phase's way
// back); the next start then picks the legacy engine
export async function revertSqliteStorageToLegacy(): Promise<void> {
  if (activeBackend !== 'legacy') {
    await revertToLegacy();
  }
}

export function prepare(db: Database, sql: string): Statement {
  return activeEngine.prepare(db, sql);
}

// Frees a prepared statement that is no longer needed (for example when
// it is evicted from a statement cache). Closing the database also frees
// its statements, so this is only an optimisation for long sessions.
export function finalizeStatement(statement: Statement) {
  activeEngine.finalizeStatement(statement);
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
  return activeEngine.runQuery<T>(db, sql, params, fetchAll);
}

export function execQuery(db: Database, sql: string) {
  activeEngine.execQuery(db, sql);
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
  return activeEngine.openDatabase(pathOrBuffer);
}

export function closeDatabase(db: Database) {
  activeEngine.closeDatabase(db);
}

export async function exportDatabase(db: Database): Promise<Uint8Array> {
  return activeEngine.exportDatabase(db);
}
