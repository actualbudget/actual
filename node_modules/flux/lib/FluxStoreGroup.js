/**
 * Copyright (c) 2014-present, Facebook, Inc.
 * All rights reserved.
 *
 * This source code is licensed under the BSD-style license found in the
 * LICENSE file in the root directory of this source tree. An additional grant
 * of patent rights can be found in the PATENTS file in the same directory.
 *
 * @providesModule FluxStoreGroup
 * 
 */
'use strict';

function _createForOfIteratorHelper(o, allowArrayLike) { var it = typeof Symbol !== "undefined" && o[Symbol.iterator] || o["@@iterator"]; if (!it) { if (Array.isArray(o) || (it = _unsupportedIterableToArray(o)) || allowArrayLike && o && typeof o.length === "number") { if (it) o = it; var i = 0; var F = function F() {}; return { s: F, n: function n() { if (i >= o.length) return { done: true }; return { done: false, value: o[i++] }; }, e: function e(_e) { throw _e; }, f: F }; } throw new TypeError("Invalid attempt to iterate non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method."); } var normalCompletion = true, didErr = false, err; return { s: function s() { it = it.call(o); }, n: function n() { var step = it.next(); normalCompletion = step.done; return step; }, e: function e(_e2) { didErr = true; err = _e2; }, f: function f() { try { if (!normalCompletion && it["return"] != null) it["return"](); } finally { if (didErr) throw err; } } }; }

function _unsupportedIterableToArray(o, minLen) { if (!o) return; if (typeof o === "string") return _arrayLikeToArray(o, minLen); var n = Object.prototype.toString.call(o).slice(8, -1); if (n === "Object" && o.constructor) n = o.constructor.name; if (n === "Map" || n === "Set") return Array.from(o); if (n === "Arguments" || /^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(n)) return _arrayLikeToArray(o, minLen); }

function _arrayLikeToArray(arr, len) { if (len == null || len > arr.length) len = arr.length; for (var i = 0, arr2 = new Array(len); i < len; i++) { arr2[i] = arr[i]; } return arr2; }

function _defineProperty(obj, key, value) { if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }

var invariant = require("fbjs/lib/invariant");

/**
 * FluxStoreGroup allows you to execute a callback on every dispatch after
 * waiting for each of the given stores.
 */
var FluxStoreGroup = /*#__PURE__*/function () {
  function FluxStoreGroup(stores, callback) {
    var _this = this;

    _defineProperty(this, "_dispatcher", void 0);

    _defineProperty(this, "_dispatchToken", void 0);

    this._dispatcher = _getUniformDispatcher(stores); // Precompute store tokens.

    var storeTokens = stores.map(function (store) {
      return store.getDispatchToken();
    }); // Register with the dispatcher.

    this._dispatchToken = this._dispatcher.register(function (payload) {
      _this._dispatcher.waitFor(storeTokens);

      callback();
    });
  }

  var _proto = FluxStoreGroup.prototype;

  _proto.release = function release() {
    this._dispatcher.unregister(this._dispatchToken);
  };

  return FluxStoreGroup;
}();

function _getUniformDispatcher(stores) {
  !(stores && stores.length) ? process.env.NODE_ENV !== "production" ? invariant(false, 'Must provide at least one store to FluxStoreGroup') : invariant(false) : void 0;
  var dispatcher = stores[0].getDispatcher();

  if (process.env.NODE_ENV !== "production") {
    var _iterator = _createForOfIteratorHelper(stores),
        _step;

    try {
      for (_iterator.s(); !(_step = _iterator.n()).done;) {
        var store = _step.value;
        !(store.getDispatcher() === dispatcher) ? process.env.NODE_ENV !== "production" ? invariant(false, 'All stores in a FluxStoreGroup must use the same dispatcher') : invariant(false) : void 0;
      }
    } catch (err) {
      _iterator.e(err);
    } finally {
      _iterator.f();
    }
  }

  return dispatcher;
}

module.exports = FluxStoreGroup;