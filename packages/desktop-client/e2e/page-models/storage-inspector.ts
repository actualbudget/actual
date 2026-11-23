import type { Page } from '@playwright/test';

/** Where the open page's budgets are stored, read straight from the browser. */
export type StorageSnapshot = {
  /** IndexedDB database names; absurd-sql keeps one per budget file. */
  databases: string[];
  /** `files` rows for sqlite paths, with the sqlite-wasm storage marker. */
  sqliteRows: Array<{ filepath: string; storage?: string; hasBytes: boolean }>;
  /** Files under the origin's private file system (OPFS pools). */
  poolFiles: string[];
};

export async function inspectStorage(page: Page): Promise<StorageSnapshot> {
  return page.evaluate(async () => {
    const databases = (await indexedDB.databases()).map(
      database => database.name ?? '',
    );
    const db = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open('actual');
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    type FileRow = { filepath: string; storage?: string; contents: unknown };
    const rows = await new Promise<FileRow[]>((resolve, reject) => {
      const request = db
        .transaction(['files'], 'readonly')
        .objectStore('files')
        .getAll();
      request.onsuccess = () => resolve(request.result as FileRow[]);
      request.onerror = () => reject(request.error);
    });
    db.close();
    const sqliteRows = rows
      .filter(row => row.filepath.endsWith('.sqlite'))
      .map(row => ({
        filepath: row.filepath,
        storage: row.storage,
        hasBytes:
          ArrayBuffer.isView(row.contents) && row.contents.byteLength > 0,
      }));

    const poolFiles: string[] = [];
    type DirectoryHandle = {
      entries(): AsyncIterable<[string, { kind: string }]>;
    };
    async function walk(directory: DirectoryHandle, prefix: string) {
      for await (const [name, handle] of directory.entries()) {
        const path = `${prefix}/${name}`;
        if (handle.kind === 'directory') {
          await walk(handle as unknown as DirectoryHandle, path);
        } else {
          poolFiles.push(path);
        }
      }
    }
    try {
      const root = await navigator.storage.getDirectory();
      await walk(root as unknown as DirectoryHandle, '');
    } catch {
      // No private file system in this browser
    }
    return { databases, sqliteRows, poolFiles };
  });
}
