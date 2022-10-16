/**
 * Copyright (c) 2014-present, Facebook, Inc. All rights reserved.
 *
 * This source code is licensed under the BSD-style license found in the
 * LICENSE file in the root directory of this source tree. An additional grant
 * of patent rights can be found in the PATENTS file in the same directory.
 *
 * @providesModule FluxStore
 * 
 */
'use strict';

function _defineProperty(obj, key, value) { if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }

var _require = require("fbemitter"),
    EventEmitter = _require.EventEmitter;

var invariant = require("fbjs/lib/invariant");
/**
 * This class represents the most basic functionality for a FluxStore. Do not
 * extend this store directly; instead extend FluxReduceStore when creating a
 * new store.
 */


var FluxStore = /*#__PURE__*/function () {
  // private
  // protected, available to subclasses
  function FluxStore(dispatcher) {
    var _this = this;

    _defineProperty(this, "_dispatchToken", void 0);

    _defineProperty(this, "__changed", void 0);

    _defineProperty(this, "__changeEvent", void 0);

    _defineProperty(this, "__className", void 0);

    _defineProperty(this, "__dispatcher", void 0);

    _defineProperty(this, "__emitter", void 0);

    this.__className = this.constructor.name;
    this.__changed = false;
    this.__changeEvent = 'change';
    this.__dispatcher = dispatcher;
    this.__emitter = new EventEmitter();
    this._dispatchToken = dispatcher.register(function (payload) {
      _this.__invokeOnDispatch(payload);
    });
  }

  var _proto = FluxStore.prototype;

  _proto.addListener = function addListener(callback) {
    return this.__emitter.addListener(this.__changeEvent, callback);
  };

  _proto.getDispatcher = function getDispatcher() {
    return this.__dispatcher;
  }
  /**
   * This exposes a unique string to identify each store's registered callback.
   * This is used with the dispatcher's waitFor method to declaratively depend
   * on other stores updating themselves first.
   */
  ;

  _proto.getDispatchToken = function getDispatchToken() {
    return this._dispatchToken;
  }
  /**
   * Returns whether the store has changed during the most recent dispatch.
   */
  ;

  _proto.hasChanged = function hasChanged() {
    !this.__dispatcher.isDispatching() ? process.env.NODE_ENV !== "production" ? invariant(false, '%s.hasChanged(): Must be invoked while dispatching.', this.__className) : invariant(false) : void 0;
    return this.__changed;
  };

  _proto.__emitChange = function __emitChange() {
    !this.__dispatcher.isDispatching() ? process.env.NODE_ENV !== "production" ? invariant(false, '%s.__emitChange(): Must be invoked while dispatching.', this.__className) : invariant(false) : void 0;
    this.__changed = true;
  }
  /**
   * This method encapsulates all logic for invoking __onDispatch. It should
   * be used for things like catching changes and emitting them after the
   * subclass has handled a payload.
   */
  ;

  _proto.__invokeOnDispatch = function __invokeOnDispatch(payload) {
    this.__changed = false;

    this.__onDispatch(payload);

    if (this.__changed) {
      this.__emitter.emit(this.__changeEvent);
    }
  }
  /**
   * The callback that will be registered with the dispatcher during
   * instantiation. Subclasses must override this method. This callback is the
   * only way the store receives new data.
   */
  ;

  _proto.__onDispatch = function __onDispatch(payload) {
    !false ? process.env.NODE_ENV !== "production" ? invariant(false, '%s has not overridden FluxStore.__onDispatch(), which is required', this.__className) : invariant(false) : void 0;
  };

  return FluxStore;
}();

module.exports = FluxStore;