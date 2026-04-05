import fs from 'fs';
import path from 'path';

import { visualizer } from 'rollup-plugin-visualizer';
import { defineConfig } from 'vite';
import dts from 'vite-plugin-dts';
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
      entry: path.resolve(__dirname, 'index.ts'),
      formats: ['cjs'],
      fileName: () => 'index.js',
    },
  },
  plugins: [
    cleanOutputDirs(),
    peggyLoader(),
    dts({
      tsconfigPath: path.resolve(__dirname, 'tsconfig.json'),
      outDir: path.resolve(__dirname, '@types'),
      rollupTypes: true,
    }),
    copyMigrationsAndDefaultDb(),
    visualizer({ template: 'raw-data', filename: 'app/stats.json' }),
  ],
  resolve: {
    conditions: ['api'],
    extensions: ['.api.ts', '.js', '.ts', '.tsx', '.json'],
  },
  test: {
    globals: true,
    onConsoleLog(log: string, type: 'stdout' | 'stderr'): boolean | void {
      // print only console.error
      return type === 'stderr';
    },
    maxWorkers: 2,
  },
});
