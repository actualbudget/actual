const { join, resolve } = require('path');
const { createTransformer } = require('babel-jest');
const packagePath = resolve('./');

const packageGlob = join(packagePath, 'packages/*');

module.exports = createTransformer({
  babelrcRoots: packageGlob
});
