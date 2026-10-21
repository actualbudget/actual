import { StorageMigrationError } from './errors';
import type { MigrationProgress } from './types';

// absurd-sql kept each sqlite file in its own IndexedDB database, named
// after the file path, with a single object store `data`: key -1 holds
// `{ size }` and keys 0..N hold the file's blocks (one sqlite page each).
// These helpers read that layout so a budget can be moved into the new
// storage, and write it back so the opt-in can be reversed.

const LEGACY_STORE = 'data';
// Opening at a higher version makes absurd-sql connections in other tabs
// close (they listen for `versionchange`), so nothing writes during a copy
const MIGRATION_VERSION = 3;
const BLOCKS_PER_CHUNK = 256;
const SQLITE_HEADER = 'SQLite format 3\0';

type LegacyMeta = { size: number; blockSize?: number };

export async function legacyDatabaseExists(name: string): Promise<boolean> {
  if (typeof indexedDB.databases === 'function') {
    const databases = await indexedDB.databases();
    return databases.some(database => database.name === name);
  }

  // Older browsers: opening creates the database if it is missing, which
  // fires `upgradeneeded`. Abort that and clean up.
  return new Promise(resolve => {
    let created = false;
    const request = indexedDB.open(name);
    request.onupgradeneeded = () => {
      created = true;
      request.transaction?.abort();
    };
    request.onsuccess = () => {
      request.result.close();
      resolve(!created);
    };
    request.onerror = () => {
      if (created) {
        indexedDB.deleteDatabase(name);
      }
      resolve(false);
    };
  });
}

function openLegacyDatabase(name: string): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(name, MIGRATION_VERSION);
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains(LEGACY_STORE)) {
        request.transaction?.abort();
        reject(new Error(`${name} is not an absurd-sql database`));
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
    request.onerror = () => reject(request.error);
  });
}

function requestToPromise<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function readLegacyMeta(
  database: IDBDatabase,
): Promise<LegacyMeta | undefined> {
  const store = database
    .transaction([LEGACY_STORE], 'readonly')
    .objectStore(LEGACY_STORE);
  const meta = await requestToPromise(store.get(-1));
  return meta as LegacyMeta | undefined;
}

async function readLegacyBlock(
  database: IDBDatabase,
  key: number,
): Promise<ArrayBuffer | undefined> {
  const store = database
    .transaction([LEGACY_STORE], 'readonly')
    .objectStore(LEGACY_STORE);
  return (await requestToPromise(store.get(key))) as ArrayBuffer | undefined;
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

type BlockReader = {
  // Resolves with the next chunk of the file, or undefined at the end
  next: () => Promise<Uint8Array | undefined>;
  blockSize: number;
  size: number;
};

// Reads the blocks in order, in short IndexedDB transactions, filling gaps
// with zeros and cutting the last block to the file size.
async function createBlockReader(
  database: IDBDatabase,
  meta: LegacyMeta,
  onProgress?: (percent: number) => void,
): Promise<BlockReader> {
  const first = await readLegacyBlock(database, 0);
  if (first == null) {
    throw new Error('legacy database has no first block');
  }
  const pageSize = pageSizeFromHeader(new Uint8Array(first));
  if (pageSize == null) {
    throw new Error('legacy database does not start with a sqlite header');
  }
  const blockSize = meta.blockSize ?? pageSize;
  const totalBlocks = Math.ceil(meta.size / blockSize);
  let nextBlock = 0;

  async function next(): Promise<Uint8Array | undefined> {
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
    const chunkEnd = Math.min((lastBlock + 1) * blockSize, meta.size);
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
  }

  return { next, blockSize, size: meta.size };
}

export async function deleteLegacyDatabase(
  name: string,
  { blockedTimeoutMs = 5000 }: { blockedTimeoutMs?: number } = {},
): Promise<boolean> {
  return new Promise(resolve => {
    const request = indexedDB.deleteDatabase(name);
    const timer = setTimeout(() => resolve(false), blockedTimeoutMs);
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
  // Feeds the file in chunks; for `importDb` or a sync access handle
  read: () => Promise<Uint8Array | undefined>;
  size: number;
  close: () => void;
};

// Opens the legacy database for reading. Returns null when there is none,
// or when it is empty (absurd-sql created the IndexedDB database before
// the first write).
export async function openLegacyDatabaseContents(
  path: string,
  name: string,
  onProgress?: (percent: number) => void,
): Promise<LegacyDatabaseContents | null> {
  if (!(await legacyDatabaseExists(name))) {
    return null;
  }
  const database = await openLegacyDatabase(name);
  try {
    const meta = await readLegacyMeta(database);
    if (meta == null || !(meta.size > 0)) {
      database.close();
      await deleteLegacyDatabase(name);
      return null;
    }
    const reader = await createBlockReader(database, meta, onProgress);
    return {
      read: reader.next,
      size: reader.size,
      close: () => database.close(),
    };
  } catch (error) {
    database.close();
    throw new StorageMigrationError(path, error);
  }
}

// The whole legacy file in memory, for the fallback store
export async function readLegacyDatabaseBytes(
  path: string,
  name: string,
  onProgress?: (percent: number) => void,
): Promise<Uint8Array | null> {
  const contents = await openLegacyDatabaseContents(path, name, onProgress);
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

export function reportMigration(
  progress: MigrationProgress | undefined,
  phase: Parameters<MigrationProgress>[0],
  percent?: number,
) {
  progress?.(phase, percent);
}
