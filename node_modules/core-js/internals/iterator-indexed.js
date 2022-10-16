'use strict';
// https://github.com/tc39/proposal-iterator-helpers
var call = require('../internals/function-call');
var anObject = require('../internals/an-object');
var getIteratorDirect = require('../internals/get-iterator-direct');
var createIteratorProxy = require('../internals/iterator-create-proxy');

var IteratorProxy = createIteratorProxy(function () {
  var result = anObject(call(this.next, this.iterator));
  var done = this.done = !!result.done;
  if (!done) return [this.index++, result.value];
});

module.exports = function indexed() {
  return new IteratorProxy(getIteratorDirect(this), {
    index: 0
  });
};
