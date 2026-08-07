import type {
  Database,
  PreparedStatement,
  SAHPoolUtil,
  Sqlite3Static,
  SqlValue,
} from '@sqlite.org/sqlite-wasm';

import { getBudgetDir, getDocumentDir } from '#platform/server/fs/shared';
import { logger } from '#platform/server/log';
import { loadSqliteInitModule } from '#platform/server/sqlite/sqlite-module';

import {
  deleteLegacyDatabase,
  fenceLegacyDatabase,
  hasLegacyDatabase,
  openLegacyDatabaseReader,
} from './legacy-idb';
import { normalise } from './normalise';
import type { SqlParam } from './types';
import { unicodeLike } from './unicodeLike';

export type { Database, PreparedStatement as Statement };
export type { SqlParam } from './types';

type Query = string | PreparedStatement;

type SqliteInitOptions = {
  locateFile?: (filename: string) => string;
  wasmBinary?: ArrayBuffer | Uint8Array;
};

type SqliteApiConfig = {
  disable?: {
    vfs?: Record<string, boolean>;
  };
  [key: string]: unknown;
};

type PoolState = {
  budgetId: string;
  pool: SAHPoolUtil | null;
  activation: Promise<SAHPoolUtil> | null;
  refs: number;
  installAttempt: number;
};

type TrackedDatabase = {
  path: string;
  state: PoolState;
};

const INITIAL_POOL_CAPACITY = 16;
const ACTIVATION_RETRY_DELAYS = [0, 50, 100, 200, 400];
const VFS_SESSION_ID = crypto.randomUUID().slice(0, 8);

let sqlite3: Sqlite3Static | null = null;
let initPromise: Promise<void> | null = null;
let wasmBinaryOverride: ArrayBuffer | Uint8Array | undefined;

const poolStates = new Map<string, PoolState>();
const trackedDatabases = new WeakMap<Database, TrackedDatabase>();
const openDatabases = new Map<string, Database>();
const migrations = new Map<string, Promise<void>>();

export async function init() {
  if (initPromise === null) {
    initPromise = initializeSqlite();
  }
  await initPromise;
}

async function initializeSqlite() {
  const configuredPublicUrl = process.env.PUBLIC_URL ?? '/';
  const publicUrl = configuredPublicUrl.endsWith('/')
    ? configuredPublicUrl
    : `${configuredPublicUrl}/`;
  const sqliteGlobal = globalThis as typeof globalThis & {
    sqlite3ApiConfig?: SqliteApiConfig;
  };
  const previousApiConfig = sqliteGlobal.sqlite3ApiConfig;
  const configuredApiConfig: SqliteApiConfig = {
    ...previousApiConfig,
    disable: {
      ...previousApiConfig?.disable,
      vfs: {
        ...previousApiConfig?.disable?.vfs,
        // These VFSes require SharedArrayBuffer. Actual installs only the
        // synchronous-access-handle pool VFS below.
        opfs: true,
        'opfs-wl': true,
      },
    },
  };
  sqliteGlobal.sqlite3ApiConfig = configuredApiConfig;

  try {
    const initSqlite = (await loadSqliteInitModule(publicUrl)) as (
      options: SqliteInitOptions,
    ) => Promise<Sqlite3Static>;
    sqlite3 = await initSqlite({
      locateFile: filename => `${publicUrl}kcab/${filename}`,
      ...(wasmBinaryOverride === undefined
        ? {}
        : { wasmBinary: wasmBinaryOverride }),
    });
  } finally {
    // SQLite deletes this bootstrap-only global on success. Restore it if
    // initialization failed before SQLite had a chance to do so.
    if (sqliteGlobal.sqlite3ApiConfig === configuredApiConfig) {
      if (previousApiConfig === undefined) {
        delete sqliteGlobal.sqlite3ApiConfig;
      } else {
        sqliteGlobal.sqlite3ApiConfig = previousApiConfig;
      }
    }
  }
}

export function setWasmBinary(binary: ArrayBuffer | Uint8Array) {
  wasmBinaryOverride = binary;
}

function getSqlite() {
  if (sqlite3 === null) {
    throw new Error('SQLite must be initialized before use');
  }
  return sqlite3;
}

function normalizeDatabasePath(path: string) {
  const absolutePath = path.startsWith('/') ? path : `/${path}`;
  return absolutePath.replace(/\/+$/, '') || '/';
}

function getPoolState(path: string) {
  const normalizedPath = normalizeDatabasePath(path);
  const documentDir = normalizeDatabasePath(getDocumentDir());
  if (!normalizedPath.startsWith(`${documentDir}/`)) {
    throw new Error(`Database is outside the document directory: ${path}`);
  }

  const relativePath = normalizedPath.slice(documentDir.length + 1);
  const separator = relativePath.indexOf('/');
  if (separator <= 0 || separator === relativePath.length - 1) {
    throw new Error(`Database path does not identify a budget: ${path}`);
  }

  const budgetId = relativePath.slice(0, separator);
  const budgetDir = normalizeDatabasePath(getBudgetDir(budgetId));
  if (!normalizedPath.startsWith(`${budgetDir}/`)) {
    throw new Error(
      `Database path does not belong to budget ${budgetId}: ${path}`,
    );
  }

  let state = poolStates.get(budgetId);
  if (state === undefined) {
    state = {
      budgetId,
      pool: null,
      activation: null,
      refs: 0,
      installAttempt: 0,
    };
    poolStates.set(budgetId, state);
  }
  return { path: normalizedPath, state };
}

function supportsSahPool() {
  return (
    typeof globalThis.FileSystemHandle !== 'undefined' &&
    typeof globalThis.FileSystemDirectoryHandle !== 'undefined' &&
    typeof globalThis.FileSystemFileHandle !== 'undefined' &&
    'createSyncAccessHandle' in globalThis.FileSystemFileHandle.prototype &&
    typeof navigator !== 'undefined' &&
    typeof navigator.storage?.getDirectory === 'function'
  );
}

function wait(delay: number) {
  return new Promise(resolve => setTimeout(resolve, delay));
}

async function activatePool(state: PoolState) {
  if (!supportsSahPool()) {
    throw new Error('opfs-sahpool-unavailable: required OPFS APIs are missing');
  }

  let lastError: unknown;
  for (const delay of ACTIVATION_RETRY_DELAYS) {
    if (delay > 0) {
      await wait(delay);
    }

    try {
      if (state.pool === null) {
        const attempt = state.installAttempt++;
        state.pool = await getSqlite().installOpfsSAHPoolVfs({
          directory: `.actual-budget/${state.budgetId}`,
          initialCapacity: INITIAL_POOL_CAPACITY,
          name: `actual-sah-${state.budgetId}-${VFS_SESSION_ID}-${attempt}`,
        });
      } else if (state.pool.isPaused()) {
        await state.pool.unpauseVfs();
      }
      return state.pool;
    } catch (error) {
      lastError = error;
    }
  }

  throw new Error(
    `opfs-sahpool-budget-in-use: budget ${state.budgetId} is open in another context`,
    { cause: lastError },
  );
}

async function acquirePool(state: PoolState) {
  state.refs++;
  try {
    if (state.pool !== null && !state.pool.isPaused()) {
      return state.pool;
    }
    if (state.activation === null) {
      const activation = activatePool(state).finally(() => {
        if (state.activation === activation) {
          state.activation = null;
        }
      });
      state.activation = activation;
    }
    return await state.activation;
  } catch (error) {
    state.refs--;
    throw error;
  }
}

function releasePool(state: PoolState) {
  state.refs--;
  if (state.refs !== 0 || state.pool === null || state.pool.isPaused()) {
    return;
  }

  try {
    state.pool.pauseVfs();
  } catch (error) {
    logger.error(`Unable to pause SAH pool for ${state.budgetId}`, error);
  }
}

async function withPool<T>(
  path: string,
  operation: (pool: SAHPoolUtil, normalizedPath: string) => T | Promise<T>,
) {
  const resolved = getPoolState(path);
  const pool = await acquirePool(resolved.state);
  try {
    return await operation(pool, resolved.path);
  } finally {
    releasePool(resolved.state);
  }
}

function unlinkDatabaseFiles(pool: SAHPoolUtil, path: string) {
  const allocatedPaths = new Set(pool.getFileNames());
  for (const candidate of [
    path,
    `${path}-journal`,
    `${path}-wal`,
    `${path}-shm`,
  ]) {
    if (allocatedPaths.has(candidate)) {
      pool.unlink(candidate);
    }
  }
}

function unlinkDatabaseSidecars(pool: SAHPoolUtil, path: string) {
  const allocatedPaths = new Set(pool.getFileNames());
  for (const candidate of [`${path}-journal`, `${path}-wal`, `${path}-shm`]) {
    if (allocatedPaths.has(candidate)) {
      pool.unlink(candidate);
    }
  }
}

function validateDatabase(pool: SAHPoolUtil, path: string) {
  const database = new pool.OpfsSAHPoolDb(path);
  try {
    const result = database.selectValue('PRAGMA quick_check');
    if (result !== 'ok') {
      throw new Error(
        `legacy-database-invalid: quick_check failed for ${path}: ${String(result)}`,
      );
    }
  } finally {
    database.close();
  }
}

async function deleteLegacyDatabaseBestEffort(path: string) {
  try {
    await deleteLegacyDatabase(path);
  } catch (error) {
    logger.warn(`Unable to remove migrated absurd-sql database ${path}`, error);
  }
}

async function migrateDatabase(path: string) {
  const normalizedPath = normalizeDatabasePath(path);
  let migration = migrations.get(normalizedPath);
  if (migration !== undefined) {
    return await migration;
  }

  migration = withPool(normalizedPath, async pool => {
    const hasPoolDatabase = pool.getFileNames().includes(normalizedPath);
    const hasLegacy = await hasLegacyDatabase(normalizedPath);

    if (hasPoolDatabase) {
      if (hasLegacy) {
        try {
          validateDatabase(pool, normalizedPath);
          await deleteLegacyDatabaseBestEffort(normalizedPath);
          return;
        } catch {
          unlinkDatabaseFiles(pool, normalizedPath);
        }
      } else {
        return;
      }
    }

    if (!hasLegacy) {
      throw new Error(`opfs-database-missing: ${normalizedPath}`);
    }

    const reader = await openLegacyDatabaseReader(normalizedPath);
    if (reader === null) {
      throw new Error(`legacy-database-missing: ${normalizedPath}`);
    }

    try {
      await pool.importDb(normalizedPath, reader.readNext);
      validateDatabase(pool, normalizedPath);
    } catch (error) {
      unlinkDatabaseFiles(pool, normalizedPath);
      throw error;
    } finally {
      reader.close();
    }

    await deleteLegacyDatabaseBestEffort(normalizedPath);
  }).finally(() => {
    migrations.delete(normalizedPath);
  });
  migrations.set(normalizedPath, migration);
  await migration;
}

async function openPersistentDatabase(path: string) {
  const resolved = getPoolState(path);
  await migrateDatabase(resolved.path);
  if (openDatabases.has(resolved.path)) {
    throw new Error(`Database is already open: ${resolved.path}`);
  }

  const pool = await acquirePool(resolved.state);
  try {
    if (!pool.getFileNames().includes(resolved.path)) {
      throw new Error(`opfs-database-missing: ${resolved.path}`);
    }
    const database = new pool.OpfsSAHPoolDb(resolved.path);
    openDatabases.set(resolved.path, database);
    trackedDatabases.set(database, resolved);
    return database;
  } catch (error) {
    releasePool(resolved.state);
    throw error;
  }
}

export async function exportDatabasePath(path: string) {
  const normalizedPath = normalizeDatabasePath(path);
  await migrateDatabase(normalizedPath);

  const openDatabase = openDatabases.get(normalizedPath);
  if (openDatabase !== undefined) {
    return exportDatabase(openDatabase);
  }

  return await withPool(normalizedPath, (pool, poolPath) => {
    if (!pool.getFileNames().includes(poolPath)) {
      throw new Error(`opfs-database-missing: ${poolPath}`);
    }
    const database = new pool.OpfsSAHPoolDb(poolPath);
    try {
      database.exec('PRAGMA locking_mode=EXCLUSIVE');
      database.exec('PRAGMA wal_checkpoint(TRUNCATE)');
      return exportDatabase(database);
    } finally {
      database.close();
    }
  });
}

export async function importDatabasePath(path: string, contents: Uint8Array) {
  const normalizedPath = normalizeDatabasePath(path);
  if (openDatabases.has(normalizedPath)) {
    throw new Error(`Cannot replace an open database: ${normalizedPath}`);
  }

  await fenceLegacyDatabase(normalizedPath);
  await withPool(normalizedPath, async (pool, poolPath) => {
    unlinkDatabaseSidecars(pool, poolPath);
    await pool.importDb(poolPath, contents);
  });
  await deleteLegacyDatabaseBestEffort(normalizedPath);
}

export async function removeDatabasePath(path: string) {
  const normalizedPath = normalizeDatabasePath(path);
  if (openDatabases.has(normalizedPath)) {
    throw new Error(`Cannot remove an open database: ${normalizedPath}`);
  }

  const hadLegacyDatabase = await hasLegacyDatabase(normalizedPath);
  if (hadLegacyDatabase) {
    await deleteLegacyDatabase(normalizedPath);
  }

  if (!supportsSahPool()) {
    if (hadLegacyDatabase) {
      return;
    }
    throw new Error('opfs-sahpool-unavailable: required OPFS APIs are missing');
  }

  await withPool(normalizedPath, (pool, poolPath) => {
    unlinkDatabaseFiles(pool, poolPath);
  });
}

function verifyParamTypes(sql: Query, params: SqlParam[]) {
  for (const value of params) {
    if (
      typeof value !== 'string' &&
      typeof value !== 'number' &&
      value !== null
    ) {
      const queryDescription =
        typeof sql === 'string' ? sql : '<prepared statement>';
      throw new Error(
        `Invalid field type ${typeof value} for sql ${queryDescription}`,
      );
    }
  }
}

export function prepare(db: Database, sql: string) {
  return db.prepare(sql);
}

export function finalizeStatement(statement: PreparedStatement) {
  statement.finalize();
}

export function runQuery(
  db: Database,
  sql: Query,
  params?: SqlParam[] | null,
  fetchAll?: false,
): { changes: unknown };
export function runQuery<T>(
  db: Database,
  sql: Query,
  params: SqlParam[] | null | undefined,
  fetchAll: true,
): T[];
export function runQuery<T>(
  db: Database,
  sql: Query,
  params: SqlParam[] | null = [],
  fetchAll = false,
): T[] | { changes: unknown } {
  const boundParams = params ?? [];
  verifyParamTypes(sql, boundParams);

  const ownsStatement = typeof sql === 'string';
  const statement = ownsStatement ? db.prepare(sql) : sql;

  try {
    if (boundParams.length > 0) {
      statement.bind(boundParams);
    }

    if (fetchAll) {
      const rows: T[] = [];
      while (statement.step()) {
        rows.push(statement.get({}) as T);
      }
      return rows;
    }

    statement.step();
    return { changes: db.changes() };
  } catch (error) {
    logger.log(sql);
    throw error;
  } finally {
    if (ownsStatement) {
      statement.finalize();
    } else {
      statement.reset(true);
    }
  }
}

export function execQuery(db: Database, sql: string) {
  db.exec(sql);
}

let transactionDepth = 0;

export function transaction(db: Database, fn: () => void) {
  const isNested = transactionDepth > 0;
  execQuery(db, isNested ? 'SAVEPOINT __actual_sp' : 'BEGIN');
  transactionDepth++;

  try {
    fn();
    execQuery(db, isNested ? 'RELEASE __actual_sp' : 'COMMIT');
  } catch (error) {
    execQuery(db, isNested ? 'ROLLBACK TO __actual_sp' : 'ROLLBACK');
    if (isNested) {
      execQuery(db, 'RELEASE __actual_sp');
    }
    throw error;
  } finally {
    transactionDepth--;
  }
}

export async function asyncTransaction(db: Database, fn: () => Promise<void>) {
  if (transactionDepth === 0) {
    db.exec('BEGIN TRANSACTION');
  }
  transactionDepth++;

  try {
    await fn();
  } finally {
    transactionDepth--;
    if (transactionDepth === 0) {
      db.exec('COMMIT');
    }
  }
}

function asString(value: SqlValue | undefined) {
  if (value === null || value === undefined) {
    return null;
  }
  if (typeof value !== 'string') {
    throw new TypeError(`Expected SQLite text value, got ${typeof value}`);
  }
  return value;
}

function registerFunctions(db: Database) {
  db.createFunction({
    name: 'UNICODE_LOWER',
    deterministic: true,
    xFunc: (_context, value) => asString(value)?.toLowerCase() ?? null,
  });
  db.createFunction({
    name: 'UNICODE_UPPER',
    deterministic: true,
    xFunc: (_context, value) => asString(value)?.toUpperCase() ?? null,
  });
  db.createFunction({
    name: 'UNICODE_LIKE',
    deterministic: true,
    xFunc: (_context, pattern, value) =>
      unicodeLike(asString(pattern), asString(value)),
  });
  db.createFunction({
    name: 'REGEXP',
    deterministic: true,
    xFunc: (_context, expression, value) =>
      new RegExp(asString(expression) ?? '').test(asString(value) ?? '')
        ? 1
        : 0,
  });
  db.createFunction({
    name: 'NORMALISE',
    deterministic: true,
    xFunc: (_context, value) => normalise(asString(value)),
  });
}

function openDatabaseFromBytes(contents: Uint8Array) {
  const module = getSqlite();
  const db = new module.oo1.DB();
  const deserializableContents = contents.slice();

  if (
    deserializableContents.byteLength >= 20 &&
    deserializableContents[18] === 2 &&
    deserializableContents[19] === 2
  ) {
    deserializableContents[18] = 1;
    deserializableContents[19] = 1;
  }

  const allocation = module.wasm.allocFromTypedArray(deserializableContents);
  try {
    const result = module.capi.sqlite3_deserialize(
      db,
      'main',
      allocation,
      deserializableContents.byteLength,
      deserializableContents.byteLength,
      module.capi.SQLITE_DESERIALIZE_FREEONCLOSE |
        module.capi.SQLITE_DESERIALIZE_RESIZEABLE,
    );
    db.checkRc(result);
    return db;
  } catch (error) {
    db.close();
    throw error;
  }
}

export async function openDatabase(pathOrBuffer?: string | Uint8Array) {
  let db: Database | undefined;
  const isPersistentPath =
    typeof pathOrBuffer === 'string' && pathOrBuffer !== ':memory:';

  try {
    if (isPersistentPath) {
      db = await openPersistentDatabase(pathOrBuffer);
      db.exec('PRAGMA locking_mode=EXCLUSIVE');
      const journalMode = db.selectValue('PRAGMA journal_mode=WAL');
      if (journalMode !== 'wal') {
        logger.warn(`Unable to enable WAL for ${pathOrBuffer}`);
      }
      db.exec('PRAGMA synchronous=FULL');
    } else if (pathOrBuffer instanceof Uint8Array) {
      db = openDatabaseFromBytes(pathOrBuffer);
    } else {
      db = new (getSqlite().oo1.DB)();
    }

    db.exec('PRAGMA cache_size=-10000; PRAGMA temp_store=MEMORY');
    registerFunctions(db);
    return db;
  } catch (error) {
    if (db !== undefined) {
      closeDatabase(db, false);
    }
    throw error;
  }
}

export function closeDatabase(db: Database, checkpoint = true) {
  const tracked = trackedDatabases.get(db);
  try {
    if (checkpoint && tracked !== undefined && db.isOpen()) {
      db.exec('PRAGMA wal_checkpoint(TRUNCATE)');
    }
  } finally {
    try {
      db.close();
    } finally {
      if (tracked !== undefined) {
        openDatabases.delete(tracked.path);
        trackedDatabases.delete(db);
        releasePool(tracked.state);
      }
    }
  }
}

export async function exportDatabase(db: Database) {
  return getSqlite().capi.sqlite3_js_db_export(db);
}
