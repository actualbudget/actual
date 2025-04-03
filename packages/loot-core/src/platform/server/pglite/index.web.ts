import { PGlite, types } from '@electric-sql/pglite';
import { pg_trgm } from '@electric-sql/pglite/contrib/pg_trgm';
import { live } from '@electric-sql/pglite/live';
import { drizzle } from 'drizzle-orm/pglite';

import drizzleConfig from '../../../../drizzle.config';
import * as schema from '../../../server/db/schema';

import { PgliteDatabase } from '.';

let db: PgliteDatabase | null = null;

export async function openDatabase(
  dataDir: string = 'idb://my-pgdata',
): Promise<PgliteDatabase> {
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

  if (db != null) {
    if (db.$client.dataDir === dataDir) {
      // If the database is already open and the dataDir is the same,
      // return the existing db.
      return db;
    }
    db.$client.close();
    db = null;
  }

  const pgliteClient = await PGlite.create(dataDir, {
    relaxedDurability: true,
    extensions: {
      live,
      pg_trgm,
    },
    // Maintain compatibility with the sqlite schema for now.
    serializers: {
      [types.BOOL]: value => {
        switch (value) {
          case null:
          case false:
          case 0:
            return 'FALSE';
          case true:
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

  // Enable the pg_trgm extension
  await pgliteClient.exec('CREATE EXTENSION IF NOT EXISTS pg_trgm;');

  db = drizzle({
    client: pgliteClient,
    logger: true,
    schema,
    casing: drizzleConfig.casing,
  });

  return db;
}

export async function exportDatabase(db: PgliteDatabase): Promise<Uint8Array> {
  const dump = await db.$client.dumpDataDir();
  if (dump instanceof File) {
    return await fileToUint8Array(dump);
  }
  return await blobToUint8Array(dump);
}

function fileToUint8Array(file: File): Promise<Uint8Array> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = () => {
      if (reader.result instanceof ArrayBuffer) {
        resolve(new Uint8Array(reader.result));
      } else {
        reject(new Error('Unexpected file result type'));
      }
    };

    reader.onerror = reject; // Handle any error in reading the file
    reader.readAsArrayBuffer(file); // Reads the file as an array buffer
  });
}

async function blobToUint8Array(blob: Blob): Promise<Uint8Array> {
  const arrayBuffer = await blob.arrayBuffer();
  return new Uint8Array(arrayBuffer);
}
