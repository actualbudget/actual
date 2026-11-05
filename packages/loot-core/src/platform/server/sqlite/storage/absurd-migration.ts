import type { Data } from '#platform/server/indexeddb';
import { logger } from '#platform/server/log';
import type { WasmDatabase } from '#platform/server/sqlite/wasm';

import { BudgetInUseError, StorageMigrationError } from './errors';
import { putSqliteFileRow } from './files-store';
import { legacyDatabaseName } from './paths';
import type { MigrationProgress } from './types';

// absurd-sql kept each sqlite file in its own IndexedDB database, named
// after the file path, with a single object store `data`: key -1 holds
// `{ size }` and keys 0..N hold the file's blocks, one sqlite page each.
// These helpers read that layout so a budget can be moved into the new
// storage, and finish the move the same way for both stores.

const LEGACY_STORE = 'data';
// absurd-sql opens its databases at this version
const LEGACY_VERSION = 2;
const BLOCKS_PER_CHUNK = 256;
const DELETE_TIMEOUT_MS = 5000;
const EVICT_TIMEOUT_MS = 1000;
const SQLITE_HEADER = 'SQLite format 3\0';

type LegacyMeta = { size: number };

// Asks every other connection to the absurd-sql database to close, which
// its engine does on `versionchange`, so a tab still on the previous
// release, or one without Web Locks, writes nothing more while the copy
// is made. The upgrade itself is abandoned: the version never changes, so
// the legacy engine can still open the database should the move fail,
// and a missing database is not created. Resolves whether the database
// exists; rejects when a connection will not close.
function evictLegacyConnections(name: string, path: string): Promise<boolean> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(name, LEGACY_VERSION + 1);
    let exists = true;
    const timer = setTimeout(
      () => reject(new BudgetInUseError(path)),
      EVICT_TIMEOUT_MS,
    );
    request.onupgradeneeded = event => {
      exists = event.oldVersion !== 0;
      request.transaction?.abort();
    };
    // The abandoned upgrade fails the request: the normal way out
    request.onerror = () => {
      clearTimeout(timer);
      resolve(exists);
    };
    request.onsuccess = () => {
      clearTimeout(timer);
      request.result.close();
      resolve(true);
    };
  });
}

// Resolves null when no absurd-sql database exists under this name
async function openLegacyDatabase(
  name: string,
  path: string,
): Promise<IDBDatabase | null> {
  if (!(await evictLegacyConnections(name, path))) {
    return null;
  }
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(name);
    request.onsuccess = () => {
      const database = request.result;
      database.onversionchange = () => database.close();
      resolve(database);
    };
    request.onerror = () => reject(request.error);
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

// The page size of a sqlite file, or null when the header is not one or
// the size is not a power of two from 512 to 65536
export function pageSizeFromHeader(header: Uint8Array): number | null {
  const text = new TextDecoder().decode(header.slice(0, SQLITE_HEADER.length));
  if (text !== SQLITE_HEADER) {
    return null;
  }
  const raw = (header[16] << 8) | header[17];
  // 1 encodes the maximum page size
  const size = raw === 1 ? 65536 : raw;
  const isPowerOfTwo = (size & (size - 1)) === 0;
  return size >= 512 && size <= 65536 && isPowerOfTwo ? size : null;
}

// Reads every block in one read-only transaction, so a legacy writer in
// another tab waits until the copy is done rather than changing the file
// part-way through. Gaps are zero-filled and the last block is cut to the
// file size. Resolves with the file in chunks.
function readAllBlocks(
  database: IDBDatabase,
  size: number,
  onProgress?: (percent: number) => void,
): Promise<Uint8Array[]> {
  return new Promise((resolve, reject) => {
    const transaction = database.transaction([LEGACY_STORE], 'readonly');
    const store = transaction.objectStore(LEGACY_STORE);
    const chunks: Uint8Array[] = [];
    transaction.onerror = () => reject(transaction.error);
    transaction.onabort = () => reject(transaction.error);
    transaction.oncomplete = () => resolve(chunks);

    function fail(message: string) {
      reject(new Error(message));
      transaction.abort();
    }

    // Requests complete in order, so the keys are in by the time the
    // values arrive; issuing the next pair from there keeps the
    // transaction alive
    function readChunk(fromBlock: number, blockSize: number) {
      const totalBlocks = Math.ceil(size / blockSize);
      if (fromBlock >= totalBlocks) {
        return;
      }
      const lastBlock = Math.min(fromBlock + BLOCKS_PER_CHUNK, totalBlocks) - 1;
      const range = IDBKeyRange.bound(fromBlock, lastBlock);
      const keysRequest = store.getAllKeys(range);
      const valuesRequest = store.getAll(range);
      valuesRequest.onsuccess = () => {
        const chunkStart = fromBlock * blockSize;
        const chunkEnd = Math.min((lastBlock + 1) * blockSize, size);
        const chunk = new Uint8Array(chunkEnd - chunkStart);
        valuesRequest.result.forEach((value, index) => {
          const key = keysRequest.result[index] as number;
          const block = new Uint8Array(value as ArrayBuffer);
          const offset = key * blockSize - chunkStart;
          chunk.set(
            block.subarray(0, Math.min(block.length, chunk.length - offset)),
            offset,
          );
        });
        chunks.push(chunk);
        onProgress?.(Math.round((100 * (lastBlock + 1)) / totalBlocks));
        readChunk(lastBlock + 1, blockSize);
      };
    }

    const first = store.get(0);
    first.onsuccess = () => {
      const header = first.result as ArrayBuffer | undefined;
      if (header == null) {
        fail('legacy database has no first block');
        return;
      }
      const blockSize = pageSizeFromHeader(new Uint8Array(header));
      if (blockSize == null) {
        fail('legacy database has no valid sqlite header');
        return;
      }
      readChunk(0, blockSize);
    };
  });
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
  // Feeds the file in chunks, for `importDb`; undefined at the end
  read: () => Promise<Uint8Array | undefined>;
  size: number;
};

// A snapshot of the absurd-sql database of a sqlite path. Resolves null
// when there is none, or when it is empty (absurd-sql created the
// IndexedDB database before the first write).
export async function openLegacyDatabaseContents(
  path: string,
  onProgress?: (percent: number) => void,
): Promise<LegacyDatabaseContents | null> {
  const name = legacyDatabaseName(path);
  const database = await openLegacyDatabase(name, path);
  if (database == null) {
    return null;
  }
  try {
    const meta = await readLegacyKey<LegacyMeta | undefined>(database, -1);
    if (typeof meta?.size !== 'number' || meta.size <= 0) {
      // Only a store with no blocks at all is a database absurd-sql
      // created before its first write; anything else is damage, kept
      if ((await readLegacyKey(database, 0)) != null) {
        throw new Error('legacy database has blocks but no valid size');
      }
      database.close();
      await deleteLegacyDatabase(name);
      return null;
    }
    onProgress?.(0);
    const chunks = await readAllBlocks(database, meta.size, onProgress);
    return { read: async () => chunks.shift(), size: meta.size };
  } catch (error) {
    throw new StorageMigrationError(path, error);
  } finally {
    database.close();
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
  const bytes = new Uint8Array(contents.size);
  let offset = 0;
  for (
    let chunk = await contents.read();
    chunk;
    chunk = await contents.read()
  ) {
    bytes.set(chunk, offset);
    offset += chunk.length;
  }
  return bytes;
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
// make the budget look empty on the next start. Only the marker write can
// throw: once it is in the move is complete, and a copy that cannot be
// deleted is just logged.
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
