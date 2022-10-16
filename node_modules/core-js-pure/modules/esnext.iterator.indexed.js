// https://github.com/tc39/proposal-iterator-helpers
var $ = require('../internals/export');
var indexed = require('../internals/iterator-indexed');

$({ target: 'Iterator', proto: true, real: true, forced: true }, {
  indexed: indexed
});
