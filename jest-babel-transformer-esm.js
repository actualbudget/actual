const { join, resolve } = require('path');
const { createTransformer } = require('babel-jest');
const packagePath = resolve('./');

const packageGlob = join(packagePath, 'packages/*');

module.exports = createTransformer({
  babelrcRoots: packageGlob,

  // TODO: This is awful and a mess and we should fix it.
  //
  // Forcing this on allows certain packages in node_modules to be
  // exported as ESM, which jest usually errors on. node_modules are
  // usually not transformed, but you can allowlist one in the
  // `jest.config.js` for your project like this:
  //
  // transformIgnorePatterns: [
  //   '/node_modules/(?!absurd-sql)'
  // ],
  //
  // Without this explicit plugin, even though Jest transforms the
  // module it won't recognize ESM
  plugins: ['@babel/plugin-transform-modules-commonjs']
});
