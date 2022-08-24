let webpack = require('webpack');
let config = require('./webpack.desktop.config');

config.resolve.extensions = ['.api.js', '.electron.js', '.js', '.json'];
config.output.filename = 'bundle.api.js';
config.output.sourceMapFilename = 'bundle.api.js.map';

config.plugins.push(
  new webpack.DefinePlugin({
    ACTUAL_APP_VERSION: '"0.0.147"'
  })
);

module.exports = config;
