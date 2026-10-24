// Value types SQLite accepts as bound query parameters
export type SqlParam = string | number | Uint8Array | null;

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

// What a web sqlite engine provides to the facade in `index.ts`. Engines
// other than the default register themselves at startup, so a build that
// never imports one does not bundle it.
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
