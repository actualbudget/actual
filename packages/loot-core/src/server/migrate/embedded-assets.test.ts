import fs from 'node:fs';
import path from 'node:path';

import {
  collectEmbeddedAssets,
  migrationsDir,
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

    for (const name of migrationNames) {
      const key = `migrations/${name}`;
      const b64 = dataFiles[key];
      if (b64 == null) {
        throw new Error(`migration is not embedded in the worker: ${key}`);
      }
      const embedded = Buffer.from(b64, 'base64');
      const onDisk = fs.readFileSync(path.join(migrationsDir, name));
      expect(embedded.equals(onDisk)).toBe(true);
      expect(index).toContain(key);
    }
  });

  it('embeds the default database and sql.js wasm', () => {
    const { dataFiles, wasmBase64 } = collectEmbeddedAssets();

    expect(dataFiles['default-db.sqlite']).toBeDefined();
    expect(Buffer.from(wasmBase64, 'base64').length).toBeGreaterThan(0);
  });
});
