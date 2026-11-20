// Value types SQLite accepts as bound query parameters
export type SqlParam = string | number | null;

// Opaque handles for an open database and a prepared statement. Each
// platform module (web wasm, web legacy sql.js, electron better-sqlite3)
// casts to its own concrete type internally; callers only pass them back
// into that same module.
declare const databaseBrand: unique symbol;
declare const statementBrand: unique symbol;
export type Database = { readonly [databaseBrand]?: true };
export type Statement = { readonly [statementBrand]?: true };

export type TransactionOptions = {
  // Take the write lock up front (`BEGIN IMMEDIATE`) instead of on the
  // first write. Use it for transactions that read before they write.
  // On the legacy absurd-sql backend this also avoids a bug where an
  // IndexedDB cursor is reused across the lock upgrade and a read that
  // lands just after it fails with "TransactionInactiveError".
  immediate?: boolean;
};

// Which storage backs sqlite on the web. `legacy` is sql.js over absurd-sql
// (IndexedDB blocks, needs SharedArrayBuffer); the other two use the
// official sqlite-wasm build, persisted to OPFS or, when sync access
// handles are unavailable, to IndexedDB as a whole file.
export type StorageBackend = 'legacy' | 'opfs' | 'memory-idb';

// What a web sqlite engine provides to the facade in `index.ts`
export type SqliteEngine = {
  init(options: {
    baseURL?: string;
    wasmBinary?: ArrayBuffer | Uint8Array;
  }): Promise<void>;
  setWasmBinary(binary: ArrayBuffer | Uint8Array): void;
  prepare(db: Database, sql: string): Statement;
  finalizeStatement(statement: Statement): void;
  runQuery<T>(
    db: Database,
    sql: string | Statement,
    params: SqlParam[],
    fetchAll: boolean,
  ): T[] | { changes: unknown };
  execQuery(db: Database, sql: string): void;
  openDatabase(pathOrBuffer?: string | Uint8Array): Promise<Database>;
  closeDatabase(db: Database): void;
  exportDatabase(db: Database): Promise<Uint8Array>;
};
