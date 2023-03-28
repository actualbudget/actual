let path = require('path');

let webpack = require('webpack');

let config = require('./webpack.desktop.config');

config.resolve.extensions = [
  '.api.js',
  '.api.ts',
  '.api.tsx',
  '.electron.js',
  '.electron.ts',
  '.electron.tsx',
  '.js',
  '.ts',
  '.tsx',
  '.json',
];
config.output.filename = 'bundle.api.js';
config.output.sourceMapFilename = 'bundle.api.js.map';
config.output.path = path.join(
  path.dirname(path.dirname(__dirname)),
  'api',
  'app',
);

config.plugins.push(
  new webpack.DefinePlugin({
    ACTUAL_APP_VERSION: '"0.0.147"',
  }),
);

module.exports = config;
