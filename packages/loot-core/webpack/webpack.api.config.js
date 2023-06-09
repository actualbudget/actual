let path = require('path');

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
config.resolve.fallback = {};
config.output.filename = 'bundle.api.js';
config.output.sourceMapFilename = 'bundle.api.js.map';
config.output.path = path.join(
  path.dirname(path.dirname(__dirname)),
  'api',
  'app',
);

module.exports = config;
