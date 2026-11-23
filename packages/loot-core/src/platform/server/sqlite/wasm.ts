import sqlite3InitModule from '@sqlite.org/sqlite-wasm';
import type {
  PreparedStatement,
  Sqlite3Static,
  Database as WasmDatabase,
} from '@sqlite.org/sqlite-wasm';

import { logger } from '#platform/server/log';

import { normalise } from './normalise';
import { regexp } from './regexp';
import { unicodeLike } from './unicodeLike';

export type { WasmDatabase, PreparedStatement };

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
let initPromise: Promise<Sqlite3Static> | null = null;

// Opt-in: when set, the wasm is instantiated from these bytes instead of
// being fetched via `locateFile`. The browser build of `@actual-app/api`
// uses this to ship a self-contained worker.
let wasmBinaryOverride: ArrayBuffer | Uint8Array | undefined;

export function setWasmBinary(binary: ArrayBuffer | Uint8Array) {
  wasmBinaryOverride = binary;
}

export type InitOptions = {
  baseURL?: string;
  wasmBinary?: ArrayBuffer | Uint8Array;
};

// The wasm is emitted next to the backend worker bundle, so it is served
// from the same `kcab/` directory and precached with it.
export const WASM_FILE_PATH = 'kcab/sqlite3.wasm';

function isStepWarning(args: unknown[]): boolean {
  return (
    typeof args[0] === 'string' && args[0].startsWith('sqlite3_step() rc=')
  );
}

export function initSqlite3({
  baseURL = process.env.PUBLIC_URL,
  wasmBinary = wasmBinaryOverride,
}: InitOptions = {}): Promise<Sqlite3Static> {
  if (initPromise) {
    return initPromise;
  }

  // Only the memory VFS and opfs-sahpool are used. Disabling the others
  // keeps the library from touching SharedArrayBuffer, spawning its async
  // proxy worker, or reading localStorage.
  (globalThis as { sqlite3ApiConfig?: unknown }).sqlite3ApiConfig = {
    disable: { vfs: { opfs: true, 'opfs-wl': true, kvvfs: true } },
    warn: (...args: unknown[]) => {
      // The oo1 API warns before it throws for a failed statement. Sync
      // applies messages as insert-then-update, so the constraint failures
      // are expected and the error is still thrown; log everything else.
      if (!isStepWarning(args)) {
        logger.warn(...args);
      }
    },
  };

  initPromise = initModule({
    locateFile: () => `${baseURL ?? ''}${WASM_FILE_PATH}`,
    ...(wasmBinary ? { wasmBinary } : {}),
    print: (...args) => logger.log(...args),
    printErr: (...args) => logger.error(...args),
  }).then(
    module => {
      sqlite3 = module;
      return module;
    },
    error => {
      // Let a later call retry instead of caching the failure
      initPromise = null;
      throw error;
    },
  );
  return initPromise;
}

export function getSqlite3(): Sqlite3Static {
  if (sqlite3 == null) {
    throw new Error('getSqlite3: sqlite-wasm must be initialized first');
  }
  return sqlite3;
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
      const result = fn(...(args as Array<string | null>));
      // SQL NULL is `null`; `undefined` is not a valid result
      return (result ?? null) as string | number | null;
    },
  });
}

// Unicode-aware LOWER, UPPER and LIKE, plus REGEXP and NORMALISE. The
// build has no ICU, and the app's queries rely on these names.
export function installUserFunctions(db: WasmDatabase) {
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

// An in-memory database, optionally loaded from the bytes of a database
// file (imports, uploads, the bundled default database).
export function openMemoryDatabase(bytes?: Uint8Array): WasmDatabase {
  const { oo1, wasm, capi } = getSqlite3();
  const db = new oo1.DB(':memory:', 'c');
  if (bytes && bytes.byteLength > 0) {
    // The bytes may be a view from another realm (worker message, jsdom);
    // the allocator checks the constructor, so re-wrap them here
    const view = new Uint8Array(
      bytes.buffer,
      bytes.byteOffset,
      bytes.byteLength,
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
        `openMemoryDatabase: sqlite3_deserialize failed: ${capi.sqlite3_js_rc_str(rc)}`,
      );
    }
  }
  return db;
}

// The bytes of a database file, whether it lives in memory or on disk.
export function exportBytes(db: WasmDatabase): Uint8Array {
  return getSqlite3().capi.sqlite3_js_db_export(pointerOf(db));
}
