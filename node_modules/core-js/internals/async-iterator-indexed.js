'use strict';
// https://github.com/tc39/proposal-iterator-helpers
var call = require('../internals/function-call');
var anObject = require('../internals/an-object');
var getIteratorDirect = require('../internals/get-iterator-direct');
var createAsyncIteratorProxy = require('../internals/async-iterator-create-proxy');
var createIterResultObject = require('../internals/create-iter-result-object');

var AsyncIteratorProxy = createAsyncIteratorProxy(function (Promise) {
  var state = this;
  var iterator = state.iterator;

  return Promise.resolve(anObject(call(state.next, iterator))).then(function (step) {
    if (anObject(step).done) {
      state.done = true;
      return createIterResultObject(undefined, true);
    }
    return createIterResultObject([state.index++, step.value], false);
  }).then(null, function (error) {
    state.done = true;
    throw error;
  });
});

module.exports = function indexed() {
  return new AsyncIteratorProxy(getIteratorDirect(this), {
    index: 0
  });
};
