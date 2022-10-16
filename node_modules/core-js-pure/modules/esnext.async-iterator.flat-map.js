'use strict';
// https://github.com/tc39/proposal-iterator-helpers
var $ = require('../internals/export');
var call = require('../internals/function-call');
var aCallable = require('../internals/a-callable');
var anObject = require('../internals/an-object');
var getIteratorDirect = require('../internals/get-iterator-direct');
var createAsyncIteratorProxy = require('../internals/async-iterator-create-proxy');
var createIterResultObject = require('../internals/create-iter-result-object');
var getAsyncIterator = require('../internals/get-async-iterator');
var closeAsyncIteration = require('../internals/async-iterator-close');

var AsyncIteratorProxy = createAsyncIteratorProxy(function (Promise) {
  var state = this;
  var iterator = state.iterator;
  var mapper = state.mapper;
  var innerIterator;

  return new Promise(function (resolve, reject) {
    var doneAndReject = function (error) {
      state.done = true;
      reject(error);
    };

    var ifAbruptCloseAsyncIterator = function (error) {
      closeAsyncIteration(iterator, doneAndReject, error, doneAndReject);
    };

    var outerLoop = function () {
      try {
        Promise.resolve(anObject(call(state.next, iterator))).then(function (step) {
          try {
            if (anObject(step).done) {
              state.done = true;
              resolve(createIterResultObject(undefined, true));
            } else {
              var value = step.value;
              try {
                Promise.resolve(mapper(value)).then(function (mapped) {
                  try {
                    state.innerIterator = innerIterator = getAsyncIterator(mapped);
                    state.innerNext = aCallable(innerIterator.next);
                    innerLoop();
                  } catch (error4) { ifAbruptCloseAsyncIterator(error4); }
                }, ifAbruptCloseAsyncIterator);
              } catch (error3) { ifAbruptCloseAsyncIterator(error3); }
            }
          } catch (error2) { doneAndReject(error2); }
        }, doneAndReject);
      } catch (error) { doneAndReject(error); }
    };

    var innerLoop = function () {
      if (innerIterator = state.innerIterator) {
        try {
          Promise.resolve(anObject(call(state.innerNext, innerIterator))).then(function (result) {
            try {
              if (anObject(result).done) {
                state.innerIterator = state.innerNext = null;
                outerLoop();
              } else resolve(createIterResultObject(result.value, false));
            } catch (error1) { ifAbruptCloseAsyncIterator(error1); }
          }, ifAbruptCloseAsyncIterator);
        } catch (error) { ifAbruptCloseAsyncIterator(error); }
      } else outerLoop();
    };

    innerLoop();
  });
});

$({ target: 'AsyncIterator', proto: true, real: true, forced: true }, {
  flatMap: function flatMap(mapper) {
    return new AsyncIteratorProxy(getIteratorDirect(this), {
      mapper: aCallable(mapper),
      innerIterator: null,
      innerNext: null
    });
  }
});
