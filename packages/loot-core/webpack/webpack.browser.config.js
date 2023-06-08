let path = require('path');

let webpack = require('webpack');

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
    alias: {},
    fallback: {
      assert: require.resolve('assert/'),
      // used by sql.js, but only if the 'crypto' global is not defined
      // used by adm-zip in a way that needs it so un
      crypto: false,
      dgram: false,
      fs: require.resolve('memfs'),
      net: false,
      path: require.resolve('path-browserify'),
      // used by memfs, but only if the 'process' global is not defined
      process: false,
      stream: require.resolve('stream-browserify'),
      tls: false,
      // used by memfs in a check which we can ignore I think
      url: false,
      util: require.resolve('util/'),
      zlib: require.resolve('browserify-zlib'),
    },
  },
  module: {
    rules: [
      {
        test: /\.m?[tj]sx?$/,
        exclude: /\.electron\.m?[tj]sx?$/,
        use: {
          loader: 'babel-loader',
          options: {
            presets: ['@babel/preset-env', '@babel/preset-typescript'],
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
  },
  plugins: [
    new webpack.DefinePlugin({
      'process.env.IS_DEV': JSON.stringify(
        process.env.NODE_ENV === 'development',
      ),
      'process.env.IS_BETA': JSON.stringify(
        process.env.ACTUAL_RELEASE_TYPE === 'beta',
      ),
      'process.env.PUBLIC_URL': JSON.stringify(process.env.PUBLIC_URL || '/'),
      'process.env.ACTUAL_DATA_DIR': JSON.stringify('/'),
      'process.env.ACTUAL_DOCUMENT_DIR': JSON.stringify('/documents'),
    }),
    new webpack.SourceMapDevToolPlugin({
      filename: '[file].map',
      exclude: /xfo.kcab/,
    }),
    new webpack.IgnorePlugin({
      resourceRegExp: /worker_threads|original-fs/,
    }),
  ],
};
