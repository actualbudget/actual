import { logger } from '#platform/server/log';

import { getSqliteStore } from './storage';
import type { Database, SqliteEngine, SqlParam, Statement } from './types';
import {
  exportBytes,
  getSqlite3,
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

// Writes can return rows too (RETURNING, pragmas that set a value), so a
// fetch tells the store unless sqlite says the statement is read-only
function isReadOnly(statement: PreparedStatement): boolean {
  return (
    statement.pointer != null &&
    getSqlite3().capi.sqlite3_stmt_readonly(statement.pointer) !== 0
  );
}

function verifyParamTypes(sql: string | Statement, params: SqlParam[]) {
  for (const value of params) {
    // Byte arrays can come from another realm, including TextEncoder output.
    if (
      typeof value !== 'string' &&
      typeof value !== 'number' &&
      !(
        ArrayBuffer.isView(value) &&
        Object.prototype.toString.call(value) === '[object Uint8Array]'
      ) &&
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
      // sqlite-wasm only binds this realm's byte arrays, so copy the others.
      statement.bind(
        params.map(value =>
          ArrayBuffer.isView(value) && !(value instanceof Uint8Array)
            ? Uint8Array.from(value)
            : value,
        ),
      );
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
    // Told even after a failure: a statement can leave changes behind
    // (OR FAIL keeps the rows inserted before the conflict)
    if (!fetchAll || !isReadOnly(statement)) {
      notifyWrite(database);
    }
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
  try {
    database.exec(sql);
  } finally {
    // A script can fail after its earlier statements were committed
    notifyWrite(database);
  }
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
