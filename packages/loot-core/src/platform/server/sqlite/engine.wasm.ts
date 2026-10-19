import { logger } from '#platform/server/log';

import type {
  Database,
  SqlParam,
  Statement,
  TransactionOptions,
} from './types';
import {
  exportBytes,
  initSqlite3,
  installUserFunctions,
  openMemoryDatabase,
  setWasmBinary as setModuleWasmBinary,
} from './wasm';
import type { InitOptions, PreparedStatement, WasmDatabase } from './wasm';

// sqlite engine over the official `@sqlite.org/sqlite-wasm` build. The
// call shapes mirror the legacy sql.js engine so `server/db` and friends
// do not change. File-backed databases arrive with the storage layer; for
// now only `:memory:` and byte buffers can be opened.

function asWasm(db: Database): WasmDatabase {
  return db as unknown as WasmDatabase;
}

function asStatement(statement: Statement): PreparedStatement {
  return statement as unknown as PreparedStatement;
}

export function setWasmBinary(binary: ArrayBuffer | Uint8Array) {
  setModuleWasmBinary(binary);
}

export async function init(options: InitOptions = {}): Promise<void> {
  await initSqlite3(options);
}

function verifyParamTypes(sql: string | Statement, params: SqlParam[]) {
  for (const value of params) {
    if (
      typeof value !== 'string' &&
      typeof value !== 'number' &&
      value !== null
    ) {
      throw new Error('Invalid field type ' + value + ' for sql ' + sql);
    }
  }
}

export function prepare(db: Database, sql: string): Statement {
  return asWasm(db).prepare(sql) as unknown as Statement;
}

export function finalizeStatement(statement: Statement) {
  asStatement(statement).finalize();
}

export function runQuery(
  db: Database,
  sql: string | Statement,
  params?: SqlParam[],
  fetchAll?: false,
): { changes: number };
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
): T[] | { changes: number } {
  verifyParamTypes(sql, params);

  const database = asWasm(db);
  const statement =
    typeof sql === 'string' ? database.prepare(sql) : asStatement(sql);

  try {
    if (params.length > 0) {
      statement.bind(params);
    }

    if (fetchAll) {
      const columns = statement.getColumnNames();
      const rows: T[] = [];
      while (statement.step()) {
        const values = statement.get([]);
        const row: Record<string, unknown> = {};
        for (let index = 0; index < columns.length; index++) {
          row[columns[index]] = values[index];
        }
        rows.push(row as T);
      }
      return rows;
    }

    statement.step();
    return { changes: database.changes() };
  } catch (error) {
    logger.log(sql);
    throw error;
  } finally {
    // Statements live in the wasm heap until finalized. Cached statements
    // are reset instead, with their bindings cleared for the next call.
    if (typeof sql === 'string') {
      statement.finalize();
    } else {
      statement.reset(true);
    }
  }
}

export function execQuery(db: Database, sql: string) {
  asWasm(db).exec(sql);
}

let transactionDepth = 0;

export function transaction(
  db: Database,
  fn: () => void,
  { immediate = false }: TransactionOptions = {},
) {
  let before: string;
  let after: string;
  let undo: string;
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
  } catch (error) {
    execQuery(db, undo);

    if (undo !== 'ROLLBACK') {
      execQuery(db, after);
    }

    throw error;
  } finally {
    transactionDepth--;
  }
}

// See the comment about this function in index.electron.ts. You
// shouldn't normally use this.
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
  let db: WasmDatabase;
  if (pathOrBuffer == null || pathOrBuffer === ':memory:') {
    db = openMemoryDatabase();
  } else if (typeof pathOrBuffer !== 'string') {
    // Bytes may come from another realm (a worker message, jsdom), so
    // avoid `instanceof Uint8Array`
    db = openMemoryDatabase(pathOrBuffer);
  } else {
    throw new Error(
      `openDatabase: file-backed databases are not supported by the sqlite-wasm engine yet (${pathOrBuffer})`,
    );
  }

  installUserFunctions(db);
  return db as unknown as Database;
}

export function closeDatabase(db: Database) {
  asWasm(db).close();
}

export async function exportDatabase(db: Database): Promise<Uint8Array> {
  return exportBytes(asWasm(db));
}
