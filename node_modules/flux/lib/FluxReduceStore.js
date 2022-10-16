/**
 * Copyright (c) 2014-present, Facebook, Inc. All rights reserved.
 *
 * This source code is licensed under the BSD-style license found in the
 * LICENSE file in the root directory of this source tree. An additional grant
 * of patent rights can be found in the PATENTS file in the same directory.
 *
 * @providesModule FluxReduceStore
 * 
 */
'use strict';

function _assertThisInitialized(self) { if (self === void 0) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return self; }

function _inheritsLoose(subClass, superClass) { subClass.prototype = Object.create(superClass.prototype); subClass.prototype.constructor = subClass; _setPrototypeOf(subClass, superClass); }

function _setPrototypeOf(o, p) { _setPrototypeOf = Object.setPrototypeOf || function _setPrototypeOf(o, p) { o.__proto__ = p; return o; }; return _setPrototypeOf(o, p); }

function _defineProperty(obj, key, value) { if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }

var FluxStore = require("./FluxStore");

var abstractMethod = require("./abstractMethod");

var invariant = require("fbjs/lib/invariant");
/**
 * This is the basic building block of a Flux application. All of your stores
 * should extend this class.
 *
 *   class CounterStore extends FluxReduceStore<number> {
 *     getInitialState(): number {
 *       return 1;
 *     }
 *
 *     reduce(state: number, action: Object): number {
 *       switch(action.type) {
 *         case: 'add':
 *           return state + action.value;
 *         case: 'double':
 *           return state * 2;
 *         default:
 *           return state;
 *       }
 *     }
 *   }
 */


var FluxReduceStore = /*#__PURE__*/function (_FluxStore) {
  _inheritsLoose(FluxReduceStore, _FluxStore);

  function FluxReduceStore(dispatcher) {
    var _this;

    _this = _FluxStore.call(this, dispatcher) || this;

    _defineProperty(_assertThisInitialized(_this), "_state", void 0);

    _this._state = _this.getInitialState();
    return _this;
  }
  /**
   * Getter that exposes the entire state of this store. If your state is not
   * immutable you should override this and not expose _state directly.
   */


  var _proto = FluxReduceStore.prototype;

  _proto.getState = function getState() {
    return this._state;
  }
  /**
   * Constructs the initial state for this store. This is called once during
   * construction of the store.
   */
  ;

  _proto.getInitialState = function getInitialState() {
    return abstractMethod('FluxReduceStore', 'getInitialState');
  }
  /**
   * Used to reduce a stream of actions coming from the dispatcher into a
   * single state object.
   */
  ;

  _proto.reduce = function reduce(state, action) {
    return abstractMethod('FluxReduceStore', 'reduce');
  }
  /**
   * Checks if two versions of state are the same. You do not need to override
   * this if your state is immutable.
   */
  ;

  _proto.areEqual = function areEqual(one, two) {
    return one === two;
  };

  _proto.__invokeOnDispatch = function __invokeOnDispatch(action) {
    this.__changed = false; // Reduce the stream of incoming actions to state, update when necessary.

    var startingState = this._state;
    var endingState = this.reduce(startingState, action); // This means your ending state should never be undefined.

    !(endingState !== undefined) ? process.env.NODE_ENV !== "production" ? invariant(false, '%s returned undefined from reduce(...), did you forget to return ' + 'state in the default case? (use null if this was intentional)', this.constructor.name) : invariant(false) : void 0;

    if (!this.areEqual(startingState, endingState)) {
      this._state = endingState; // `__emitChange()` sets `this.__changed` to true and then the actual
      // change will be fired from the emitter at the end of the dispatch, this
      // is required in order to support methods like `hasChanged()`

      this.__emitChange();
    }

    if (this.__changed) {
      this.__emitter.emit(this.__changeEvent);
    }
  };

  return FluxReduceStore;
}(FluxStore);

module.exports = FluxReduceStore;