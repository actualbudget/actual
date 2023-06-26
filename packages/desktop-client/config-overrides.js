const path = require('path');

const {
  addWebpackResolve,
  override,
  overrideDevServer,
  babelInclude,
} = require('customize-cra');

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
