const {
  addWebpackResolve,
  override,
  overrideDevServer,
  babelInclude,
} = require('customize-cra');
const path = require('path');

module.exports = {
  webpack: override(
    babelInclude([
      path.resolve('src'),
      path.resolve('../loot-core'),
      path.resolve('../loot-design'),
    ]),
    addWebpackResolve({
      extensions: [
        ...(process.env.IS_GENERIC_BROWSER ? ['.browser.js'] : []),
        '.web.js',
        '.js',
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
