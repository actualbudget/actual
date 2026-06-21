// Single source of truth for the browser build's runtime assets: the sql.js
// wasm, the default budget DB, and the migration files. Two consumers:
//   - vite.config.mts (Node build) writes them to dist/ on disk.
//   - vite.browser-worker.config.mts inlines them into the worker so the
//     browser build is fully self-contained (no PUBLIC_URL fetches).
// Keeping both paths here prevents the on-disk and embedded sets from drifting.

import fs from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const lootCoreRoot = path.resolve(here, '../../loot-core');
const migrationsSrc = path.join(lootCoreRoot, 'migrations');
const defaultDbPath = path.join(lootCoreRoot, 'default-db.sqlite');

const require = createRequire(import.meta.url);

/**
 * Collect the runtime asset bytes and the data-file index in memory.
 * `dataFiles` is keyed by the wire name used in `data-file-index.txt` and
 * fetched as `data/<key>` by loot-core's populateDefaultFilesystem; JS
 * migrations get a `.data` suffix so consumer bundlers don't import-analyze
 * them (loot-core strips the suffix when writing into the worker FS).
 */
export function collectEmbeddedAssets() {
  if (!fs.statSync(migrationsSrc, { throwIfNoEntry: false })?.isDirectory()) {
    throw new Error(`migrations directory not found at ${migrationsSrc}`);
  }
  if (!fs.existsSync(defaultDbPath)) {
    throw new Error(`default-db.sqlite not found at ${defaultDbPath}`);
  }

  const migrations = fs
    .readdirSync(migrationsSrc)
    .filter(name => name.endsWith('.sql') || name.endsWith('.js'))
    .map(name => ({
      name,
      wireName: name.endsWith('.js') ? `${name}.data` : name,
      contents: fs.readFileSync(path.join(migrationsSrc, name)),
    }));

  const defaultDb = fs.readFileSync(defaultDbPath);
  const wasm = fs.readFileSync(
    require.resolve('@jlongster/sql.js/dist/sql-wasm.wasm'),
  );

  /** @type {Record<string, Buffer>} */
  const dataFiles = { 'default-db.sqlite': defaultDb };
  for (const m of migrations) {
    dataFiles[`migrations/${m.wireName}`] = m.contents;
  }

  const index =
    [
      'default-db.sqlite',
      ...migrations.map(m => `migrations/${m.wireName}`).sort(),
    ].join('\n') + '\n';

  return { migrations, defaultDb, wasm, dataFiles, index };
}

/** Write the runtime assets to dist/ exactly as the Node build expects. */
export function writeEmbeddedAssetsToDist(distDir) {
  const { migrations, defaultDb, wasm, dataFiles, index } =
    collectEmbeddedAssets();

  const migrationsDest = path.join(distDir, 'migrations');
  fs.mkdirSync(migrationsDest, { recursive: true });
  for (const m of migrations) {
    fs.writeFileSync(path.join(migrationsDest, m.name), m.contents);
  }

  fs.writeFileSync(path.join(distDir, 'default-db.sqlite'), defaultDb);
  fs.writeFileSync(path.join(distDir, 'sql-wasm.wasm'), wasm);

  const dataDir = path.join(distDir, 'data');
  fs.mkdirSync(path.join(dataDir, 'migrations'), { recursive: true });
  for (const [wire, contents] of Object.entries(dataFiles)) {
    fs.writeFileSync(path.join(dataDir, wire), contents);
  }
  fs.writeFileSync(path.join(distDir, 'data-file-index.txt'), index);
}
