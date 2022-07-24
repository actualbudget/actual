let path = require('path');
let webpack = require('webpack');

module.exports = {
  mode: process.env.NODE_ENV === 'development' ? 'development' : 'production',
  target: 'node',
  entry: path.join(__dirname, '../src/server/main.js'),
  context: path.resolve(__dirname, '../../..'),
  devtool: 'source-map',
  output: {
    path: path.resolve(path.join(__dirname, '/../lib-dist')),
    filename: 'bundle.desktop.js',
    sourceMapFilename: 'bundle.desktop.js.map',
    library: {
      type: 'commonjs2'
    }
  },
  resolve: {
    extensions: ['.electron.js', '.js', '.json'],
    alias: {
      'perf-deets': require.resolve('perf-deets/noop')
    },
    fallback: {
      __dirname: false,
      __filename: false
    },
  },
  externals: [
    'better-sqlite3',
    'node-ipc',
    'electron-log',
    'node-fetch',
    'node-libofx'
  ],
  module: {
    rules: [
      {
        test: /\.m?js$/,
        use: {
          loader: 'swc-loader',
        }
      }
    ]
  },
  plugins: [
    new webpack.IgnorePlugin({
      resourceRegExp: /original-fs/
    })
  ]
};
