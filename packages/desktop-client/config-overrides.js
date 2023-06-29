const path = require('path');

const {
  addWebpackPlugin,
  addWebpackResolve,
  babelInclude,
  override,
  overrideDevServer,
} = require('customize-cra');
const { IgnorePlugin } = require('webpack');
const { BundleAnalyzerPlugin } = require('webpack-bundle-analyzer');

if (process.env.CI) {
  process.env.DISABLE_ESLINT_PLUGIN = 'true';
}

module.exports = {
  webpack: override(
    babelInclude([path.resolve('src'), path.resolve('../loot-core')]),
    addWebpackResolve({
      extensions: [
        ...(process.env.IS_GENERIC_BROWSER
          ? ['.browser.js', '.browser.ts', '.browser.tsx']
          : []),
        '.web.js',
        '.web.ts',
        '.web.tsx',
        '.js',
        '.ts',
        '.tsx',
      ],
    }),
    addWebpackPlugin(
      new BundleAnalyzerPlugin({
        analyzerMode: 'disabled',
        generateStatsFile: true,
      }),
    ),
    // Pikaday throws a warning if Moment.js is not installed however it doesn't
    // actually require it to be installed. As we don't use Moment.js ourselves
    // then we can just silence this warning.
    addWebpackPlugin(
      new IgnorePlugin({
        contextRegExp: /moment$/,
        resourceRegExp: /pikaday$/,
      }),
    ),
    config => {
      config.cache = false;
      return config;
    },
  ),
  devServer: overrideDevServer(config => {
    return {
      ...config,
      headers: {
        ...config.headers,
        'Cross-Origin-Opener-Policy': 'same-origin',
        'Cross-Origin-Embedder-Policy': 'require-corp',
      },
    };
  }),
};
