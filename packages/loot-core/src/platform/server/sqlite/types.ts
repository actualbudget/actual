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

// Which engine holds budget files. `opfs` is the official sqlite-wasm build
// over the origin private file system, `memory-idb` the same engine kept in
// memory and persisted to IndexedDB where sync access handles are missing.
// `legacy` is the platform's native engine (Electron and the node API use
// better-sqlite3); the browser's previous absurd-sql engine of that name is
// gone, and asking for it yields the default.
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
