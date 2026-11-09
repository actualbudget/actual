import type { WasmDatabase } from '#platform/server/sqlite/wasm';

export type FileStoreKind = 'opfs' | 'memory-idb';

export type MigrationPhase = 'copy' | 'verify' | 'cleanup' | 'done' | 'failed';
export type MigrationProgress = (
  phase: MigrationPhase,
  percent?: number,
) => void;

// A removal also drops the file's absurd-sql copy and its row, unless that
// copy is what the file is being moved to: then the copy stays and the row
// becomes the legacy filesystem's marker
export type RemoveOptions = { keepLegacyCopy?: boolean };

// Where the bytes of sqlite files live on the web. The sqlite engine opens
// and closes databases through it; the filesystem layer uses it for whole
// file reads and writes (import, export, duplicate, delete).
export type SqliteFileStore = {
  readonly kind: FileStoreKind;
  open(path: string): Promise<WasmDatabase>;
  close(path: string, db: WasmDatabase): void;
  readFile(path: string): Promise<Uint8Array>;
  writeFile(path: string, bytes: Uint8Array): Promise<void>;
  removeFile(path: string, options?: RemoveOptions): Promise<void>;
  // All or nothing: every budget involved is locked and checked before the
  // first file goes, so a directory never ends up half deleted
  removeFiles(paths: string[], options?: RemoveOptions): Promise<void>;
  exists(path: string): Promise<boolean>;
  isOpen(path: string): boolean;
  // Persist anything pending (the fallback store writes lazily)
  flush(): Promise<void>;
  // Let go of every handle and lock so another worker can take over
  releaseAll(): Promise<void>;
  // Called by the engine after a statement that may have written
  onWrite?(db: WasmDatabase): void;
};
