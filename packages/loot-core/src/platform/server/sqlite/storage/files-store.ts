import * as idb from '#platform/server/indexeddb';
import type { Data } from '#platform/server/indexeddb';

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

export async function putSqliteFileRow(row: Data): Promise<void> {
  const { store } = idb.getStore(await idb.openDatabase(), 'files');
  await idb.set(store, row);
}

export async function deleteSqliteFileRow(path: string): Promise<void> {
  const { store } = idb.getStore(await idb.openDatabase(), 'files');
  await idb.del(store, path);
}

// Whether any sqlite file already moved off absurd-sql. Used at startup:
// once data lives in the new storage the legacy engine must not be chosen,
// whatever the flag says. One store then serves every budget: one still in
// absurd-sql's layout is migrated when opened, and the OPFS store adopts
// the fallback's rows. Walks the rows with a cursor and stops at the first
// marked one, so the fallback's whole-file rows are not all read into
// memory.
export async function hasMigratedSqliteFiles(): Promise<boolean> {
  const { store } = idb.getStore(await idb.openDatabase(), 'files');
  return new Promise((resolve, reject) => {
    const request = store.openCursor();
    request.onsuccess = () => {
      const cursor = request.result;
      if (!cursor) {
        resolve(false);
      } else if ((cursor.value as Data).storage) {
        resolve(true);
      } else {
        cursor.continue();
      }
    };
    request.onerror = () => reject(request.error);
  });
}
