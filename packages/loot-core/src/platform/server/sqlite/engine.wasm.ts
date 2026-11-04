import { logger } from '#platform/server/log';

import { getSqliteStore } from './storage';
import type { Database, SqliteEngine, SqlParam, Statement } from './types';
import {
  exportBytes,
  initSqlite3,
  installUserFunctions,
  openMemoryDatabase,
  setWasmBinary,
} from './wasm';
import type { PreparedStatement, WasmDatabase } from './wasm';

export type { WasmDatabase, PreparedStatement };

// sqlite engine over the official `@sqlite.org/sqlite-wasm` build, behind
// the facade in `index.ts`. File-backed databases are opened through the
// sqlite storage (OPFS, or IndexedDB as a whole file); `:memory:` and byte
// buffers live in memory. The module-level pieces (init, user functions,
// memory databases) live in `wasm.ts` so the storage layer can use them
// without importing the engine.

function asWasm(db: Database): WasmDatabase {
  return db as unknown as WasmDatabase;
}

function asWasmStatement(sql: string | Statement): string | PreparedStatement {
  return sql as unknown as string | PreparedStatement;
}

// Databases opened by path, so they can be closed through their store
const openPaths = new Map<WasmDatabase, string>();

function notifyWrite(db: WasmDatabase) {
  getSqliteStore().onWrite?.(db);
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

function prepare(db: Database, sql: string): Statement {
  return asWasm(db).prepare(sql) as unknown as Statement;
}

function finalizeStatement(statement: Statement) {
  (statement as unknown as PreparedStatement).finalize();
}

function runQuery<T>(
  db: Database,
  sql: string | Statement,
  params: SqlParam[],
  fetchAll: boolean,
): T[] | { changes: number } {
  verifyParamTypes(sql, params);

  const database = asWasm(db);
  const source = asWasmStatement(sql);
  const statement =
    typeof source === 'string' ? database.prepare(source) : source;

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
    notifyWrite(database);
    return { changes: database.changes() };
  } catch (error) {
    logger.log(sql);
    throw error;
  } finally {
    // Statements live in the wasm heap until finalized. Cached statements
    // are reset instead, with their bindings cleared for the next call.
    if (typeof source === 'string') {
      statement.finalize();
    } else {
      statement.reset(true);
    }
  }
}

function execQuery(db: Database, sql: string) {
  const database = asWasm(db);
  database.exec(sql);
  notifyWrite(database);
}

async function openDatabase(
  pathOrBuffer?: string | Uint8Array,
): Promise<Database> {
  let db: WasmDatabase;
  if (pathOrBuffer == null || pathOrBuffer === ':memory:') {
    db = openMemoryDatabase();
  } else if (typeof pathOrBuffer !== 'string') {
    db = openMemoryDatabase(pathOrBuffer);
  } else {
    db = await getSqliteStore().open(pathOrBuffer);
    openPaths.set(db, pathOrBuffer);
  }

  installUserFunctions(db);
  return db as unknown as Database;
}

function closeDatabase(db: Database) {
  const database = asWasm(db);
  const path = openPaths.get(database);
  if (path != null) {
    openPaths.delete(database);
    getSqliteStore().close(path, database);
  } else {
    database.close();
  }
}

async function exportDatabase(db: Database): Promise<Uint8Array> {
  return exportBytes(asWasm(db));
}

export const wasmEngine: SqliteEngine = {
  init: async options => {
    await initSqlite3(options);
  },
  setWasmBinary,
  prepare,
  finalizeStatement,
  runQuery,
  execQuery,
  openDatabase,
  closeDatabase,
  exportDatabase,
};
