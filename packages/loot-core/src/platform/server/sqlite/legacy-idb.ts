type LegacyMetadata = {
  size?: unknown;
};

const LEGACY_MIGRATION_FENCE_VERSION = 3;

type LegacyBlock = ArrayBuffer | ArrayBufferView;

export type LegacyDatabaseReader = {
  size: number;
  readNext: () => Promise<Uint8Array | undefined>;
  close: () => void;
};

function legacyDatabaseName(filepath: string) {
  return filepath.replace(/^\//, '').replaceAll('/', '-');
}

function requestResult<T>(request: IDBRequest<T>) {
  return new Promise<T>((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function hasIndexedDbDatabase(name: string) {
  if (typeof indexedDB.databases !== 'function') {
    return true;
  }
  const databases = await indexedDB.databases();
  return databases.some(database => database.name === name);
}

export async function hasLegacyDatabase(filepath: string) {
  return await hasIndexedDbDatabase(legacyDatabaseName(filepath));
}

async function openLegacyDatabase(name: string) {
  if (!(await hasIndexedDbDatabase(name))) {
    return null;
  }

  return await new Promise<IDBDatabase | null>((resolve, reject) => {
    let wasCreated = false;
    let wasBlocked = false;
    let blockedTimer: ReturnType<typeof setTimeout> | undefined;
    // absurd-sql opens these databases at version 2. Upgrading to version 3
    // first forces every old connection through `versionchange`; absurd-sql
    // closes those connections, and any later v2 reopen/write fails. This is
    // the deployment fence which prevents an old tab from writing after its
    // snapshot has been promoted to OPFS.
    const request = indexedDB.open(name, LEGACY_MIGRATION_FENCE_VERSION);
    request.onupgradeneeded = event => {
      wasCreated = event.oldVersion === 0;
    };
    request.onsuccess = () => {
      clearTimeout(blockedTimer);
      const database = request.result;
      if (wasBlocked) {
        database.close();
        return;
      }
      if (wasCreated || !database.objectStoreNames.contains('data')) {
        database.close();
        if (wasCreated) {
          indexedDB.deleteDatabase(name);
        }
        resolve(null);
      } else {
        database.onversionchange = () => database.close();
        resolve(database);
      }
    };
    request.onblocked = () => {
      blockedTimer ??= setTimeout(() => {
        wasBlocked = true;
        reject(new Error(`legacy-database-busy: ${name}`));
      }, 5000);
    };
    request.onerror = () => {
      clearTimeout(blockedTimer);
      reject(request.error);
    };
  });
}

export async function fenceLegacyDatabase(filepath: string) {
  const database = await openLegacyDatabase(legacyDatabaseName(filepath));
  database?.close();
}

function blockBytes(block: LegacyBlock) {
  return block instanceof ArrayBuffer
    ? new Uint8Array(block)
    : new Uint8Array(block.buffer, block.byteOffset, block.byteLength);
}

function sqlitePageSize(firstBlock: LegacyBlock) {
  const bytes = blockBytes(firstBlock);
  if (bytes.byteLength < 100) {
    throw new Error('legacy-database-invalid: first block is too small');
  }

  const header = new TextDecoder().decode(bytes.subarray(0, 16));
  if (header !== 'SQLite format 3\0') {
    throw new Error('legacy-database-invalid: SQLite header is missing');
  }

  const encodedSize = (bytes[16] << 8) | bytes[17];
  const pageSize = encodedSize === 1 ? 65_536 : encodedSize;
  if (
    pageSize < 512 ||
    pageSize > 65_536 ||
    (pageSize & (pageSize - 1)) !== 0
  ) {
    throw new Error(`legacy-database-invalid: bad page size ${pageSize}`);
  }
  return pageSize;
}

function isLegacyBlock(value: unknown): value is LegacyBlock {
  return value instanceof ArrayBuffer || ArrayBuffer.isView(value);
}

export async function openLegacyDatabaseReader(
  filepath: string,
): Promise<LegacyDatabaseReader | null> {
  const database = await openLegacyDatabase(legacyDatabaseName(filepath));
  if (database === null) {
    return null;
  }

  try {
    const transaction = database.transaction('data', 'readonly');
    const store = transaction.objectStore('data');
    const [metadataValue, firstBlockValue] = await Promise.all([
      requestResult(store.get(-1)),
      requestResult(store.get(0)),
    ]);

    const metadata = metadataValue as LegacyMetadata | undefined;
    const firstBlock = firstBlockValue as unknown;
    if (
      metadata === undefined ||
      isLegacyBlock(metadata) ||
      !isLegacyBlock(firstBlock)
    ) {
      throw new Error(
        'legacy-database-invalid: metadata or first block missing',
      );
    }

    const size = metadata.size;
    if (typeof size !== 'number' || !Number.isSafeInteger(size) || size < 100) {
      throw new Error(`legacy-database-invalid: bad file size ${String(size)}`);
    }

    const blockSize = sqlitePageSize(firstBlock);
    const blockCount = Math.ceil(size / blockSize);
    let blockIndex = 0;

    return {
      size,
      readNext: async () => {
        if (blockIndex >= blockCount) {
          return undefined;
        }

        const currentIndex = blockIndex++;
        const value =
          currentIndex === 0
            ? firstBlock
            : await requestResult(
                database
                  .transaction('data', 'readonly')
                  .objectStore('data')
                  .get(currentIndex),
              );
        const byteLength = Math.min(blockSize, size - currentIndex * blockSize);
        const bytes = new Uint8Array(byteLength);
        if (isLegacyBlock(value)) {
          const source = blockBytes(value);
          bytes.set(source.subarray(0, byteLength));
        }
        return bytes;
      },
      close: () => database.close(),
    };
  } catch (error) {
    database.close();
    throw error;
  }
}

export async function deleteLegacyDatabase(filepath: string) {
  const name = legacyDatabaseName(filepath);
  if (!(await hasIndexedDbDatabase(name))) {
    return;
  }

  await new Promise<void>((resolve, reject) => {
    const request = indexedDB.deleteDatabase(name);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
    // absurd-sql closes its connection on `versionchange`; keep waiting for
    // that handoff rather than rejecting a nonterminal `blocked` event and
    // risking a late delete after the caller believes it failed.
    request.onblocked = () => undefined;
  });
}
