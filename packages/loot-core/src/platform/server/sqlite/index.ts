import { type Database, type SqlJsStatic } from '@jlongster/sql.js';
/// <reference types="emscripten" />

// Types exported from sql.js (and Emscripten) are incomplete, so we need to redefine them here
type FSStream = (typeof FS)['FSStream'] & {
  node: (typeof FS)['FSNode'] & {
    contents: {
      readIfFallback: () => Promise<unknown>;
    };
  };
};
type FS = Omit<typeof FS, 'lookupPath' | 'open' | 'close'> & {
  lookupPath: (
    path: string,
    opts?: { follow?: boolean },
  ) => { node: (typeof FS)['FSNode'] & { link?: string } };
  open: (path: string, flags: string, mode?: number) => FSStream;
  close: (stream: FSStream) => void;
};
export type SqlJsModule = SqlJsStatic & {
  FS: FS;
  reset_filesystem: () => void;
  register_for_idb: (idb: IDBDatabase) => void;
};

export declare function init(): Promise<void>;

export declare function _getModule(): SqlJsModule;

export declare function prepare(db: Database, sql: string): string;

export declare function runQuery(
  db: Database,
  sql: string,
  params?: (string | number)[],
  fetchAll?: false,
): { changes: unknown };
export declare function runQuery<T>(
  db: Database,
  sql: string,
  params: (string | number)[],
  fetchAll: true,
): T[];

export declare function execQuery(db: Database, sql: string): void;

export declare function transaction(db: Database, fn: () => void): void;

export declare function asyncTransaction(
  db: Database,
  fn: () => Promise<void>,
): Promise<void>;

export declare function openDatabase(pathOrBuffer?: string | Buffer): Database;

export declare function closeDatabase(db: Database): void;

export declare function exportDatabase(db: Database): Promise<Uint8Array>;
