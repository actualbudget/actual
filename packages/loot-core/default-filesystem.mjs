// Build-time source of truth for the "default filesystem" that loot-core's
// populateDefaultFilesystem() restores at startup: the default budget DB and
// the migration files, plus the `data-file-index.txt` wire format, and the
// paths of the SQLite wasm binaries. loot-core owns these files and the
// protocol, so consumers should read them from here rather than reaching into
// loot-core's tree themselves.
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
// The legacy engine's wasm (sql.js over absurd-sql), still served by
// @actual-app/web until that engine is removed
export const sqlWasmPath =
  require.resolve('@jlongster/sql.js/dist/sql-wasm.wasm');
// The official SQLite build the sqlite-wasm engine runs on
export const sqliteWasmPath =
  require.resolve('@sqlite.org/sqlite-wasm/sqlite3.wasm');

function migrationFileNames() {
  return fs
    .readdirSync(migrationsDir)
    .filter(name => name.endsWith('.sql') || name.endsWith('.js'));
}

/**
 * The newline-delimited manifest fetched from
 * `PUBLIC_URL + 'data-file-index.txt'`, listing every file under `data/`.
 */
export function buildDataFileIndex(names = migrationFileNames()) {
  const migrations = names.map(name => `migrations/${name}`).sort();
  return ['default-db.sqlite', ...migrations].join('\n') + '\n';
}

/**
 * Everything the browser worker inlines, base64-encoded for embedding as a
 * string. `dataFiles` is keyed by the `data/<key>` name fetched at runtime.
 * The wasm is the official SQLite build: the browser worker runs the
 * sqlite-wasm engine only.
 */
export function collectEmbeddedAssets() {
  const names = migrationFileNames();
  const dataFiles = {
    'default-db.sqlite': fs.readFileSync(defaultDbPath).toString('base64'),
  };
  for (const name of names) {
    dataFiles[`migrations/${name}`] = fs
      .readFileSync(path.join(migrationsDir, name))
      .toString('base64');
  }
  return {
    wasmBase64: fs.readFileSync(sqliteWasmPath).toString('base64'),
    dataFiles,
    index: buildDataFileIndex(names),
  };
}
