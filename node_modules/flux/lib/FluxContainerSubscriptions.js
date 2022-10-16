/**
 * Copyright (c) 2014-present, Facebook, Inc. All rights reserved.
 *
 * This source code is licensed under the BSD-style license found in the
 * LICENSE file in the root directory of this source tree. An additional grant
 * of patent rights can be found in the PATENTS file in the same directory.
 *
 * @providesModule FluxContainerSubscriptions
 * 
 */
'use strict';

function _defineProperty(obj, key, value) { if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }

var FluxStoreGroup = require("./FluxStoreGroup");

function shallowArrayEqual(a, b) {
  if (a === b) {
    return true;
  }

  if (a.length !== b.length) {
    return false;
  }

  for (var i = 0; i < a.length; i++) {
    if (a[i] !== b[i]) {
      return false;
    }
  }

  return true;
}

var FluxContainerSubscriptions = /*#__PURE__*/function () {
  function FluxContainerSubscriptions() {
    _defineProperty(this, "_callbacks", void 0);

    _defineProperty(this, "_storeGroup", void 0);

    _defineProperty(this, "_stores", void 0);

    _defineProperty(this, "_tokens", void 0);

    this._callbacks = [];
  }

  var _proto = FluxContainerSubscriptions.prototype;

  _proto.setStores = function setStores(stores) {
    var _this = this;

    if (this._stores && shallowArrayEqual(this._stores, stores)) {
      return;
    }

    this._stores = stores;

    this._resetTokens();

    this._resetStoreGroup();

    var changed = false;
    var changedStores = [];

    if (process.env.NODE_ENV !== "production") {
      // Keep track of the stores that changed for debugging purposes only
      this._tokens = stores.map(function (store) {
        return store.addListener(function () {
          changed = true;
          changedStores.push(store);
        });
      });
    } else {
      var setChanged = function setChanged() {
        changed = true;
      };

      this._tokens = stores.map(function (store) {
        return store.addListener(setChanged);
      });
    }

    var callCallbacks = function callCallbacks() {
      if (changed) {
        _this._callbacks.forEach(function (fn) {
          return fn();
        });

        changed = false;

        if (process.env.NODE_ENV !== "production") {
          // Uncomment this to print the stores that changed.
          // console.log(changedStores);
          changedStores = [];
        }
      }
    };

    this._storeGroup = new FluxStoreGroup(stores, callCallbacks);
  };

  _proto.addListener = function addListener(fn) {
    this._callbacks.push(fn);
  };

  _proto.reset = function reset() {
    this._resetTokens();

    this._resetStoreGroup();

    this._resetCallbacks();

    this._resetStores();
  };

  _proto._resetTokens = function _resetTokens() {
    if (this._tokens) {
      this._tokens.forEach(function (token) {
        return token.remove();
      });

      this._tokens = null;
    }
  };

  _proto._resetStoreGroup = function _resetStoreGroup() {
    if (this._storeGroup) {
      this._storeGroup.release();

      this._storeGroup = null;
    }
  };

  _proto._resetStores = function _resetStores() {
    this._stores = null;
  };

  _proto._resetCallbacks = function _resetCallbacks() {
    this._callbacks = [];
  };

  return FluxContainerSubscriptions;
}();

module.exports = FluxContainerSubscriptions;