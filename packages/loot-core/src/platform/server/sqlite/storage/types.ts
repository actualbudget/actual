import type { WasmDatabase } from '#platform/server/sqlite/wasm';

export type FileStoreKind = 'opfs' | 'memory-idb';

export type OpenOptions = {
  // Create the database file when it does not exist. Defaults to true to
  // match how a missing file behaved on the legacy backend.
  create?: boolean;
};

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
  open(path: string, options?: OpenOptions): Promise<WasmDatabase>;
  close(path: string, db: WasmDatabase): void;
  isOpen(path: string): boolean;
  readFile(path: string): Promise<Uint8Array>;
  writeFile(path: string, bytes: Uint8Array): Promise<void>;
  removeFile(path: string): Promise<void>;
  exists(path: string): Promise<boolean>;
  // Persist anything pending (the fallback store writes lazily)
  flush(path?: string): Promise<void>;
  // Let go of every handle and lock so another worker can take over
  releaseAll(): Promise<void>;
  // Called by the engine after a statement that may have written
  onWrite?(db: WasmDatabase): void;
};
