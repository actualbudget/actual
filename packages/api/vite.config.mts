import fs from 'fs';
import path from 'path';

import { visualizer } from 'rollup-plugin-visualizer';
import { defineConfig } from 'vite';
import peggyLoader from 'vite-plugin-peggy-loader';

const lootCoreRoot = path.resolve(__dirname, '../loot-core');
const distDir = path.resolve(__dirname, 'dist');
const typesDir = path.resolve(__dirname, '@types');

function cleanOutputDirs() {
  return {
    name: 'clean-output-dirs',
    buildStart() {
      if (fs.existsSync(distDir)) fs.rmSync(distDir, { recursive: true });
      if (fs.existsSync(typesDir)) fs.rmSync(typesDir, { recursive: true });
    },
  };
}

function copyMigrationsAndDefaultDb() {
  return {
    name: 'copy-migrations-and-default-db',
    closeBundle() {
      const migrationsSrc = path.join(lootCoreRoot, 'migrations');
      const defaultDbPath = path.join(lootCoreRoot, 'default-db.sqlite');

      if (!fs.existsSync(migrationsSrc)) {
        throw new Error(`migrations directory not found at ${migrationsSrc}`);
      }
      const migrationsStat = fs.statSync(migrationsSrc);
      if (!migrationsStat.isDirectory()) {
        throw new Error(`migrations path is not a directory: ${migrationsSrc}`);
      }

      const migrationsDest = path.join(distDir, 'migrations');
      fs.mkdirSync(migrationsDest, { recursive: true });
      for (const name of fs.readdirSync(migrationsSrc)) {
        if (name.endsWith('.sql') || name.endsWith('.js')) {
          fs.copyFileSync(
            path.join(migrationsSrc, name),
            path.join(migrationsDest, name),
          );
        }
      }

      if (!fs.existsSync(defaultDbPath)) {
        throw new Error(`default-db.sqlite not found at ${defaultDbPath}`);
      }
      fs.copyFileSync(defaultDbPath, path.join(distDir, 'default-db.sqlite'));

      // Browser consumers need sql.js' WASM to be served at the same origin
      // as the bundle. Ship it alongside dist/ so downstream apps just point
      // a static handler at dist and don't have to reach into node_modules.
      const sqlJsWasm = require.resolve('@jlongster/sql.js/dist/sql-wasm.wasm');
      fs.copyFileSync(sqlJsWasm, path.join(distDir, 'sql-wasm.wasm'));

      // loot-core's browser fs bootstraps by fetching:
      //   `${PUBLIC_URL}data-file-index.txt`  - flat manifest
      //   `${PUBLIC_URL}data/<name>`          - each file listed in the manifest
      // We point PUBLIC_URL at the api's dist dir at runtime (see
      // index.browser.ts), so these two shapes need to exist here.
      //
      // data-file-index.txt: one path per line, relative to `data/`.
      const migrationNames = fs
        .readdirSync(migrationsDest)
        .sort()
        .map(name => `migrations/${name}`);
      const manifest =
        ['default-db.sqlite', ...migrationNames].join('\n') + '\n';
      fs.writeFileSync(path.join(distDir, 'data-file-index.txt'), manifest);

      // data/ mirror: the browser fs fetches `data/<name>` rather than
      // `<name>`, so materialize a `data/` subdir with hard links (fast,
      // no duplicated bytes). Falls back to copy if the filesystem refuses
      // hard links — shouldn't happen on unix, may on some mounted shares.
      const dataDir = path.join(distDir, 'data');
      fs.mkdirSync(path.join(dataDir, 'migrations'), { recursive: true });

      linkOrCopy(
        path.join(distDir, 'default-db.sqlite'),
        path.join(dataDir, 'default-db.sqlite'),
      );
      for (const name of fs.readdirSync(migrationsDest)) {
        linkOrCopy(
          path.join(migrationsDest, name),
          path.join(dataDir, 'migrations', name),
        );
      }
    },
  };
}

function linkOrCopy(src: string, dest: string) {
  try {
    fs.linkSync(src, dest);
  } catch {
    fs.copyFileSync(src, dest);
  }
}

export default defineConfig({
  ssr: {
    noExternal: true,
    external: ['better-sqlite3'],
    resolve: { conditions: ['api'] },
  },
  build: {
    ssr: true,
    target: 'node20',
    outDir: distDir,
    emptyOutDir: true,
    sourcemap: true,
    lib: {
      entry: path.resolve(__dirname, 'index.ts'),
      formats: ['cjs'],
      fileName: () => 'index.js',
    },
  },
  plugins: [
    cleanOutputDirs(),
    peggyLoader(),
    copyMigrationsAndDefaultDb(),
    visualizer({ template: 'raw-data', filename: 'app/stats.json' }),
  ],
  resolve: {
    conditions: ['api'],
  },
  test: {
    globals: true,
    environment: 'node',
    setupFiles: ['./test/setup.node.ts'],
    exclude: ['**/node_modules/**', '**/browser-facade.test.ts'],
    onConsoleLog(log: string, type: 'stdout' | 'stderr'): boolean | void {
      // print only console.error
      return type === 'stderr';
    },
    maxWorkers: 2,
  },
});
