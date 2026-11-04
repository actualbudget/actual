import sqlite3InitModule from '@sqlite.org/sqlite-wasm';
import type {
  PreparedStatement,
  Sqlite3Static,
  Database as WasmDatabase,
} from '@sqlite.org/sqlite-wasm';

import { logger } from '#platform/server/log';

import { normalise } from './normalise';
import { regexp } from './regexp';
import type { Database, SqliteEngine, SqlParam, Statement } from './types';
import { unicodeLike } from './unicodeLike';

export type { WasmDatabase, PreparedStatement };

// sqlite engine over the official `@sqlite.org/sqlite-wasm` build. It is
// not bundled unless something imports it and registers it with the
// facade in `index.ts` (`registerEngine('wasm', wasmEngine)`). File-backed
// databases arrive with the storage layer; for now only `:memory:` and
// byte buffers can be opened.

// The package types `init()` without parameters, but the runtime is the
// Emscripten module factory and accepts the usual module options.
type ModuleOptions = {
  locateFile?: (file: string) => string;
  wasmBinary?: ArrayBuffer | Uint8Array;
  print?: (...args: unknown[]) => void;
  printErr?: (...args: unknown[]) => void;
};
const initModule = sqlite3InitModule as unknown as (
  options?: ModuleOptions,
) => Promise<Sqlite3Static>;

let sqlite3: Sqlite3Static | null = null;
let initPromise: Promise<void> | null = null;

// Opt-in: when set, the wasm is instantiated from these bytes instead of
// being fetched via `locateFile`. The browser build of `@actual-app/api`
// uses this to ship a self-contained worker.
let wasmBinaryOverride: ArrayBuffer | Uint8Array | undefined;

function asWasm(db: Database): WasmDatabase {
  return db as unknown as WasmDatabase;
}

function asWasmStatement(sql: string | Statement): string | PreparedStatement {
  return sql as unknown as string | PreparedStatement;
}

function setWasmBinary(binary: ArrayBuffer | Uint8Array) {
  wasmBinaryOverride = binary;
}

function init({
  baseURL = process.env.PUBLIC_URL,
  wasmBinary = wasmBinaryOverride,
}: { baseURL?: string; wasmBinary?: ArrayBuffer | Uint8Array } = {}) {
  if (initPromise) {
    return initPromise;
  }

  // Only the memory VFS (and, later, opfs-sahpool) are used. Disabling
  // the others keeps the library from touching SharedArrayBuffer,
  // spawning its async proxy worker, or reading localStorage.
  (globalThis as { sqlite3ApiConfig?: unknown }).sqlite3ApiConfig = {
    disable: { vfs: { opfs: true, 'opfs-wl': true, kvvfs: true } },
  };

  initPromise = initModule({
    // The wasm is emitted next to the backend worker bundle (see
    // vite.config.mts), so it is served from `kcab/` and precached with it
    locateFile: () => `${baseURL ?? ''}kcab/sqlite3.wasm`,
    ...(wasmBinary ? { wasmBinary } : {}),
    print: (...args) => logger.log(...args),
    printErr: (...args) => logger.error(...args),
  }).then(
    module => {
      sqlite3 = module;
    },
    error => {
      // Let a later call retry instead of caching the failure
      initPromise = null;
      throw error;
    },
  );
  return initPromise;
}

function getSqlite3(): Sqlite3Static {
  if (sqlite3 == null) {
    throw new Error('sqlite-wasm must be initialized first');
  }
  return sqlite3;
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
  asWasm(db).exec(sql);
}

type ScalarFunction = (...args: Array<string | null>) => unknown;

function defineFunction(
  db: WasmDatabase,
  name: string,
  arity: number,
  fn: ScalarFunction,
) {
  db.createFunction(name, {
    arity,
    deterministic: true,
    xFunc: (_context, ...args) => {
      // The app only passes text or NULL to these functions; SqlValue is
      // wider (numbers, blobs) but narrowing it here keeps the helpers plain
      const result = fn(...(args as Array<string | null>));
      // SQL NULL is `null`; `undefined` is not a valid result
      return (result ?? null) as string | number | null;
    },
  });
}

// Unicode-aware LOWER, UPPER and LIKE, plus REGEXP and NORMALISE. The
// build has no ICU, and the app's queries rely on these names.
function installUserFunctions(db: WasmDatabase) {
  defineFunction(db, 'UNICODE_LOWER', 1, value => value?.toLowerCase());
  defineFunction(db, 'UNICODE_UPPER', 1, value => value?.toUpperCase());
  defineFunction(db, 'UNICODE_LIKE', 2, (pattern, value) =>
    unicodeLike(pattern, value),
  );
  defineFunction(db, 'REGEXP', 2, (pattern, text) => regexp(pattern, text));
  defineFunction(db, 'NORMALISE', 1, value => normalise(value));
}

function pointerOf(db: WasmDatabase): number {
  if (db.pointer == null) {
    throw new Error('sqlite: database is closed');
  }
  return db.pointer;
}

async function openDatabase(
  pathOrBuffer?: string | Uint8Array,
): Promise<Database> {
  if (typeof pathOrBuffer === 'string' && pathOrBuffer !== ':memory:') {
    throw new Error(
      `openDatabase: file-backed databases are not supported by the sqlite-wasm engine yet (${pathOrBuffer})`,
    );
  }

  const { oo1, wasm, capi } = getSqlite3();
  const db = new oo1.DB(':memory:', 'c');
  if (typeof pathOrBuffer !== 'string' && pathOrBuffer?.byteLength) {
    // The bytes may be a view from another realm (worker message, jsdom)
    // and the allocator checks the constructor, so re-wrap them here
    const view = new Uint8Array(
      pathOrBuffer.buffer,
      pathOrBuffer.byteOffset,
      pathOrBuffer.byteLength,
    );
    // `sqlite3_deserialize` takes ownership of the buffer (FREEONCLOSE),
    // so it has to come from sqlite's own allocator.
    const pointer = wasm.allocFromTypedArray(view);
    const rc = capi.sqlite3_deserialize(
      pointerOf(db),
      'main',
      pointer,
      view.byteLength,
      view.byteLength,
      capi.SQLITE_DESERIALIZE_FREEONCLOSE | capi.SQLITE_DESERIALIZE_RESIZEABLE,
    );
    if (rc !== 0) {
      db.close();
      throw new Error(
        `openDatabase: sqlite3_deserialize failed: ${capi.sqlite3_js_rc_str(rc)}`,
      );
    }
  }

  installUserFunctions(db);
  return db as unknown as Database;
}

function closeDatabase(db: Database) {
  asWasm(db).close();
}

// The bytes of the database file, whether it lives in memory or on disk
async function exportDatabase(db: Database): Promise<Uint8Array> {
  return getSqlite3().capi.sqlite3_js_db_export(pointerOf(asWasm(db)));
}

export const wasmEngine: SqliteEngine = {
  init,
  setWasmBinary,
  prepare,
  finalizeStatement,
  runQuery,
  execQuery,
  openDatabase,
  closeDatabase,
  exportDatabase,
};
