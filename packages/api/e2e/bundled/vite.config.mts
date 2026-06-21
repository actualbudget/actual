import { readdirSync, readFileSync, statSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { defineConfig } from 'vite';
import type { Plugin } from 'vite';

const require = createRequire(import.meta.url);
// `@actual-app/api` blocks deep subpaths, so resolve the entry and read the
// prebuilt assets from the same `dist` dir.
const apiDistDir = dirname(require.resolve('@actual-app/api'));

// The worker runs sqlite via absurd-sql, which needs SharedArrayBuffer — only
// available in a cross-origin isolated document.
function setIsolationHeaders(res: {
  setHeader: (key: string, value: string) => void;
}) {
  res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
  res.setHeader('Cross-Origin-Embedder-Policy', 'require-corp');
}
const crossOriginIsolation: Plugin = {
  name: 'cross-origin-isolation',
  configureServer(server) {
    server.middlewares.use((_req, res, next) => {
      setIsolationHeaders(res);
      next();
    });
  },
  configurePreviewServer(server) {
    server.middlewares.use((_req, res, next) => {
      setIsolationHeaders(res);
      next();
    });
  },
};

// `browser.js` resolves `./worker.js`, `sql-wasm.wasm` and its `data/` files
// relative to the bundled chunk's `import.meta.url`. Those URLs are computed at
// runtime, so the bundler never sees them — emit the prebuilt assets next to the
// output chunk (Vite places entry chunks under `assets/`).
const emitActualAssets: Plugin = {
  name: 'emit-actual-assets',
  apply: 'build',
  generateBundle(_options, bundle) {
    // Regression guard for the worker reference: if the bundler re-bundled the
    // prebuilt worker (a `worker-*.js` chunk), it would ship a duplicate 3.6 MB
    // copy and, on some bundlers, corrupt the worker's RPC. The reference must
    // stay opaque so the prebuilt worker is loaded verbatim. Check before
    // emitting our own asset so it isn't mistaken for a re-bundled chunk.
    const reBundled = Object.keys(bundle).filter(name =>
      /(^|\/)worker.*\.js$/.test(name),
    );
    if (reBundled.length > 0) {
      this.error(
        `The bundler re-bundled the prebuilt worker (${reBundled.join(
          ', ',
        )}). The \`new Worker\` reference in @actual-app/api must stay opaque ` +
          'so the prebuilt worker is loaded verbatim.',
      );
    }

    const emit = (relPath: string) => {
      this.emitFile({
        type: 'asset',
        fileName: `assets/${relPath}`,
        source: readFileSync(join(apiDistDir, relPath)),
      });
    };
    const walk = (rel: string) => {
      for (const name of readdirSync(join(apiDistDir, rel))) {
        const childRel = `${rel}/${name}`;
        if (statSync(join(apiDistDir, childRel)).isDirectory()) {
          walk(childRel);
        } else {
          emit(childRel);
        }
      }
    };

    emit('worker.js');
    emit('sql-wasm.wasm');
    emit('data-file-index.txt');
    walk('data');
  },
};

export default defineConfig({
  root: dirname(fileURLToPath(import.meta.url)),
  // Do not pre-bundle the package: esbuild's optimize step rewrites the
  // `import.meta.url`-relative worker/wasm resolution and breaks boot.
  optimizeDeps: { exclude: ['@actual-app/api'] },
  plugins: [crossOriginIsolation, emitActualAssets],
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    target: 'esnext',
  },
  server: { port: 4181, strictPort: true },
  preview: { port: 4181, strictPort: true },
});
