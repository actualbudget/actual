import type { WasmDatabase } from '#platform/server/sqlite/wasm';

export type FileStoreKind = 'opfs' | 'memory-idb';

export type MigrationPhase = 'copy' | 'verify' | 'cleanup' | 'done' | 'failed';
export type MigrationProgress = (
  phase: MigrationPhase,
  percent?: number,
) => void;

// Where the bytes of sqlite files live on the web. The sqlite engine opens
// and closes databases through it; the filesystem layer uses it for whole
// file reads and writes (import, export, duplicate, delete).
export type SqliteFileStore = {
  readonly kind: FileStoreKind;
  open(path: string): Promise<WasmDatabase>;
  close(path: string, db: WasmDatabase): void;
  readFile(path: string): Promise<Uint8Array>;
  writeFile(path: string, bytes: Uint8Array): Promise<void>;
  removeFile(path: string): Promise<void>;
  // All or nothing: every budget involved is locked and checked before the
  // first file goes, so a directory never ends up half deleted
  removeFiles(paths: string[]): Promise<void>;
  exists(path: string): Promise<boolean>;
  // Persist anything pending (the fallback store writes lazily)
  flush(): Promise<void>;
  // Called by the engine after a statement that may have written
  onWrite?(db: WasmDatabase): void;
};
