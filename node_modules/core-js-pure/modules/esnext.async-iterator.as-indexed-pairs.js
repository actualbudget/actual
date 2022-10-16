// TODO: Remove from `core-js@4`
// https://github.com/tc39/proposal-iterator-helpers
var $ = require('../internals/export');
var indexed = require('../internals/async-iterator-indexed');

$({ target: 'AsyncIterator', name: 'indexed', proto: true, real: true, forced: true }, {
  asIndexedPairs: indexed
});
