// A peggy version of the pegjs-jest-transformer
// Transforms .pegjs compliant files to JS code.

import * as crypto from 'crypto';

import peg from 'peggy';

const transform = {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  process(sourceText, sourcePath, _options) {
    return {
      code: `module.exports = ${peg.generate(sourceText, {
        output: 'source-with-inline-map',
        grammarSource: sourcePath,
      })}`,
    };
  },
  getCacheKey(sourceText, _sourcePath, options) {
    return crypto
      .createHash('md5')
      .update(sourceText)
      .update(options.configString)
      .digest('hex');
  },
};

export default transform;
