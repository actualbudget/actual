// Type declarations for ./default-filesystem.mjs (a Node-only build helper).

/** Absolute path to loot-core's bundled migrations directory. */
export const migrationsDir: string;
/** Absolute path to loot-core's default budget database. */
export const defaultDbPath: string;
/** Absolute path to the sql.js wasm binary loot-core depends on. */
export const sqlWasmPath: string;

/** The `data-file-index.txt` manifest listing every file under `data/`. */
export function buildDataFileIndex(): string;

/** The base64-encoded assets a self-contained browser worker embeds. */
export function collectEmbeddedAssets(): {
  wasmBase64: string;
  dataFiles: Record<string, string>;
  index: string;
};
