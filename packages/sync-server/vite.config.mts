import { execSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import path from 'node:path';

import { defineConfig } from 'vite';
import type { Plugin } from 'vite';

const pkg = JSON.parse(
  readFileSync(path.resolve(__dirname, 'package.json'), 'utf-8'),
);

// Resolve a short git revision at build time so the /info endpoint can report a
// unique identifier for nightly/edge images (where the package.json version is
// the same across many commits). Prefers an explicit env var, then the
// CI-provided commit SHA, then the local git checkout. Never throws.
function resolveGitRevision(): string {
  if (process.env.ACTUAL_GIT_REVISION) {
    return process.env.ACTUAL_GIT_REVISION;
  }
  if (process.env.GITHUB_SHA) {
    return process.env.GITHUB_SHA.slice(0, 7);
  }
  try {
    return execSync('git rev-parse --short HEAD', {
      stdio: ['ignore', 'pipe', 'ignore'],
    })
      .toString()
      .trim();
  } catch {
    return '';
  }
}

const shebangPlugin = (entryFile: string): Plugin => ({
  name: 'sync-server-shebang',
  generateBundle(_options, bundle) {
    const chunk = bundle[entryFile];
    if (chunk?.type === 'chunk' && !chunk.code.startsWith('#!')) {
      chunk.code = `#!/usr/bin/env node\n${chunk.code}`;
    }
  },
});

export default defineConfig({
  ssr: {
    target: 'node',
    // Inline workspace deps that ship as TS source. Anything else
    // (express, better-sqlite3, bcrypt, @actual-app/web, etc.) stays
    // external so Node resolves it at runtime.
    noExternal: ['@actual-app/crdt'],
  },
  build: {
    ssr: true,
    target: 'node22',
    outDir: path.resolve(__dirname, 'build'),
    emptyOutDir: true,
    sourcemap: true,
    minify: false,
    rollupOptions: {
      input: {
        app: path.resolve(__dirname, 'app.ts'),
        'bin/actual-server': path.resolve(__dirname, 'bin/actual-server.js'),
        'scripts/run-migrations': path.resolve(
          __dirname,
          'src/scripts/run-migrations.js',
        ),
        'scripts/reset-password': path.resolve(
          __dirname,
          'src/scripts/reset-password.js',
        ),
        'scripts/disable-openid': path.resolve(
          __dirname,
          'src/scripts/disable-openid.js',
        ),
        'scripts/enable-openid': path.resolve(
          __dirname,
          'src/scripts/enable-openid.js',
        ),
        'scripts/health-check': path.resolve(
          __dirname,
          'src/scripts/health-check.js',
        ),
      },
      output: {
        format: 'esm',
        entryFileNames: '[name].js',
        chunkFileNames: 'chunks/[name]-[hash].js',
      },
    },
  },
  define: {
    __APP_VERSION__: JSON.stringify(pkg.version),
    __GIT_REVISION__: JSON.stringify(resolveGitRevision()),
  },
  assetsInclude: ['**/*.sql'],
  plugins: [shebangPlugin('bin/actual-server.js')],
});
