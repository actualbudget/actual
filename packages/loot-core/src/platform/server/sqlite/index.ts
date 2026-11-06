import type {
  Database as SqlJsDatabase,
  Statement as SqlJsStatement,
} from '@jlongster/sql.js';

import * as legacy from './engine.sqljs.legacy';
import type {
  Database,
  SqliteEngine,
  SqlParam,
  Statement,
  TransactionOptions,
} from './types';

export type {
  Database,
  SqlParam,
  SqliteEngine,
  Statement,
  TransactionOptions,
} from './types';
// Used by the legacy filesystem layer and its tests
export { _getModule } from './engine.sqljs.legacy';
export type { SqlJsModule } from './engine.sqljs.legacy';

// The web sqlite module is a facade over an engine. The legacy sql.js
// build over absurd-sql is built in and the default; other engines (the
// official sqlite-wasm build) are registered by whichever entry point
// wants them, so a build that never imports one does not bundle it.
// Callers only see the opaque `Database` and `Statement` handles.

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

export type EngineName = 'legacy' | 'wasm';

const engines: Partial<Record<EngineName, SqliteEngine>> = {
  legacy: legacyEngine,
};

let activeEngine: SqliteEngine = legacyEngine;

export function registerEngine(name: EngineName, engine: SqliteEngine) {
  engines[name] = engine;
}

// The browser build of `@actual-app/api` embeds sql.js's wasm; the
// sqlite-wasm engine fetches its own file.
export function setWasmBinary(binary: ArrayBuffer | Uint8Array) {
  legacyEngine.setWasmBinary(binary);
}

export async function init({
  baseURL,
  wasmBinary,
  engine = 'legacy',
}: {
  baseURL?: string;
  wasmBinary?: ArrayBuffer | Uint8Array;
  engine?: EngineName;
} = {}): Promise<void> {
  const selected = engines[engine];
  if (selected == null) {
    throw new Error(`sqlite engine "${engine}" has not been registered`);
  }
  activeEngine = selected;
  await activeEngine.init({ baseURL, wasmBinary });
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
