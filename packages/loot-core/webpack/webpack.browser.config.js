let path = require('path');
let webpack = require('webpack');

module.exports = {
  mode: process.env.NODE_ENV === 'development' ? 'development' : 'production',
  entry: path.join(__dirname, '../src/server/main.js'),
  context: path.resolve(__dirname, '../../..'),
  devtool: false,
  output: {
    path: path.resolve(path.join(__dirname, '/../lib-dist/browser')),
    library: 'backend',
    publicPath: '/kcab/'
  },
  resolve: {
    extensions: ['.web.js', '.js', '.json'],
    alias: {
      fs: 'memfs',

      'perf-deets':
        process.env.NODE_ENV === 'development' || process.env.PERF_BUILD
          ? 'perf-deets'
          : require.resolve('perf-deets/noop')
    },
    fallback: {
      assert: require.resolve("assert/"),
      crypto: require.resolve("crypto-browserify"),
      path: require.resolve("path-browserify"),
      process: require.resolve("process/browser"),
      stream: require.resolve("stream-browserify"),
      util: require.resolve("util/"),
      zlib: require.resolve("browserify-zlib"),
    },
  },
  module: {
    rules: [
      {
        test: /\.m?js$/,
        use: {
          loader: 'babel-loader',
          options: {
            presets: ['babel-preset-jwl-app']
          }
        }
      }
    ]
  },
  optimization: {
    chunkIds: "named"
  },
  plugins: [
    new webpack.DefinePlugin({
      'process.env.IS_DEV': JSON.stringify(
        process.env.NODE_ENV === 'development'
      ),
      'process.env.IS_BETA': JSON.stringify(
        process.env.ACTUAL_RELEASE_TYPE === 'beta'
      ),
      'process.env.PUBLIC_URL': JSON.stringify(process.env.PUBLIC_URL || '/'),
      'process.env.ACTUAL_DATA_DIR': JSON.stringify('/'),
      'process.env.ACTUAL_DOCUMENT_DIR': JSON.stringify('/documents')
    }),
    new webpack.SourceMapDevToolPlugin({
      filename: '[file].map',
      exclude: /xfo.kcab/
    }),
    new webpack.IgnorePlugin({
      resourceRegExp: /worker_threads|original-fs/
    })
  ]
};
