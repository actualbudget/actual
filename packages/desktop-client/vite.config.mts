import { spawn } from 'node:child_process';
import type { ChildProcess } from 'node:child_process';
import { createReadStream } from 'node:fs';
import { cp, mkdir, readdir, rename, rm, writeFile } from 'node:fs/promises';
import * as path from 'path';
import { fileURLToPath } from 'url';

import babel from '@rolldown/plugin-babel';
import inject from '@rollup/plugin-inject';
import basicSsl from '@vitejs/plugin-basic-ssl';
import react, { reactCompilerPreset } from '@vitejs/plugin-react';
import type { PreRenderedAsset } from 'rolldown';
import { visualizer } from 'rollup-plugin-visualizer';
/// <reference types="vitest" />
import { build, defineConfig, loadEnv } from 'vite';
import type { Plugin } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const reactCompilerInclude = new RegExp(
  `^${path
    .resolve(__dirname, 'src')
    .replaceAll(path.sep, '/')
    .replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}/.*\\.[jt]sx$`,
);

const addWatchers = (): Plugin => ({
  name: 'add-watchers',
  configureServer(server) {
    server.watcher
      .add([
        path.resolve('../loot-core/lib-dist/electron/*.js'),
        path.resolve('../loot-core/lib-dist/browser/*.js'),
      ])
      .on('all', function () {
        for (const wsc of server.ws.clients) {
          wsc.send(JSON.stringify({ type: 'static-changed' }));
        }
      });
  },
});

const injectPlugin = (options?: Parameters<typeof inject>[0]): Plugin => {
  // Rollup plugins are currently slightly API-incompatible with Rolldown plugins, but not in a way that prevents them from working here.
  return inject(options) as unknown as Plugin;
};

// Inject build shims using the inject plugin
const injectShims = (): Plugin[] => {
  const buildShims = path.resolve('./src/build-shims.js');
  const serveInject: {
    exclude: string[];
    global: [string, string];
  } = {
    exclude: ['src/setupTests.ts'],
    global: [buildShims, 'global'],
  };
  const buildInject: {
    global: [string, string];
  } = {
    global: [buildShims, 'global'],
  };

  return [
    {
      name: 'define-build-process',
      config: () => ({
        // rename process.env in build mode so it doesn't get set to an empty object up by the vite:define plugin
        // this isn't needed in serve mode, because vite:define doesn't empty it in serve mode. And defines also happen last anyways in serve mode.
        environments: {
          client: {
            define: {
              'process.env': '_process.env',
            },
          },
        },
      }),
      apply: 'build',
    },
    {
      enforce: 'post',
      apply: 'serve',
      ...injectPlugin({
        ...serveInject,
        process: [buildShims, 'process'],
      }),
    },
    {
      name: 'inject-build-process',
      enforce: 'post',
      apply: 'build',
      config: () => ({
        build: {
          rolldownOptions: {
            transform: {
              inject: {
                ...buildInject,
                _process: [buildShims, 'process'],
              },
            },
          },
        },
      }),
    },
  ];
};

// https://vitejs.dev/config/

const lootCoreRoot = path.resolve(__dirname, '../loot-core');
const lootCoreOutDir = path.resolve(lootCoreRoot, 'lib-dist/browser');
const lootCoreConfig = path.resolve(lootCoreRoot, 'vite.config.mts');
const sqlWasmSrc = path.resolve(
  __dirname,
  '../../node_modules/@jlongster/sql.js/dist/sql-wasm.wasm',
);
const publicDir = path.resolve(__dirname, 'public');
const publicDataDir = path.resolve(publicDir, 'data');
const publicKcabDir = path.resolve(publicDir, 'kcab');
const buildStatsDir = path.resolve(__dirname, 'build-stats');
const pluginsServiceDistDir = path.resolve(
  __dirname,
  '../plugins-service/dist',
);
const serviceWorkerDir = path.resolve(__dirname, 'service-worker');

const WORKER_FILENAME_RE = /^kcab\.worker\.(.+)\.js$/;

async function extractWorkerHash(): Promise<string> {
  const files = await readdir(lootCoreOutDir);
  for (const f of files) {
    const match = f.match(WORKER_FILENAME_RE);
    if (match) return match[1];
  }
  throw new Error(
    `loot-core worker build produced no hashed output at ${lootCoreOutDir}`,
  );
}

// Serve loot-core worker assets with correct content types so the browser can
// stream-compile the sql.js wasm module.
const CONTENT_TYPES: Record<string, string> = {
  '.js': 'application/javascript',
  '.mjs': 'application/javascript',
  '.map': 'application/json',
  '.wasm': 'application/wasm',
};

async function stagePluginsService(): Promise<void> {
  await rm(serviceWorkerDir, { recursive: true, force: true });
  await cp(pluginsServiceDistDir, serviceWorkerDir, { recursive: true });
}

async function stagePublicData(): Promise<void> {
  const migrationsDest = path.resolve(publicDataDir, 'migrations');
  await mkdir(publicDataDir, { recursive: true });
  await rm(migrationsDest, { recursive: true, force: true });
  await Promise.all([
    cp(path.resolve(lootCoreRoot, 'migrations'), migrationsDest, {
      recursive: true,
    }),
    cp(
      path.resolve(lootCoreRoot, 'default-db.sqlite'),
      path.resolve(publicDataDir, 'default-db.sqlite'),
    ),
    cp(sqlWasmSrc, path.resolve(publicDir, 'sql-wasm.wasm')),
  ]);

  const entries = await readdir(publicDataDir, {
    recursive: true,
    withFileTypes: true,
  });
  const files = entries
    .filter(e => e.isFile())
    .map(e =>
      path
        .relative(publicDataDir, path.join(e.parentPath, e.name))
        .replaceAll(path.sep, '/'),
    )
    .sort();
  await writeFile(
    path.resolve(publicDir, 'data-file-index.txt'),
    files.join('\n') + '\n',
  );
}

const lootCoreBackend = (): Plugin => ({
  name: 'loot-core-backend',
  configureServer(server) {
    const child: ChildProcess = spawn(
      'yarn',
      [
        'vite',
        'build',
        '--config',
        lootCoreConfig,
        '--mode',
        'development',
        '--watch',
      ],
      { cwd: lootCoreRoot, stdio: 'inherit' },
    );
    child.on('error', err => {
      server.config.logger.error(
        `loot-core backend failed to spawn: ${err.message}`,
      );
    });
    const cleanup = () => {
      if (!child.killed) child.kill('SIGTERM');
    };
    server.httpServer?.once('close', cleanup);
    process.once('SIGINT', cleanup);
    process.once('SIGTERM', cleanup);
    process.once('exit', cleanup);

    server.middlewares.use('/kcab', (req, res, next) => {
      const url = new URL(req.url ?? '/', 'http://localhost');
      const filePath = path.join(lootCoreOutDir, url.pathname);
      if (!filePath.startsWith(lootCoreOutDir + path.sep)) return next();
      const stream = createReadStream(filePath);
      stream
        .on('open', () => {
          res.setHeader(
            'Content-Type',
            CONTENT_TYPES[path.extname(filePath)] ?? 'application/octet-stream',
          );
          stream.pipe(res);
        })
        .on('error', () => next());
    });
  },
  async closeBundle() {
    await mkdir(buildStatsDir, { recursive: true });
    try {
      await rename(
        path.resolve(__dirname, 'build/kcab/stats.json'),
        path.resolve(buildStatsDir, 'loot-core-stats.json'),
      );
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code !== 'ENOENT') throw err;
    }
  },
});

const pluginsServiceAssets = (): Plugin => ({
  name: 'plugins-service-assets',
  configureServer(server) {
    server.middlewares.use('/service-worker', (req, res, next) => {
      const url = new URL(req.url ?? '/', 'http://localhost');
      const filePath = path.join(pluginsServiceDistDir, url.pathname);
      if (!filePath.startsWith(pluginsServiceDistDir + path.sep)) return next();
      const stream = createReadStream(filePath);
      stream
        .on('open', () => {
          res.setHeader(
            'Content-Type',
            CONTENT_TYPES[path.extname(filePath)] ?? 'application/octet-stream',
          );
          stream.pipe(res);
        })
        .on('error', () => next());
    });
  },
});

export default defineConfig(async ({ mode, command }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const devHeaders = {
    'Cross-Origin-Opener-Policy': 'same-origin',
    'Cross-Origin-Embedder-Policy': 'require-corp',
  };

  // Forward Netlify env variables
  if (process.env.REVIEW_ID) {
    process.env.REACT_APP_REVIEW_ID = process.env.REVIEW_ID;
    process.env.REACT_APP_BRANCH = process.env.BRANCH;
  }

  // Electron packaging (--mode=desktop) bundles loot-core directly, so skip
  // all browser-only staging there.
  if (mode !== 'desktop') {
    if (command === 'build') {
      const stageKcab = build({
        configFile: lootCoreConfig,
        mode: 'production',
        root: lootCoreRoot,
      }).then(async () => {
        const hash = await extractWorkerHash();
        await rm(publicKcabDir, { recursive: true, force: true });
        await cp(lootCoreOutDir, publicKcabDir, { recursive: true });
        return hash;
      });
      const [, , hash] = await Promise.all([
        stagePublicData(),
        stagePluginsService(),
        stageKcab,
      ]);
      process.env.REACT_APP_BACKEND_WORKER_HASH = hash;
    } else {
      await stagePublicData();
      process.env.REACT_APP_BACKEND_WORKER_HASH = 'dev';
    }
  }

  const browserOpen = env.BROWSER_OPEN ? `//${env.BROWSER_OPEN}` : true;

  return {
    base: '/',
    envPrefix: 'REACT_APP_',
    build: {
      minify: false,
      target: 'es2022',
      sourcemap: true,
      outDir: mode === 'desktop' ? 'build-electron' : 'build',
      assetsDir: 'static',
      manifest: true,
      assetsInlineLimit: 0,
      chunkSizeWarningLimit: 1500,
      rolldownOptions: {
        output: {
          assetFileNames: (assetInfo: PreRenderedAsset) => {
            const info = assetInfo.name?.split('.') ?? [];
            let extType = info[info.length - 1];
            if (/png|jpe?g|svg|gif|tiff|bmp|ico/i.test(extType)) {
              extType = 'img';
            } else if (/woff|woff2/.test(extType)) {
              extType = 'media';
            }
            return `static/${extType}/[name].[hash][extname]`;
          },
          chunkFileNames: 'static/js/[name].[hash].chunk.js',
          entryFileNames: 'static/js/[name].[hash].js',
        },
      },
    },
    server: {
      host: true,
      headers: devHeaders,
      port: +env.PORT || 5173,
      open: env.BROWSER
        ? ['chrome', 'firefox', 'edge', 'browser', 'browserPrivate'].includes(
            env.BROWSER,
          )
        : browserOpen,
      watch: {
        disableGlobbing: false,
      },
    },
    resolve: {
      ...(mode !== 'browser' && {
        conditions: ['electron-renderer', 'module', 'browser', 'default'],
      }),
      tsconfigPaths: true,
    },
    plugins: [
      // electron (desktop) builds do not support PWA
      mode === 'desktop'
        ? undefined
        : VitePWA({
            registerType: 'prompt',
            // TODO:  The plugin worker build is currently disabled due to issues with offline support. Fix this
            // strategies: 'injectManifest',
            // srcDir: 'service-worker',
            // filename: 'plugin-sw.js',
            // manifest: {
            //   name: 'Actual',
            //   short_name: 'Actual',
            //   description: 'A local-first personal finance tool',
            //   theme_color: '#5c3dbb',
            //   background_color: '#5c3dbb',
            //   display: 'standalone',
            //   start_url: './',
            // },
            // injectManifest: {
            //   maximumFileSizeToCacheInBytes: 10 * 1024 * 1024, // 10MB
            //   swSrc: `service-worker/plugin-sw.js`,
            // },
            devOptions: {
              enabled: true, // We need service worker in dev mode to work with plugins
              type: 'module',
            },
            workbox: {
              globPatterns: [
                '**/*.{js,css,html,txt,wasm,sql,sqlite,ico,png,woff2,webmanifest}',
              ],
              ignoreURLParametersMatching: [/^v$/],
              navigateFallback: '/index.html',
              maximumFileSizeToCacheInBytes: 10 * 1024 * 1024, // 10MB
              navigateFallbackDenylist: [
                /^\/account\/.*$/,
                /^\/admin\/.*$/,
                /^\/secret\/.*$/,
                /^\/openid\/.*$/,
                /^\/plugins\/.*$/,
                /^\/kcab\/.*$/,
                /^\/plugin-data\/.*$/,
                /^\/enablebanking\/.*$/,
              ],
            },
          }),
      injectShims(),
      addWatchers(),
      mode === 'desktop' ? undefined : lootCoreBackend(),
      mode === 'desktop' ? undefined : pluginsServiceAssets(),
      react(),
      babel({
        include: [reactCompilerInclude],
        // n.b. Must be a string to ensure plugin resolution order. See https://github.com/actualbudget/actual/pull/5853
        presets: [reactCompilerPreset()],
      }),
      visualizer({
        template: 'raw-data',
        filename: 'build-stats/web-stats.json',
      }),
      !!env.HTTPS && basicSsl(),
    ],
    test: {
      include: ['src/**/*.{test,spec}.?(c|m)[jt]s?(x)'],
      environment: 'jsdom',
      globals: true,
      setupFiles: './src/setupTests.ts',
      testTimeout: 10000,
      onConsoleLog(log: string, type: 'stdout' | 'stderr'): boolean | void {
        // print only console.error
        return type === 'stderr';
      },
      maxWorkers: 2,
    },
  };
});
