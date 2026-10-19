import { logger } from '#platform/server/log';

import { getSqliteStore, hasSqliteStore } from './storage';
import type { SqlParam } from './types';
import {
  exportBytes,
  initSqlite3,
  installUserFunctions,
  openMemoryDatabase,
  setWasmBinary as setModuleWasmBinary,
} from './wasm';
import type { InitOptions, PreparedStatement, WasmDatabase } from './wasm';

export type { WasmDatabase, PreparedStatement };

// sqlite engine over the official `@sqlite.org/sqlite-wasm` build. The
// call shapes mirror the legacy sql.js engine so the facade in `index.ts`
// can forward to either. File-backed databases are opened through the
// sqlite storage (OPFS, or IndexedDB as a whole file); `:memory:` and byte
// buffers live in memory. The module-level pieces (init, user functions,
// memory databases) live in `wasm.ts` so the storage layer can use them
// without importing the engine.

// Databases opened by path, so they can be closed through their store
const openPaths = new Map<WasmDatabase, string>();

function notifyWrite(db: WasmDatabase) {
  if (hasSqliteStore()) {
    getSqliteStore().onWrite?.(db);
  }
}

export function setWasmBinary(binary: ArrayBuffer | Uint8Array) {
  setModuleWasmBinary(binary);
}

export async function init(options: InitOptions = {}): Promise<void> {
  await initSqlite3(options);
}

function verifyParamTypes(sql: string | PreparedStatement, params: SqlParam[]) {
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

export function prepare(db: WasmDatabase, sql: string): PreparedStatement {
  return db.prepare(sql);
}

export function finalizeStatement(statement: PreparedStatement) {
  statement.finalize();
}

export function runQuery(
  db: WasmDatabase,
  sql: string | PreparedStatement,
  params?: SqlParam[],
  fetchAll?: false,
): { changes: number };
export function runQuery<T>(
  db: WasmDatabase,
  sql: string | PreparedStatement,
  params: SqlParam[],
  fetchAll: true,
): T[];
export function runQuery<T>(
  db: WasmDatabase,
  sql: string | PreparedStatement,
  params: SqlParam[] = [],
  fetchAll = false,
): T[] | { changes: number } {
  verifyParamTypes(sql, params);

  const statement = typeof sql === 'string' ? db.prepare(sql) : sql;

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
    notifyWrite(db);
    return { changes: db.changes() };
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

export function execQuery(db: WasmDatabase, sql: string) {
  db.exec(sql);
  notifyWrite(db);
}

export async function openDatabase(
  pathOrBuffer?: string | Uint8Array,
): Promise<WasmDatabase> {
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
  return db;
}

export function closeDatabase(db: WasmDatabase) {
  const path = openPaths.get(db);
  if (path != null) {
    openPaths.delete(db);
    getSqliteStore().close(path, db);
  } else {
    db.close();
  }
}

export async function exportDatabase(db: WasmDatabase): Promise<Uint8Array> {
  return exportBytes(db);
}
