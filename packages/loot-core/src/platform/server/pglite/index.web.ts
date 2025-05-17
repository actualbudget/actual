import { PGlite, PGliteOptions, types } from '@electric-sql/pglite';
import { pg_trgm } from '@electric-sql/pglite/contrib/pg_trgm';
import { live } from '@electric-sql/pglite/live';
import { drizzle } from 'drizzle-orm/pglite';

import drizzleConfig from '../../../../drizzle.config';
import * as schema from '../../../server/db/schema';
import * as prefs from '../../../server/prefs';

import { PgliteDatabase } from '.';

let db: PgliteDatabase = null;

const serializers: PGliteOptions['serializers'] = {
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
};

const parsers: PGliteOptions['parsers'] = {
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
};

const extensions: PGliteOptions['extensions'] = {
  live,
  pg_trgm,
};

export async function openDatabase(id?: string): Promise<PgliteDatabase> {
  // if (dataDir) {
  //   const indexedDb = idb.openDatabase();
  //   return await PGlite.create({
  //     loadDataDir: new Blob([file]),
  //     relaxedDurability: true,
  //   });
  // }
  // if (id && !id.startsWith('idb://')) {
  //   throw new Error('Only idb:// dataDir is supported.');
  // }

  const dataDir = ensureDataDir(id);

  if (db) {
    if (db.$client.dataDir === dataDir) {
      return db;
    } else {
      db.$client.close();
      db = null;
    }
  }

  const client = await PGlite.create(dataDir, {
    relaxedDurability: true,
    extensions,
    // Maintain compatibility with the sqlite schema for now.
    serializers,
    parsers,
  });

  db = drizzle({
    client,
    logger: true,
    schema,
    casing: drizzleConfig.casing,
  });

  // Enable extensions as needed.
  await db.execute('CREATE EXTENSION IF NOT EXISTS pg_trgm');

  /* eslint-disable rulesdir/typography */
  const results = await db.execute(
    `SELECT table_name, column_name, data_type
      FROM information_schema.columns
      WHERE table_schema = 'actual'
      ORDER BY table_name, ordinal_position;
    `,
  );
  /* eslint-enable rulesdir/typography */

  console.log('PGlite columns:', JSON.stringify(results));

  return db;
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

function ensureDataDir(id?: string) {
  if (!id) {
    const currentPrefs = prefs.getPrefs();
    if (!currentPrefs || !currentPrefs.id) {
      throw new Error('No id provided and there is no budget file currently open.');
    }
    id = currentPrefs.id;
  }

  return `idb://${id}`;
}