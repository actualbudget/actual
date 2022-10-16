'use strict';
var call = require('../internals/function-call');
var create = require('../internals/object-create');
var createNonEnumerableProperty = require('../internals/create-non-enumerable-property');
var defineBuiltIns = require('../internals/define-built-ins');
var wellKnownSymbol = require('../internals/well-known-symbol');
var InternalStateModule = require('../internals/internal-state');
var getMethod = require('../internals/get-method');
var IteratorPrototype = require('../internals/iterators-core').IteratorPrototype;
var createIterResultObject = require('../internals/create-iter-result-object');
var iteratorClose = require('../internals/iterator-close');

var ITERATOR_HELPER = 'IteratorHelper';
var WRAP_FOR_VALID_ITERATOR = 'WrapForValidIterator';
var setInternalState = InternalStateModule.set;

var TO_STRING_TAG = wellKnownSymbol('toStringTag');

var createIteratorProxyPrototype = function (IS_ITERATOR) {
  var ITERATOR_PROXY = IS_ITERATOR ? WRAP_FOR_VALID_ITERATOR : ITERATOR_HELPER;

  var getInternalState = InternalStateModule.getterFor(ITERATOR_PROXY);

  var IteratorProxyPrototype = defineBuiltIns(create(IteratorPrototype), {
    next: function next() {
      var state = getInternalState(this);
      // for simplification:
      //   for `%WrapForValidIteratorPrototype%.next` our `nextHandler` returns `IterResultObject`
      //   for `%IteratorHelperPrototype%.next` - just a value
      if (IS_ITERATOR) return state.nextHandler();
      try {
        var result = state.done ? undefined : state.nextHandler();
        return createIterResultObject(result, state.done);
      } catch (error) {
        state.done = true;
        throw error;
      }
    },
    'return': function () {
      var state = getInternalState(this);
      var iterator = state.iterator;
      state.done = true;
      if (IS_ITERATOR) {
        var returnMethod = getMethod(iterator, 'return');
        return returnMethod ? call(returnMethod, iterator) : createIterResultObject(undefined, true);
      }
      var innerIterator = state.innerIterator;
      if (innerIterator) try {
        iteratorClose(innerIterator, 'return');
      } catch (error) {
        return iteratorClose(iterator, 'throw', error);
      }
      iteratorClose(iterator, 'return');
      return createIterResultObject(undefined, true);
    }
  });

  if (!IS_ITERATOR) {
    createNonEnumerableProperty(IteratorProxyPrototype, TO_STRING_TAG, 'Iterator Helper');
  }

  return IteratorProxyPrototype;
};

var IteratorHelperPrototype = createIteratorProxyPrototype(false);
var WrapForValidIteratorPrototype = createIteratorProxyPrototype(true);

module.exports = function (nextHandler, IS_ITERATOR) {
  var ITERATOR_PROXY = IS_ITERATOR ? WRAP_FOR_VALID_ITERATOR : ITERATOR_HELPER;

  var IteratorProxy = function Iterator(record, state) {
    if (state) {
      state.iterator = record.iterator;
      state.next = record.next;
    } else state = record;
    state.type = ITERATOR_PROXY;
    state.nextHandler = nextHandler;
    state.done = false;
    setInternalState(this, state);
  };

  IteratorProxy.prototype = IS_ITERATOR ? WrapForValidIteratorPrototype : IteratorHelperPrototype;

  return IteratorProxy;
};
