const path = require('path');

const webpack = require('webpack');
const { BundleAnalyzerPlugin } = require('webpack-bundle-analyzer');

const browser = require('./webpack.browser.config');

/** @type {webpack.Configuration} */
module.exports = {
  ...browser,
  target: 'node',
  devtool: 'source-map',
  output: {
    path: path.resolve(path.join(__dirname, '/../lib-dist/electron')),
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
    alias: {
      handlebars: 'handlebars/dist/handlebars.js',
    },
  },
  externals: ['better-sqlite3'],
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
