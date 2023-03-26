let path = require('path');

let webpack = require('webpack');

/** @type {webpack.Configuration} */
module.exports = {
  mode: process.env.NODE_ENV === 'development' ? 'development' : 'production',
  entry: path.join(__dirname, '../src/server/main.js'),
  context: path.resolve(__dirname, '../../..'),
  devtool: false,
  output: {
    path: path.resolve(path.join(__dirname, '/../lib-dist/browser')),
    library: 'backend',
    publicPath: '/kcab/',
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
    alias: {
      fs: 'memfs',
      path: 'path-browserify',
    },
  },
  resolveLoader: {
    alias: {
      'pegjs-loader': require.resolve('pegjs-loader'),
    },
  },
  module: {
    rules: [
      {
        test: /\.m?[tj]sx?$/,
        use: {
          loader: 'babel-loader',
          options: {
            presets: ['@babel/preset-env', '@babel/preset-typescript'],
          },
        },
      },
      {
        test: /\.pegjs$/,
        use: { loader: 'pegjs-loader' },
      },
    ],
  },
  optimization: {
    namedChunks: true,
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
  node: {
    dgram: 'empty',
    net: 'empty',
    tls: 'empty',
  },
};
