import fs from 'fs';
import path from 'path';

import { visualizer } from 'rollup-plugin-visualizer';
import { defineConfig } from 'vite';
import dts from 'vite-plugin-dts';
import peggyLoader from 'vite-plugin-peggy-loader';

const lootCoreRoot = path.resolve(__dirname, '../loot-core');
const distDir = path.resolve(__dirname, 'dist');
const typesDir = path.resolve(__dirname, '@types');
const inlinedTypesSrc = path.resolve(
  __dirname,
  'scripts/inlined-loot-core-types',
);

function copyDirRecursive(src: string, dest: string) {
  fs.mkdirSync(dest, { recursive: true });
  for (const name of fs.readdirSync(src)) {
    const srcPath = path.join(src, name);
    const destPath = path.join(dest, name);
    if (fs.statSync(srcPath).isDirectory()) {
      copyDirRecursive(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

function cleanOutputDirs() {
  return {
    name: 'clean-output-dirs',
    buildStart() {
      if (fs.existsSync(distDir)) fs.rmSync(distDir, { recursive: true });
      if (fs.existsSync(typesDir)) fs.rmSync(typesDir, { recursive: true });
    },
  };
}

function copyInlinedTypes() {
  return {
    name: 'copy-inlined-types',
    buildStart() {
      const dest = path.join(typesDir, 'loot-core');
      fs.mkdirSync(path.dirname(dest), { recursive: true });
      copyDirRecursive(inlinedTypesSrc, dest);
    },
  };
}

function copyMigrationsAndDefaultDb() {
  return {
    name: 'copy-migrations-and-default-db',
    closeBundle() {
      const migrationsSrc = path.join(lootCoreRoot, 'migrations');
      const migrationsDest = path.join(distDir, 'migrations');
      fs.mkdirSync(migrationsDest, { recursive: true });
      for (const name of fs.readdirSync(migrationsSrc)) {
        if (name.endsWith('.sql')) {
          fs.copyFileSync(
            path.join(migrationsSrc, name),
            path.join(migrationsDest, name),
          );
        }
      }
      fs.copyFileSync(
        path.join(lootCoreRoot, 'default-db.sqlite'),
        path.join(distDir, 'default-db.sqlite'),
      );
    },
  };
}

export default defineConfig({
  ssr: { noExternal: true, external: ['better-sqlite3'] },
  build: {
    ssr: true,
    target: 'es2021',
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
    copyInlinedTypes(),
    peggyLoader(),
    dts({
      tsconfigPath: path.resolve(__dirname, 'tsconfig.json'),
      outDir: path.resolve(__dirname, '@types'),
      rollupTypes: true,
      // Rewrite loot-core imports to inlined types so published package has no loot-core type dependency.
      beforeWriteFile(_, content) {
        return {
          content: content
            .replace(
              /from ['"]\.\/packages\/loot-core\/src\/([^'"]+)['"]/g,
              "from './loot-core/$1'",
            )
            .replace(
              /from ['"]loot-core\/([^'"]+)['"]/g,
              "from './loot-core/$1'",
            ),
        };
      },
    }),
    copyMigrationsAndDefaultDb(),
    visualizer({ template: 'raw-data', filename: 'app/stats.json' }),
  ],
  resolve: {
    extensions: ['.api.ts', '.js', '.ts', '.tsx', '.json'],
    alias: [
      {
        find: /^@actual-app\/crdt(\/.*)?$/,
        replacement: path.resolve(__dirname, '../crdt/src') + '$1',
      },
    ],
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
