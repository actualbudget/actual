// https://github.com/tc39/proposal-iterator-helpers
var $ = require('../internals/export');
var indexed = require('../internals/async-iterator-indexed');

$({ target: 'AsyncIterator', proto: true, real: true, forced: true }, {
  indexed: indexed
});
