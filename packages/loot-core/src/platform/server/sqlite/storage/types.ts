import type { OpenDatabaseOptions } from '#platform/server/sqlite/types';
import type { WasmDatabase } from '#platform/server/sqlite/wasm';

export type FileStoreKind = 'opfs' | 'memory-idb';

export type MigrationPhase = 'copy' | 'verify' | 'cleanup' | 'done' | 'failed';
export type MigrationProgress = (
  phase: MigrationPhase,
  percent?: number,
) => void;

// What an operation may do with a database's absurd-sql copy: move it
// into the store, refuse to go on while there is one, or read it where
// it is
export type LegacyCopyUse = 'move' | 'refuse' | 'read';

// Where the bytes of sqlite files live on the web. The sqlite engine opens
// and closes databases through it; the filesystem layer uses it for whole
// file reads and writes (import, export, duplicate, delete).
export type SqliteFileStore = {
  readonly kind: FileStoreKind;
  // The only operation that moves an absurd-sql copy into the store, and
  // only when told it may: otherwise such a database is not opened
  open(path: string, options?: OpenDatabaseOptions): Promise<WasmDatabase>;
  close(path: string, db: WasmDatabase): void;
  // An absurd-sql copy that has not been moved is read where it is
  readFile(path: string): Promise<Uint8Array>;
  writeFile(path: string, bytes: Uint8Array): Promise<void>;
  // A removal also drops the file's absurd-sql copy and its row
  removeFile(path: string): Promise<void>;
  // All or nothing: every budget involved is locked and checked before the
  // first file goes, so a directory never ends up half deleted
  removeFiles(paths: string[]): Promise<void>;
  // Moves the file back to an absurd-sql copy and leaves the legacy
  // filesystem's marker, holding the budget from the read to the cutover so
  // the copy is never older than the file; a file recorded but never saved
  // just loses its row
  revertFile(path: string): Promise<void>;
  exists(path: string): Promise<boolean>;
  // Persist anything pending (the fallback store writes lazily)
  flush(): Promise<void>;
  // Let go of every handle and lock so another worker can take over
  releaseAll(): Promise<void>;
  // Called by the engine after a statement that may have written
  onWrite?(db: WasmDatabase): void;
};
