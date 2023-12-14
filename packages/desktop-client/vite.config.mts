import * as path from 'path';

import inject from '@rollup/plugin-inject';
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
      rollupOptions: {
        output: {
          assetFileNames: assetInfo => {
            const info = assetInfo.name.split('.');
            let extType = info[info.length - 1];
            if (/png|jpe?g|svg|gif|tiff|bmp|ico/i.test(extType)) {
              extType = 'img';
            } else if (/woff|woff2/.test(extType)) {
              extType = 'css';
            }
            return `static/${extType}/[name]-[hash][extname]`;
          },
          chunkFileNames: 'static/js/[name]-[hash].js',
          entryFileNames: 'static/js/[name]-[hash].js',
          manualChunks: {
            react: [
              'react',
              'react-router-dom',
              'react-redux',
              'react-spring',
              'react-dnd',
              'react-dom',
              'react-modal',
              'react-dnd-html5-backend',
              '@react-aria/listbox',
              '@reach/listbox',
              'downshift',
            ],
            recharts: ['recharts'],
            dates: ['date-fns', 'pikaday'],
            glamor: ['glamor'],
          },
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
      visualizer({ template: 'raw-data' }),
      react({
        plugins: [['@swc/plugin-remove-console', {}]],
        devTarget: 'es2022',
      }),
      viteTsconfigPaths({ root: '../..' }),
    ],
    test: {
      include: ['src/**/*.{test,spec}.?(c|m)[jt]s?(x)'],
      environment: 'jsdom',
      globals: true,
      setupFiles: './src/setupTests.jsx',
    },
  };
});
