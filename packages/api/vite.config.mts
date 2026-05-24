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
    },
  };
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
      entry: {
        index: path.resolve(__dirname, 'index.ts'),
        models: path.resolve(__dirname, 'models.ts'),
      },
      formats: ['cjs'],
      fileName: (_format, entryName) => `${entryName}.js`,
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
    // Each test loads a budget file and runs all DB migrations, which can be
    // slow on busy CI runners; the default 5s timeout is too tight and causes
    // flaky timeouts (and a cascade of unhandled rejections from in-flight work
    // continuing after teardown).
    testTimeout: 20_000,
    hookTimeout: 20_000,
    onConsoleLog(log: string, type: 'stdout' | 'stderr'): boolean | void {
      // print only console.error
      return type === 'stderr';
    },
    maxWorkers: 2,
  },
});
