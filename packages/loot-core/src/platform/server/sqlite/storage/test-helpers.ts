import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';

import { pageSizeFromHeader } from './absurd-migration';

const require = createRequire(import.meta.url);

// The wasm bytes, so tests never go through fetch
export function readSqliteWasm(): Buffer {
  return readFileSync(require.resolve('@sqlite.org/sqlite-wasm/sqlite3.wasm'));
}

// A small database file as absurd-sql would have stored it: one IndexedDB
// database per file, store `data`, key -1 = { size }, keys 0..N = blocks
export async function seedLegacyDatabase(
  name: string,
  bytes: Uint8Array,
  {
    blockSize = pageSizeFromHeader(bytes) ?? 4096,
    skipBlocks = [] as number[],
  } = {},
): Promise<void> {
  const database = await new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open(name, 2);
    request.onupgradeneeded = () => request.result.createObjectStore('data');
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
  const transaction = database.transaction(['data'], 'readwrite');
  const store = transaction.objectStore('data');
  store.put({ size: bytes.length }, -1);
  for (
    let offset = 0, key = 0;
    offset < bytes.length;
    offset += blockSize, key++
  ) {
    if (skipBlocks.includes(key)) {
      continue;
    }
    const block = new Uint8Array(blockSize);
    block.set(
      bytes.subarray(offset, Math.min(offset + blockSize, bytes.length)),
    );
    store.put(block.buffer, key);
  }
  await new Promise<void>((resolve, reject) => {
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
  });
  database.close();
}

export async function listIndexedDbNames(): Promise<string[]> {
  const databases = await indexedDB.databases();
  return databases.map(database => database.name ?? '').filter(Boolean);
}

export function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}
