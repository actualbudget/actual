import { PGlite } from '@electric-sql/pglite';

import * as idb from '../indexeddb';

export async function init(): Promise<void> {}

export function runQuery(
  db: PGlite,
  sql: string,
  params?: (string | number)[],
  fetchAll?: false,
): Promise<{ changes: unknown }>;
export function runQuery<T>(
  db: PGlite,
  sql: string,
  params: (string | number)[],
  fetchAll: true,
): Promise<T[]>;
export async function runQuery<T>(
  db: PGlite,
  sql: string,
  params: (string | number)[] = [],
  fetchAll: boolean = false,
): Promise<T[] | { changes: unknown }> {
  if (fetchAll) {
    const result = await db.query<T>(sql, params, {
      rowMode: 'object',
    });
    return result.rows;
  } else {
    const result = await db.query(sql, params);
    return { changes: result.affectedRows };
  }
}

export async function execQuery(db: PGlite, sql: string): Promise<void> {
  await db.exec(sql);
}

export async function transaction(
  db: PGlite,
  fn: Parameters<typeof db.transaction>[0],
): Promise<void> {
  await db.transaction(fn);
}

export async function openDatabase(dataDir?: string): Promise<PGlite> {
  // if (dataDir) {
  //   const indexedDb = idb.openDatabase();
  //   return await PGlite.create({
  //     loadDataDir: new Blob([file]),
  //     relaxedDurability: true,
  //   });
  // }
  return await PGlite.create('idb://my-pgdata-9', {
    relaxedDurability: true,
  });
}

export async function closeDatabase(db: PGlite): Promise<void> {
  await db.close();
}

export async function exportDatabase(db: PGlite): Promise<Uint8Array> {
  const dump = await db.dumpDataDir();
  if (dump instanceof File) {
    return await fileToUint8Array(dump);
  }
  return await blobToUint8Array(dump);
}

function fileToUint8Array(file: File): Promise<Uint8Array> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = () => {
      const arrayBuffer = reader.result; // The ArrayBuffer of the file
      const uint8Array =
        typeof arrayBuffer === 'string'
          ? new TextEncoder().encode(arrayBuffer)
          : new Uint8Array(arrayBuffer);

      resolve(uint8Array);
    };

    reader.onerror = reject; // Handle any error in reading the file
    reader.readAsArrayBuffer(file); // Reads the file as an array buffer
  });
}

function blobToUint8Array(blob: Blob): Promise<Uint8Array> {
  return new Promise((resolve, reject) => {
    blob
      .arrayBuffer()
      .then(arrayBuffer => {
        const uint8Array = new Uint8Array(arrayBuffer);
        resolve(uint8Array);
      })
      .catch(reject);
  });
}
