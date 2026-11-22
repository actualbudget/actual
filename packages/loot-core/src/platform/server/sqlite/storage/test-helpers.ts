import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';

import { IDBFactory } from 'fake-indexeddb';

import * as idb from '#platform/server/indexeddb';
import { init } from '#platform/server/sqlite';

import { pageSizeFromHeader } from './absurd-migration';
import type { FileStoreKind } from './types';

const require = createRequire(import.meta.url);

// The wasm bytes, so tests never go through fetch
export function readSqliteWasm(): Buffer {
  return readFileSync(require.resolve('@sqlite.org/sqlite-wasm/sqlite3.wasm'));
}

// Starts the sqlite-wasm engine on the given storage
export function initWasmEngine(storage: FileStoreKind = 'memory-idb') {
  return init({ storage, wasmBinary: readSqliteWasm() });
}

// A fresh IndexedDB for each test
export async function resetIndexedDb() {
  globalThis.indexedDB = new IDBFactory();
  await idb.closeDatabase();
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

// Another tab's absurd-sql connection, which closes on a version change
// unless told to stay
export function holdLegacyConnection(
  name: string,
  { stubborn = false } = {},
): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(name, 2);
    request.onsuccess = () => {
      const database = request.result;
      if (!stubborn) {
        database.onversionchange = () => database.close();
      }
      resolve(database);
    };
    request.onerror = () => reject(request.error);
  });
}

// What a tab on the previous release does when it reopens a copy and
// writes: the file change counter in the header moves
export async function writeToLegacyDatabase(name: string): Promise<void> {
  const database = await holdLegacyConnection(name);
  try {
    await new Promise<void>((resolve, reject) => {
      const transaction = database.transaction('data', 'readwrite');
      const store = transaction.objectStore('data');
      const request = store.get(0);
      request.onsuccess = () => {
        const block = new Uint8Array(request.result as ArrayBuffer);
        block[27] += 1;
        store.put(block.buffer, 0);
      };
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
      transaction.onabort = () => reject(transaction.error);
    });
  } finally {
    database.close();
  }
}

export async function listIndexedDbNames(): Promise<string[]> {
  const databases = await indexedDB.databases();
  return databases.map(database => database.name ?? '').filter(Boolean);
}

export function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}
