/**
 * Copyright (c) 2014-present, Facebook, Inc.
 * All rights reserved.
 *
 * This source code is licensed under the BSD-style license found in the
 * LICENSE file in the root directory of this source tree. An additional grant
 * of patent rights can be found in the PATENTS file in the same directory.
 *
 * @providesModule Dispatcher
 * 
 * @preventMunge
 */
'use strict';

function _defineProperty(obj, key, value) { if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }

var invariant = require("fbjs/lib/invariant");

var _prefix = 'ID_';
/**
 * Dispatcher is used to broadcast payloads to registered callbacks. This is
 * different from generic pub-sub systems in two ways:
 *
 *   1) Callbacks are not subscribed to particular events. Every payload is
 *      dispatched to every registered callback.
 *   2) Callbacks can be deferred in whole or part until other callbacks have
 *      been executed.
 *
 * For example, consider this hypothetical flight destination form, which
 * selects a default city when a country is selected:
 *
 *   var flightDispatcher = new Dispatcher();
 *
 *   // Keeps track of which country is selected
 *   var CountryStore = {country: null};
 *
 *   // Keeps track of which city is selected
 *   var CityStore = {city: null};
 *
 *   // Keeps track of the base flight price of the selected city
 *   var FlightPriceStore = {price: null}
 *
 * When a user changes the selected city, we dispatch the payload:
 *
 *   flightDispatcher.dispatch({
 *     actionType: 'city-update',
 *     selectedCity: 'paris'
 *   });
 *
 * This payload is digested by `CityStore`:
 *
 *   flightDispatcher.register(function(payload) {
 *     if (payload.actionType === 'city-update') {
 *       CityStore.city = payload.selectedCity;
 *     }
 *   });
 *
 * When the user selects a country, we dispatch the payload:
 *
 *   flightDispatcher.dispatch({
 *     actionType: 'country-update',
 *     selectedCountry: 'australia'
 *   });
 *
 * This payload is digested by both stores:
 *
 *   CountryStore.dispatchToken = flightDispatcher.register(function(payload) {
 *     if (payload.actionType === 'country-update') {
 *       CountryStore.country = payload.selectedCountry;
 *     }
 *   });
 *
 * When the callback to update `CountryStore` is registered, we save a reference
 * to the returned token. Using this token with `waitFor()`, we can guarantee
 * that `CountryStore` is updated before the callback that updates `CityStore`
 * needs to query its data.
 *
 *   CityStore.dispatchToken = flightDispatcher.register(function(payload) {
 *     if (payload.actionType === 'country-update') {
 *       // `CountryStore.country` may not be updated.
 *       flightDispatcher.waitFor([CountryStore.dispatchToken]);
 *       // `CountryStore.country` is now guaranteed to be updated.
 *
 *       // Select the default city for the new country
 *       CityStore.city = getDefaultCityForCountry(CountryStore.country);
 *     }
 *   });
 *
 * The usage of `waitFor()` can be chained, for example:
 *
 *   FlightPriceStore.dispatchToken =
 *     flightDispatcher.register(function(payload) {
 *       switch (payload.actionType) {
 *         case 'country-update':
 *         case 'city-update':
 *           flightDispatcher.waitFor([CityStore.dispatchToken]);
 *           FlightPriceStore.price =
 *             getFlightPriceStore(CountryStore.country, CityStore.city);
 *           break;
 *     }
 *   });
 *
 * The `country-update` payload will be guaranteed to invoke the stores'
 * registered callbacks in order: `CountryStore`, `CityStore`, then
 * `FlightPriceStore`.
 */

var Dispatcher = /*#__PURE__*/function () {
  function Dispatcher() {
    _defineProperty(this, "_callbacks", void 0);

    _defineProperty(this, "_isDispatching", void 0);

    _defineProperty(this, "_isHandled", void 0);

    _defineProperty(this, "_isPending", void 0);

    _defineProperty(this, "_lastID", void 0);

    _defineProperty(this, "_pendingPayload", void 0);

    this._callbacks = {};
    this._isDispatching = false;
    this._isHandled = {};
    this._isPending = {};
    this._lastID = 1;
  }
  /**
   * Registers a callback to be invoked with every dispatched payload. Returns
   * a token that can be used with `waitFor()`.
   */


  var _proto = Dispatcher.prototype;

  _proto.register = function register(callback) {
    var id = _prefix + this._lastID++;
    this._callbacks[id] = callback;
    return id;
  }
  /**
   * Removes a callback based on its token.
   */
  ;

  _proto.unregister = function unregister(id) {
    !this._callbacks[id] ? process.env.NODE_ENV !== "production" ? invariant(false, 'Dispatcher.unregister(...): `%s` does not map to a registered callback.', id) : invariant(false) : void 0;
    delete this._callbacks[id];
  }
  /**
   * Waits for the callbacks specified to be invoked before continuing execution
   * of the current callback. This method should only be used by a callback in
   * response to a dispatched payload.
   */
  ;

  _proto.waitFor = function waitFor(ids) {
    !this._isDispatching ? process.env.NODE_ENV !== "production" ? invariant(false, 'Dispatcher.waitFor(...): Must be invoked while dispatching.') : invariant(false) : void 0;

    for (var ii = 0; ii < ids.length; ii++) {
      var id = ids[ii];

      if (this._isPending[id]) {
        !this._isHandled[id] ? process.env.NODE_ENV !== "production" ? invariant(false, 'Dispatcher.waitFor(...): Circular dependency detected while ' + 'waiting for `%s`.', id) : invariant(false) : void 0;
        continue;
      }

      !this._callbacks[id] ? process.env.NODE_ENV !== "production" ? invariant(false, 'Dispatcher.waitFor(...): `%s` does not map to a registered callback.', id) : invariant(false) : void 0;

      this._invokeCallback(id);
    }
  }
  /**
   * Dispatches a payload to all registered callbacks.
   */
  ;

  _proto.dispatch = function dispatch(payload) {
    !!this._isDispatching ? process.env.NODE_ENV !== "production" ? invariant(false, 'Dispatch.dispatch(...): Cannot dispatch in the middle of a dispatch.') : invariant(false) : void 0;

    this._startDispatching(payload);

    try {
      for (var id in this._callbacks) {
        if (this._isPending[id]) {
          continue;
        }

        this._invokeCallback(id);
      }
    } finally {
      this._stopDispatching();
    }
  }
  /**
   * Is this Dispatcher currently dispatching.
   */
  ;

  _proto.isDispatching = function isDispatching() {
    return this._isDispatching;
  }
  /**
   * Call the callback stored with the given id. Also do some internal
   * bookkeeping.
   *
   * @internal
   */
  ;

  _proto._invokeCallback = function _invokeCallback(id) {
    this._isPending[id] = true;

    this._callbacks[id](this._pendingPayload);

    this._isHandled[id] = true;
  }
  /**
   * Set up bookkeeping needed when dispatching.
   *
   * @internal
   */
  ;

  _proto._startDispatching = function _startDispatching(payload) {
    for (var id in this._callbacks) {
      this._isPending[id] = false;
      this._isHandled[id] = false;
    }

    this._pendingPayload = payload;
    this._isDispatching = true;
  }
  /**
   * Clear bookkeeping used for dispatching.
   *
   * @internal
   */
  ;

  _proto._stopDispatching = function _stopDispatching() {
    delete this._pendingPayload;
    this._isDispatching = false;
  };

  return Dispatcher;
}();

module.exports = Dispatcher;