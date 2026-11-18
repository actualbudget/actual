import * as idb from '#platform/server/indexeddb';
import type { Data } from '#platform/server/indexeddb';

import type { FileStoreKind } from './types';

// The IndexedDB `files` store keeps one row per persisted path. For a
// sqlite path the row is the marker the filesystem rebuilds its hierarchy
// from, records which store holds the bytes, and for the IndexedDB
// fallback holds the bytes themselves. Each helper opens its transaction
// right before the request so the transaction cannot go inactive in
// between.

export async function getSqliteFileRow(
  path: string,
): Promise<Data | undefined> {
  const { store } = idb.getStore(await idb.openDatabase(), 'files');
  return idb.get(store, path);
}

// A request can succeed and its transaction still abort (quota, mostly),
// so writes resolve only once the transaction has committed
function committed(transaction: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
    transaction.onabort = () => reject(transaction.error);
  });
}

export async function putSqliteFileRow(row: Data): Promise<void> {
  const { trans, store } = idb.getStore(await idb.openDatabase(), 'files');
  await Promise.all([idb.set(store, row), committed(trans)]);
}

// Writes the row only while the stored one is still at `expectedRev`, in
// the transaction that checks it, so two workers without Web Locks cannot
// both pass the check. Resolves whether it was written.
export async function putSqliteFileRowIfRev(
  row: Data,
  expectedRev: number,
): Promise<boolean> {
  const { trans, store } = idb.getStore(await idb.openDatabase(), 'files');
  const [written] = await Promise.all([
    new Promise<boolean>((resolve, reject) => {
      const request = store.get(row.filepath);
      request.onsuccess = () => {
        const current = request.result as Data | undefined;
        if ((current?.rev ?? 0) !== expectedRev) {
          resolve(false);
          return;
        }
        // Issued inside the callback, so it joins the checking transaction
        idb.set(store, row).then(() => resolve(true), reject);
      };
      request.onerror = () => reject(request.error);
    }),
    committed(trans),
  ]);
  return written;
}

export async function deleteSqliteFileRow(path: string): Promise<void> {
  const { trans, store } = idb.getStore(await idb.openDatabase(), 'files');
  await Promise.all([idb.del(store, path), committed(trans)]);
}

// Whether any sqlite file already moved off absurd-sql, or into `kind` when
// given. Used at startup: once data lives in an OPFS pool the fallback must
// not be chosen, whatever the flag says; the OPFS store then serves every
// budget and adopts the fallback's rows. Walks the rows with a cursor and
// stops at the first match, so the fallback's whole-file rows are not all
// read into memory.
export async function hasMigratedSqliteFiles(
  kind?: FileStoreKind,
): Promise<boolean> {
  const { store } = idb.getStore(await idb.openDatabase(), 'files');
  return new Promise((resolve, reject) => {
    const request = store.openCursor();
    request.onsuccess = () => {
      const cursor = request.result;
      if (!cursor) {
        resolve(false);
        return;
      }
      const { storage } = cursor.value as Data;
      if (storage && (kind == null || storage === kind)) {
        resolve(true);
      } else {
        cursor.continue();
      }
    };
    request.onerror = () => reject(request.error);
  });
}
