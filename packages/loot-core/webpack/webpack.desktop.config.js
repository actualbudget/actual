let path = require('path');

let webpack = require('webpack');

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
    ],
  },
  externals: [
    'better-sqlite3',
    'node-ipc',
    'electron-log',
    'node-fetch',
    'node-libofx',
  ],
  plugins: [
    new webpack.IgnorePlugin({
      resourceRegExp: /original-fs/,
    }),
  ],
  node: {
    __dirname: false,
    __filename: false,
  },
};
