var $ = require('../internals/export');
var uncurryThisRaw = require('../internals/function-uncurry-this-raw');
var aCallable = require('../internals/a-callable');

// `Function.prototype.unThis` method
// https://github.com/js-choi/proposal-function-un-this
$({ target: 'Function', proto: true, forced: true }, {
  unThis: function unThis() {
    return uncurryThisRaw(aCallable(this));
  }
});
