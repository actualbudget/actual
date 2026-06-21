import fs from 'fs';
import path from 'path';

import { peggyLoader } from '@actual-app/vite-plugin-peggy';
import { visualizer } from 'rollup-plugin-visualizer';
import { defineConfig } from 'vite';
import { configDefaults } from 'vitest/config';

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

// The Node build reads migrations + the default DB from disk at runtime (see
// fs.migrationsPath / bundledDatabasePath in loot-core), so copy them straight
// from loot-core next to the bundle. The browser build embeds its own copies
// via `?inline`/`?raw`, so nothing else needs to be on disk.
function copyNodeRuntimeAssets() {
  return {
    name: 'copy-node-runtime-assets',
    closeBundle() {
      fs.cpSync(
        path.join(lootCoreRoot, 'migrations'),
        path.join(distDir, 'migrations'),
        { recursive: true },
      );
      fs.copyFileSync(
        path.join(lootCoreRoot, 'default-db.sqlite'),
        path.join(distDir, 'default-db.sqlite'),
      );
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
    copyNodeRuntimeAssets(),
    visualizer({ template: 'raw-data', filename: 'app/stats.json' }),
  ],
  resolve: {
    conditions: ['api'],
  },
  test: {
    globals: true,
    // e2e/ holds Playwright tests (yarn e2e), not vitest ones.
    exclude: [...configDefaults.exclude, 'e2e/**'],
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
    reporters: process.env.CI
      ? [
          'default',
          [
            'junit',
            { outputFile: './test-results/junit.xml', suiteName: 'api' },
          ],
        ]
      : ['default'],
  },
});
