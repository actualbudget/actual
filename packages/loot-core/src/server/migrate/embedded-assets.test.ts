import fs from 'node:fs';
import path from 'node:path';

import {
  collectEmbeddedAssets,
  defaultDbPath,
  migrationsDir,
  sqlWasmPath,
} from '@actual-app/core/default-filesystem';

// The browser worker (`kcab.worker`) embeds the migrations and sql.js wasm at
// build time so the compiled AQL schema and its migrations ship as one
// content-hashed artifact. If a migration on disk is ever dropped from this
// embedded set, a freshly-loaded bundle would run its schema against migrations
// that never add the new column — reintroducing the "no such column" errors
// from issue #8290. This test fails loudly if that ever happens.
describe('embedded default filesystem', () => {
  it('embeds every migration byte-for-byte', () => {
    const migrationNames = fs
      .readdirSync(migrationsDir)
      .filter(name => name.endsWith('.sql') || name.endsWith('.js'));

    expect(migrationNames.length).toBeGreaterThan(0);

    const { dataFiles, index } = collectEmbeddedAssets();
    const indexEntries = index.split('\n').filter(Boolean);

    for (const name of migrationNames) {
      const key = `migrations/${name}`;
      const b64 = dataFiles[key];
      if (b64 == null) {
        throw new Error(`migration is not embedded in the worker: ${key}`);
      }
      const embedded = Buffer.from(b64, 'base64');
      const onDisk = fs.readFileSync(path.join(migrationsDir, name));
      expect(embedded.equals(onDisk)).toBe(true);
      expect(indexEntries).toContain(key);
    }
  });

  it('embeds the default database and sql.js wasm byte-for-byte', () => {
    const { dataFiles, wasmBase64 } = collectEmbeddedAssets();

    const embeddedDb = Buffer.from(dataFiles['default-db.sqlite'], 'base64');
    expect(embeddedDb.equals(fs.readFileSync(defaultDbPath))).toBe(true);

    const embeddedWasm = Buffer.from(wasmBase64, 'base64');
    expect(embeddedWasm.equals(fs.readFileSync(sqlWasmPath))).toBe(true);
  });
});
