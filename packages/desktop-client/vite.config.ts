import * as path from 'path';
import { fileURLToPath } from 'url';

import babel from '@rolldown/plugin-babel';
import inject from '@rollup/plugin-inject';
import basicSsl from '@vitejs/plugin-basic-ssl';
import react, { reactCompilerPreset } from '@vitejs/plugin-react';
import type { PreRenderedAsset } from 'rolldown';
import { visualizer } from 'rollup-plugin-visualizer';
/// <reference types="vitest" />
import { defineConfig, loadEnv } from 'vite';
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

export default defineConfig(async ({ mode }) => {
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

  let resolveExtensions = [
    '.mjs',
    '.js',
    '.mts',
    '.ts',
    '.jsx',
    '.tsx',
    '.json',
  ];

  if (env.IS_GENERIC_BROWSER) {
    resolveExtensions = [
      '.browser.js',
      '.browser.jsx',
      '.browser.ts',
      '.browser.tsx',
      ...resolveExtensions,
    ];
  }

  const browserOpen = env.BROWSER_OPEN ? `//${env.BROWSER_OPEN}` : true;

  return {
    base: '/',
    envPrefix: 'REACT_APP_',
    build: {
      terserOptions: {
        compress: false,
        mangle: false,
      },
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
      headers: mode === 'development' ? devHeaders : undefined,
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
      extensions: resolveExtensions,
      alias: {
        '@desktop-client': path.join(__dirname, 'src'),
        // TODO: remove this once all loot-core imports are replaced with @actual-app/core
        'loot-core': path.join(__dirname, '../loot-core/src'),
      },
      ...(!env.IS_GENERIC_BROWSER && {
        conditions: ['electron', 'module', 'browser', 'default'],
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
              ],
            },
          }),
      injectShims(),
      addWatchers(),
      react(),
      babel({
        include: [reactCompilerInclude],
        // n.b. Must be a string to ensure plugin resolution order. See https://github.com/actualbudget/actual/pull/5853
        presets: [reactCompilerPreset()],
      }),
      visualizer({ template: 'raw-data' }),
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
