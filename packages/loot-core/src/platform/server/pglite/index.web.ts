import { PGlite, types } from '@electric-sql/pglite';
import { drizzle } from 'drizzle-orm/pglite';

import { PgliteDatabase } from '.';

export async function openDatabase(dataDir?: string): Promise<PgliteDatabase> {
  // if (dataDir) {
  //   const indexedDb = idb.openDatabase();
  //   return await PGlite.create({
  //     loadDataDir: new Blob([file]),
  //     relaxedDurability: true,
  //   });
  // }
  if (dataDir && !dataDir.startsWith('idb://')) {
    throw new Error('Only idb:// dataDir is supported.');
  }

  const db = await PGlite.create(dataDir || 'idb://my-pgdata', {
    relaxedDurability: true,
    // Maintain compatibility with the sqlite schema for now.
    serializers: {
      [types.BOOL]: value => {
        switch (value) {
          case null:
          case 0:
            return 'FALSE';
          case 1:
            return 'TRUE';
          default:
            return value;
        }
      },
    },
    parsers: {
      [types.BOOL]: value => {
        switch (value) {
          case null:
          case 'f':
            return 0;
          case 't':
            return 1;
          default:
            return value;
        }
      },
    },
  });

  return drizzle({
    client: db,
    logger: true,
  });
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
