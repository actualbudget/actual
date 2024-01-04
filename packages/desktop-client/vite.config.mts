import * as path from 'path';

import inject from '@rollup/plugin-inject';
import basicSsl from '@vitejs/plugin-basic-ssl';
import react from '@vitejs/plugin-react-swc';
import { visualizer } from 'rollup-plugin-visualizer';
/// <reference types="vitest" />
import { defineConfig, loadEnv, Plugin } from 'vite';
import viteTsconfigPaths from 'vite-tsconfig-paths';

const addWatchers = (): Plugin => ({
  name: 'add-watchers',
  configureServer(server) {
    server.watcher
      .add([
        path.resolve('../loot-core/lib-dist/*.js'),
        path.resolve('../loot-core/lib-dist/browser/*.js'),
      ])
      .on('all', function () {
        for (const wsc of server.ws.clients) {
          wsc.send(JSON.stringify({ type: 'static-changed' }));
        }
      });
  },
});

// Inject build shims using the inject plugin
const injectShims = (): Plugin[] => {
  const buildShims = path.resolve('./src/build-shims.js');
  const commonInject = {
    exclude: ['src/setupTests.jsx'],
    global: [buildShims, 'global'],
  };

  return [
    {
      name: 'inject-build-process',
      config: () => ({
        // rename process.env in build mode so it doesn't get set to an empty object up by the vite:define plugin
        // this isn't needed in serve mode, because vite:define doesn't empty it in serve mode. And defines also happen last anyways in serve mode.
        define: {
          'process.env': `_process.env`,
        },
      }),
      apply: 'build',
    },
    {
      ...inject({
        ...commonInject,
        process: [buildShims, 'process'],
      }),
      enforce: 'post',
      apply: 'serve',
    },
    {
      ...inject({
        ...commonInject,
        _process: [buildShims, 'process'],
      }),
      enforce: 'post',
      apply: 'build',
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
  }

  let resolveExtensions = [
    '.web.js',
    '.web.jsx',
    '.web.ts',
    '.web.tsx',
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

  return {
    base: '/',
    envPrefix: 'REACT_APP_',
    build: {
      target: 'es2022',
      sourcemap: true,
      outDir: 'build',
      assetsDir: 'static',
      manifest: true,
      assetsInlineLimit: 0,
      chunkSizeWarningLimit: 1500,
      rollupOptions: {
        output: {
          assetFileNames: assetInfo => {
            const info = assetInfo.name.split('.');
            let extType = info[info.length - 1];
            if (/png|jpe?g|svg|gif|tiff|bmp|ico/i.test(extType)) {
              extType = 'img';
            } else if (/woff|woff2/.test(extType)) {
              extType = 'media';
            }
            return `static/${extType}/[name]-[hash][extname]`;
          },
          chunkFileNames: 'static/js/[name]-[hash].js',
          entryFileNames: 'static/js/[name]-[hash].js',
        },
        // warning filter to suppress some expected noise
        onwarn(wrn, defaultHandler) {
          // ignore victory PURE warnings: https://github.com/rollup/rollup/issues/5324
          if (
            wrn.message.includes('victory-core') &&
            wrn.message.includes('__PURE__') &&
            wrn.message.includes(
              'contains an annotation that Rollup cannot interpret',
            )
          ) {
            return;
          }
          defaultHandler(wrn);
        },
      },
    },
    server: {
      headers: mode === 'development' ? devHeaders : undefined,
      port: +env.PORT || 5173,
      open: env.BROWSER
        ? ['chrome', 'firefox', 'edge', 'browser', 'browserPrivate'].includes(
            env.BROWSER,
          )
        : true,
      watch: {
        disableGlobbing: false,
      },
    },
    resolve: {
      extensions: resolveExtensions,
    },
    plugins: [
      injectShims(),
      addWatchers(),
      react({
        plugins: [['@swc/plugin-remove-console', {}]],
        devTarget: 'es2022',
      }),
      viteTsconfigPaths({ root: '../..' }),
      visualizer({ template: 'raw-data' }),
      !!env.HTTPS && basicSsl(),
    ],
    test: {
      include: ['src/**/*.{test,spec}.?(c|m)[jt]s?(x)'],
      environment: 'jsdom',
      globals: true,
      setupFiles: './src/setupTests.jsx',
    },
  };
});
