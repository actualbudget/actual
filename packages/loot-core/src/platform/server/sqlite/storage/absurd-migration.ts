import type { Data } from '#platform/server/indexeddb';
import { logger } from '#platform/server/log';
import type { WasmDatabase } from '#platform/server/sqlite/wasm';

import { StorageMigrationError } from './errors';
import { putSqliteFileRow } from './files-store';
import { legacyDatabaseName } from './paths';
import type { MigrationProgress } from './types';

// absurd-sql kept each sqlite file in its own IndexedDB database, named
// after the file path, with a single object store `data`: key -1 holds
// `{ size }` and keys 0..N hold the file's blocks, one sqlite page each.
// These helpers read that layout so a budget can be moved into the new
// storage, and finish the move the same way for both stores.

const LEGACY_STORE = 'data';
// Opening at a higher version than absurd-sql's (2) makes its connections
// in other tabs close (they listen for `versionchange`), so nothing writes
// during a copy
const MIGRATION_VERSION = 3;
const BLOCKS_PER_CHUNK = 256;
const DELETE_TIMEOUT_MS = 5000;
const SQLITE_HEADER = 'SQLite format 3\0';

type LegacyMeta = { size: number };

// Resolves null when no absurd-sql database exists under this name. A
// missing database would be created by the open; aborting the upgrade
// that creates it leaves nothing behind.
function openLegacyDatabase(name: string): Promise<IDBDatabase | null> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(name, MIGRATION_VERSION);
    let missing = false;
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains(LEGACY_STORE)) {
        missing = true;
        request.transaction?.abort();
      }
    };
    request.onblocked = () => {
      // Another tab still holds the old version; its `versionchange`
      // handler closes it and the request then proceeds
    };
    request.onsuccess = () => {
      const database = request.result;
      database.onversionchange = () => database.close();
      resolve(database);
    };
    request.onerror = () => {
      if (missing) {
        resolve(null);
      } else {
        reject(request.error);
      }
    };
  });
}

function requestToPromise<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function readLegacyKey<T>(database: IDBDatabase, key: number): Promise<T> {
  const store = database
    .transaction([LEGACY_STORE], 'readonly')
    .objectStore(LEGACY_STORE);
  return requestToPromise(store.get(key)) as Promise<T>;
}

export function pageSizeFromHeader(header: Uint8Array): number | null {
  const text = new TextDecoder().decode(header.slice(0, SQLITE_HEADER.length));
  if (text !== SQLITE_HEADER) {
    return null;
  }
  const raw = (header[16] << 8) | header[17];
  // 1 encodes the maximum page size
  return raw === 1 ? 65536 : raw;
}

// Reads the blocks in order, in short IndexedDB transactions, filling gaps
// with zeros and cutting the last block to the file size. Resolves with
// undefined at the end of the file.
async function createBlockReader(
  database: IDBDatabase,
  size: number,
  onProgress?: (percent: number) => void,
): Promise<() => Promise<Uint8Array | undefined>> {
  const first = await readLegacyKey<ArrayBuffer | undefined>(database, 0);
  if (first == null) {
    throw new Error('legacy database has no first block');
  }
  const blockSize = pageSizeFromHeader(new Uint8Array(first));
  if (blockSize == null) {
    throw new Error('legacy database does not start with a sqlite header');
  }
  const totalBlocks = Math.ceil(size / blockSize);
  let nextBlock = 0;

  return async function next() {
    if (nextBlock >= totalBlocks) {
      return undefined;
    }
    const lastBlock = Math.min(nextBlock + BLOCKS_PER_CHUNK, totalBlocks) - 1;
    const store = database
      .transaction([LEGACY_STORE], 'readonly')
      .objectStore(LEGACY_STORE);
    const range = IDBKeyRange.bound(nextBlock, lastBlock);
    const [keys, values] = await Promise.all([
      requestToPromise(store.getAllKeys(range)),
      requestToPromise(store.getAll(range)),
    ]);

    const chunkStart = nextBlock * blockSize;
    const chunkEnd = Math.min((lastBlock + 1) * blockSize, size);
    const chunk = new Uint8Array(chunkEnd - chunkStart);
    for (let index = 0; index < keys.length; index++) {
      const key = keys[index] as number;
      const block = new Uint8Array(values[index] as ArrayBuffer);
      const offset = key * blockSize - chunkStart;
      chunk.set(
        block.subarray(0, Math.min(block.length, chunk.length - offset)),
        offset,
      );
    }

    nextBlock = lastBlock + 1;
    onProgress?.(Math.round((100 * nextBlock) / totalBlocks));
    return chunk;
  };
}

// Resolves false when the database is still open elsewhere after a while
export function deleteLegacyDatabase(name: string): Promise<boolean> {
  return new Promise(resolve => {
    const request = indexedDB.deleteDatabase(name);
    const timer = setTimeout(() => resolve(false), DELETE_TIMEOUT_MS);
    request.onsuccess = () => {
      clearTimeout(timer);
      resolve(true);
    };
    request.onerror = () => {
      clearTimeout(timer);
      resolve(false);
    };
  });
}

export type LegacyDatabaseContents = {
  // Feeds the file in chunks, for `importDb`
  read: () => Promise<Uint8Array | undefined>;
  size: number;
  close: () => void;
};

// Opens the absurd-sql database of a sqlite path for reading. Resolves
// null when there is none, or when it is empty (absurd-sql created the
// IndexedDB database before the first write).
export async function openLegacyDatabaseContents(
  path: string,
  onProgress?: (percent: number) => void,
): Promise<LegacyDatabaseContents | null> {
  const name = legacyDatabaseName(path);
  const database = await openLegacyDatabase(name);
  if (database == null) {
    return null;
  }
  try {
    const meta = await readLegacyKey<LegacyMeta | undefined>(database, -1);
    if (typeof meta?.size !== 'number' || meta.size <= 0) {
      database.close();
      await deleteLegacyDatabase(name);
      return null;
    }
    const read = await createBlockReader(database, meta.size, onProgress);
    onProgress?.(0);
    return { read, size: meta.size, close: () => database.close() };
  } catch (error) {
    database.close();
    throw new StorageMigrationError(path, error);
  }
}

// The whole legacy file in memory, for the fallback store
export async function readLegacyDatabaseBytes(
  path: string,
  onProgress?: (percent: number) => void,
): Promise<Uint8Array | null> {
  const contents = await openLegacyDatabaseContents(path, onProgress);
  if (contents == null) {
    return null;
  }
  try {
    const bytes = new Uint8Array(contents.size);
    let offset = 0;
    for (;;) {
      const chunk = await contents.read();
      if (chunk == null) {
        break;
      }
      bytes.set(chunk, offset);
      offset += chunk.length;
    }
    return bytes;
  } catch (error) {
    throw new StorageMigrationError(path, error);
  } finally {
    contents.close();
  }
}

// What both stores check on a freshly copied database before trusting
// it: structurally sound, and an Actual budget
export function verifyMigratedDatabase(db: WasmDatabase) {
  const result = db.selectValue('PRAGMA quick_check');
  if (result !== 'ok') {
    throw new Error(`quick_check: ${String(result)}`);
  }
  db.selectValue('SELECT 1 FROM __migrations__ LIMIT 1');
}

// Records that the file now lives in the new storage, then drops the
// absurd-sql copy. The marker goes first so a crash in between can never
// make the budget look empty on the next start.
export async function completeMigration(
  marker: Data,
  onProgress?: MigrationProgress,
) {
  onProgress?.('cleanup');
  await putSqliteFileRow(marker);
  if (!(await deleteLegacyDatabase(legacyDatabaseName(marker.filepath)))) {
    logger.warn(
      'sqlite storage: the absurd-sql copy could not be deleted',
      marker.filepath,
    );
  }
  onProgress?.('done');
}
