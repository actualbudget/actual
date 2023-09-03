let path = require('path');

const TerserPlugin = require('terser-webpack-plugin');
let webpack = require('webpack');
const { BundleAnalyzerPlugin } = require('webpack-bundle-analyzer');

/** @type {webpack.Configuration} */
module.exports = {
  mode: process.env.NODE_ENV === 'development' ? 'development' : 'production',
  entry: path.join(__dirname, '../src/server/main.ts'),
  context: path.resolve(__dirname, '../../..'),
  devtool: false,
  output: {
    path: path.resolve(path.join(__dirname, '/../lib-dist/browser')),
    library: 'backend',
    publicPath: '/kcab/',
  },
  stats: {
    errorDetails: true,
  },
  resolve: {
    extensions: [
      '.web.js',
      '.web.ts',
      '.web.tsx',
      '.js',
      '.ts',
      '.tsx',
      '.json',
    ],
    fallback: {
      assert: require.resolve('assert/'),
      buffer: require.resolve('buffer/'),
      // used by sql.js, but only if the 'crypto' global is not defined
      // used by adm-zip for ZipCrypto, but we don’t use that
      crypto: false,
      dgram: false,
      fs: require.resolve('memfs'),
      net: false,
      path: require.resolve('path-browserify'),
      process: require.resolve('process/browser'),
      stream: require.resolve('stream-browserify'),
      tls: false,
      // used by memfs in a check which we can ignore I think
      url: false,
      zlib: require.resolve('browserify-zlib'),
      // used by xml2js
      timers: false,
    },
  },
  module: {
    rules: [
      {
        test: /\.m?jsx?$/,
        use: {
          loader: 'esbuild-loader',
          options: {
            loader: 'jsx',
            target: 'es2022',
          },
        },
      },
      {
        test: /\.m?tsx?$/,
        use: {
          loader: 'esbuild-loader',
          options: {
            loader: 'tsx',
            target: 'es2022',
          },
        },
      },
      {
        test: /\.pegjs$/,
        use: { loader: path.resolve(__dirname, '../peg-loader.js') },
      },
    ],
  },
  optimization: {
    chunkIds: 'named',
    minimize:
      process.env.CI === 'true' || process.env.NODE_ENV !== 'development',
    minimizer: [
      new TerserPlugin({
        minify: TerserPlugin.esbuildMinify,
        // `terserOptions` options will be passed to `esbuild`
        // Link to options - https://esbuild.github.io/api/#minify
        // Note: the `minify` options is true by default (and override other `minify*` options), so if you want to disable the `minifyIdentifiers` option (or other `minify*` options) please use:
        // terserOptions: {
        //   minify: false,
        //   minifyWhitespace: true,
        //   minifyIdentifiers: false,
        //   minifySyntax: true,
        // },
        terserOptions: {},
      }),
    ],
  },
  plugins: [
    new webpack.DefinePlugin({
      'process.env': '{}',
      'process.env.IS_DEV': JSON.stringify(
        process.env.NODE_ENV === 'development',
      ),
      'process.env.PUBLIC_URL': JSON.stringify(process.env.PUBLIC_URL || '/'),
      'process.env.ACTUAL_DATA_DIR': JSON.stringify('/'),
      'process.env.ACTUAL_DOCUMENT_DIR': JSON.stringify('/documents'),
    }),
    new webpack.ProvidePlugin({
      Buffer: ['buffer', 'Buffer'],
      process: 'process/browser',
    }),
    new webpack.SourceMapDevToolPlugin({
      filename: '[file].map',
      exclude: /xfo.kcab/,
    }),
    new webpack.IgnorePlugin({
      resourceRegExp: /worker_threads|original-fs/,
    }),
    new BundleAnalyzerPlugin({
      analyzerMode: 'disabled',
      generateStatsFile: true,
    }),
  ],
};
