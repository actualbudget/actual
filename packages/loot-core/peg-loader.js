// webpack loader for .pegjs files using Peggy.

const peg = require('peggy');

module.exports = function loadPeg(source) {
  // TODO: a second value can be returned. A JS SourceMap object.
  //       Peggy can output such an object.
  return peg.generate(source, { output: 'source', format: 'umd' });
};
