const path = require('path');

const {
  loaderByName,
  removeLoaders,
  addAfterLoader,
  addPlugins,
} = require('@craco/craco');
const chokidar = require('chokidar');
const TerserPlugin = require('terser-webpack-plugin');
const { IgnorePlugin } = require('webpack');
const { BundleAnalyzerPlugin } = require('webpack-bundle-analyzer');

if (process.env.CI) {
  process.env.DISABLE_ESLINT_PLUGIN = 'true';
}

// Forward Netlify env variables
if (process.env.REVIEW_ID) {
  process.env.REACT_APP_REVIEW_ID = process.env.REVIEW_ID;
}

module.exports = {
  webpack: {
    configure: (webpackConfig, { env, paths }) => {
      // swc-loader
      addAfterLoader(webpackConfig, loaderByName('babel-loader'), {
        test: /\.m?[tj]sx?$/,
        exclude: /node_modules/,
        loader: require.resolve('swc-loader'),
        options: {
          jsc: {
            target: 'es2022',
            transform: {
              react: {
                runtime: 'automatic',
              },
            },
            externalHelpers: true,
            parser: {
              syntax: 'typescript',
              tsx: true,
              decorators: true,
              dynamicImport: true,
            },
          },
        },
      });

      // remove the babel loaders
      removeLoaders(webpackConfig, loaderByName('babel-loader'));

      addPlugins(webpackConfig, [
        new BundleAnalyzerPlugin({
          analyzerMode: 'disabled',
          generateStatsFile: true,
        }),
        // Pikaday throws a warning if Moment.js is not installed however it doesn't
        // actually require it to be installed. As we don't use Moment.js ourselves
        // then we can just silence this warning.
        new IgnorePlugin({
          contextRegExp: /pikaday$/,
          resourceRegExp: /moment$/,
        }),
      ]);

      webpackConfig.resolve.extensions = [
        '.web.js',
        '.web.jsx',
        '.web.ts',
        '.web.tsx',
        '.js',
        '.jsx',
        '.ts',
        '.tsx',
        ...webpackConfig.resolve.extensions,
      ];

      if (process.env.IS_GENERIC_BROWSER) {
        webpackConfig.resolve.extensions = [
          '.browser.js',
          '.browser.jsx',
          '.browser.ts',
          '.browser.tsx',
          ...webpackConfig.resolve.extensions,
        ];
      }

      webpackConfig.optimization = {
        ...webpackConfig.optimization,
        minimize: process.env.NODE_ENV !== 'development',
        minimizer: [
          new TerserPlugin({
            minify: TerserPlugin.swcMinify,
            // `terserOptions` options will be passed to `swc` (`@swc/core`)
            // Link to options - https://swc.rs/docs/config-js-minify
            terserOptions: {},
          }),
        ],
      };

      return webpackConfig;
    },
  },
  devServer: (devServerConfig, { env, paths, proxy, allowedHost }) => {
    devServerConfig.onBeforeSetupMiddleware = server => {
      chokidar
        .watch([
          path.resolve('../loot-core/lib-dist/*.js'),
          path.resolve('../loot-core/lib-dist/browser/*.js'),
        ])
        .on('all', function () {
          for (const ws of server.webSocketServer.clients) {
            ws.send(JSON.stringify({ type: 'static-changed' }));
          }
        });
    };
    devServerConfig.headers = {
      ...devServerConfig.headers,
      'Cross-Origin-Opener-Policy': 'same-origin',
      'Cross-Origin-Embedder-Policy': 'require-corp',
    };

    return devServerConfig;
  },
};
