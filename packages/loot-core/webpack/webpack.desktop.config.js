let path = require('path');

let webpack = require('webpack');
const { BundleAnalyzerPlugin } = require('webpack-bundle-analyzer');

let browser = require('./webpack.browser.config');

/** @type {webpack.Configuration} */
module.exports = {
  ...browser,
  target: 'node',
  devtool: 'source-map',
  output: {
    path: path.resolve(path.join(__dirname, '/../lib-dist')),
    filename: 'bundle.desktop.js',
    sourceMapFilename: 'bundle.desktop.js.map',
    libraryTarget: 'commonjs2',
  },
  resolve: {
    extensions: [
      '.electron.js',
      '.electron.ts',
      '.electron.tsx',
      '.js',
      '.ts',
      '.tsx',
      '.json',
      'pegjs',
    ],
  },
  externals: [
    'better-sqlite3',
    'electron-log',
    'node-fetch',
    'node-libofx',
    'ws',
    'fs',
  ],
  plugins: [
    new webpack.IgnorePlugin({
      resourceRegExp: /original-fs/,
    }),
    new BundleAnalyzerPlugin({
      analyzerMode: 'disabled',
      generateStatsFile: true,
    }),
  ],
  node: {
    __dirname: false,
    __filename: false,
  },
};
