import { PGlite } from '@electric-sql/pglite';

export async function openDatabase(dataDir?: string): Promise<PGlite> {
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
  });

  await initIfNecessary(db);

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

async function initIfNecessary(db: PGlite) {
  // We assume here if __migrations__ table is not yet created then this is a new database.
  // Run the init script for the initial tables where we will run the migrations against.
  const { rows: tables } = await db.query<{ exists: boolean }>(
    `SELECT EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_name = '__migrations__'
    );
    `,
  );

  if (!tables[0].exists) {
    // TODO: Figure out we can use the loot-core/src/server/sql/init.pglite.sql file instead
    await db.exec(
      `-- __migrations__ definition
        CREATE TABLE __migrations__ (
          id BIGINT PRIMARY KEY NOT NULL
        );

        -- accounts definition
        CREATE TABLE accounts (
          id VARCHAR(36) PRIMARY KEY,
          account_id VARCHAR(36),
          name TEXT,
          balance_current BIGINT,
          balance_available BIGINT,
          balance_limit BIGINT,
          mask TEXT,
          official_name TEXT,
          type TEXT,
          subtype TEXT,
          bank TEXT,
          offbudget BOOLEAN DEFAULT FALSE,
          closed BOOLEAN DEFAULT FALSE,
          tombstone BOOLEAN DEFAULT FALSE
        );

        -- banks definition
        CREATE TABLE banks (
          id VARCHAR(36) PRIMARY KEY,
          bank_id TEXT,
          name TEXT,
          tombstone BOOLEAN DEFAULT FALSE
        );

        -- categories definition
        CREATE TABLE categories (
          id VARCHAR(36) PRIMARY KEY,
          name TEXT,
          is_income BOOLEAN DEFAULT FALSE,
          cat_group VARCHAR(36),
          sort_order BIGINT,
          tombstone BOOLEAN DEFAULT FALSE
        );

        -- category_groups definition
        CREATE TABLE category_groups (
          id VARCHAR(36) PRIMARY KEY,
          name TEXT UNIQUE,
          is_income BOOLEAN DEFAULT FALSE,
          sort_order BIGINT,
          tombstone BOOLEAN DEFAULT FALSE
        );

        -- category_mapping definition
        CREATE TABLE category_mapping (
          id VARCHAR(36) PRIMARY KEY,
          transferId VARCHAR(36)
        );

        -- created_budgets definition
        CREATE TABLE created_budgets (
          month TEXT PRIMARY KEY
        );

        -- db_version definition
        CREATE TABLE db_version (
          version TEXT PRIMARY KEY
        );

        -- messages_clock definition
        CREATE TABLE messages_clock (
          id BIGINT PRIMARY KEY,
          clock TEXT
        );

        -- messages_crdt definition
        CREATE TABLE messages_crdt (
          id BIGINT PRIMARY KEY,
          timestamp BIGINT NOT NULL UNIQUE,
          dataset TEXT NOT NULL,
          row TEXT NOT NULL,
          "column" TEXT NOT NULL,
          value BYTEA NOT NULL
        );

        -- spreadsheet_cells definition
        CREATE TABLE spreadsheet_cells (
          name TEXT PRIMARY KEY,
          expr TEXT,
          cachedValue TEXT
        );

        -- transactions definition
        CREATE TABLE transactions (
          id VARCHAR(36) PRIMARY KEY,
          isParent BOOLEAN DEFAULT FALSE,
          isChild BOOLEAN DEFAULT FALSE,
          acct VARCHAR(36),
          category VARCHAR(36),
          amount BIGINT,
          description TEXT,
          notes TEXT,
          date DATE, -- INTEGER in sqlite
          financial_id TEXT,
          type TEXT,
          location TEXT,
          error TEXT,
          imported_description TEXT,
          starting_balance_flag BOOLEAN DEFAULT FALSE,
          transferred_id VARCHAR(36),
          sort_order BIGINT,  -- Using BIGINT to support large sort numbers
          tombstone BOOLEAN DEFAULT FALSE
        );

        -- pending_transactions definition
        CREATE TABLE pending_transactions (
          id VARCHAR(36) PRIMARY KEY,
          acct VARCHAR(36),
          amount BIGINT,
          description TEXT,
          date DATE, -- INTEGER in sqlite
          FOREIGN KEY(acct) REFERENCES accounts(id)
        );
      `,
    );
  }
}
