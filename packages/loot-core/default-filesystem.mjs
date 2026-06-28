// Build-time source of truth for the "default filesystem" that loot-core's
// populateDefaultFilesystem() restores at startup: the sql.js wasm, the default
// budget DB, and the migration files, plus the `data-file-index.txt` wire
// format. loot-core owns these files and the protocol, so consumers should read
// them from here rather than reaching into loot-core's tree themselves.
//
// Consumers:
//   - @actual-app/api embeds them into its self-contained browser worker, and
//     copies the migrations + default DB next to its Node build.
//   - @actual-app/web serves them as static files from `public/`.

import fs from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);

export const migrationsDir = path.join(root, 'migrations');
export const defaultDbPath = path.join(root, 'default-db.sqlite');
export const sqlWasmPath =
  require.resolve('@jlongster/sql.js/dist/sql-wasm.wasm');

function migrationFileNames() {
  return fs
    .readdirSync(migrationsDir)
    .filter(name => name.endsWith('.sql') || name.endsWith('.js'));
}

/**
 * Single source of truth for the files served under `data/` (the default budget
 * DB and every migration). Each entry pairs the runtime `data/<key>` name with
 * its absolute source path, so the embedded bytes, the manifest, and the build
 * watch list are all derived from one list and can never drift apart.
 */
function dataFileEntries() {
  return [
    { key: 'default-db.sqlite', path: defaultDbPath },
    ...migrationFileNames().map(name => ({
      key: `migrations/${name}`,
      path: path.join(migrationsDir, name),
    })),
  ];
}

/**
 * The newline-delimited manifest fetched from
 * `PUBLIC_URL + 'data-file-index.txt'`, listing every file under `data/`.
 */
export function buildDataFileIndex(entries = dataFileEntries()) {
  return (
    entries
      .map(entry => entry.key)
      .sort((a, b) => (a < b ? -1 : a > b ? 1 : 0))
      .join('\n') + '\n'
  );
}

/**
 * The absolute paths of every source file `collectEmbeddedAssets()` reads, so
 * build tooling can register them as watch dependencies (e.g. Vite's
 * `this.addWatchFile`) and rebuild when any of them changes.
 */
export function embeddedAssetPaths() {
  // `migrationsDir` is watched too so that adding/removing/renaming a migration
  // (not just editing an existing one) invalidates the embedded manifest.
  return [
    sqlWasmPath,
    migrationsDir,
    ...dataFileEntries().map(entry => entry.path),
  ];
}

/**
 * Everything the browser worker inlines, base64-encoded for embedding as a
 * string. `dataFiles` is keyed by the `data/<key>` name fetched at runtime.
 */
export function collectEmbeddedAssets() {
  const entries = dataFileEntries();
  const dataFiles = {};
  for (const entry of entries) {
    dataFiles[entry.key] = fs.readFileSync(entry.path).toString('base64');
  }
  return {
    wasmBase64: fs.readFileSync(sqlWasmPath).toString('base64'),
    dataFiles,
    index: buildDataFileIndex(entries),
  };
}
