/**
 * Copyright (c) 2014-present, Facebook, Inc. All rights reserved.
 *
 * This source code is licensed under the BSD-style license found in the
 * LICENSE file in the root directory of this source tree. An additional grant
 * of patent rights can be found in the PATENTS file in the same directory.
 *
 * @providesModule FluxMixinLegacy
 * 
 */
'use strict';

function _createForOfIteratorHelper(o, allowArrayLike) { var it = typeof Symbol !== "undefined" && o[Symbol.iterator] || o["@@iterator"]; if (!it) { if (Array.isArray(o) || (it = _unsupportedIterableToArray(o)) || allowArrayLike && o && typeof o.length === "number") { if (it) o = it; var i = 0; var F = function F() {}; return { s: F, n: function n() { if (i >= o.length) return { done: true }; return { done: false, value: o[i++] }; }, e: function e(_e) { throw _e; }, f: F }; } throw new TypeError("Invalid attempt to iterate non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method."); } var normalCompletion = true, didErr = false, err; return { s: function s() { it = it.call(o); }, n: function n() { var step = it.next(); normalCompletion = step.done; return step; }, e: function e(_e2) { didErr = true; err = _e2; }, f: function f() { try { if (!normalCompletion && it["return"] != null) it["return"](); } finally { if (didErr) throw err; } } }; }

function _unsupportedIterableToArray(o, minLen) { if (!o) return; if (typeof o === "string") return _arrayLikeToArray(o, minLen); var n = Object.prototype.toString.call(o).slice(8, -1); if (n === "Object" && o.constructor) n = o.constructor.name; if (n === "Map" || n === "Set") return Array.from(o); if (n === "Arguments" || /^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(n)) return _arrayLikeToArray(o, minLen); }

function _arrayLikeToArray(arr, len) { if (len == null || len > arr.length) len = arr.length; for (var i = 0, arr2 = new Array(len); i < len; i++) { arr2[i] = arr[i]; } return arr2; }

var FluxStoreGroup = require("./FluxStoreGroup");

var invariant = require("fbjs/lib/invariant");

/**
 * `FluxContainer` should be preferred over this mixin, but it requires using
 * react with classes. So this mixin is provided where it is not yet possible
 * to convert a container to be a class.
 *
 * This mixin should be used for React components that have state based purely
 * on stores. `this.props` will not be available inside of `calculateState()`.
 *
 * This mixin will only `setState` not replace it, so you should always return
 * every key in your state unless you know what you are doing. Consider this:
 *
 *   var Foo = React.createClass({
 *     mixins: [
 *       FluxMixinLegacy([FooStore])
 *     ],
 *
 *     statics: {
 *       calculateState(prevState) {
 *         if (!prevState) {
 *           return {
 *             foo: FooStore.getFoo(),
 *           };
 *         }
 *
 *         return {
 *           bar: FooStore.getBar(),
 *         };
 *       }
 *     },
 *   });
 *
 * On the second calculateState when prevState is not null, the state will be
 * updated to contain the previous foo AND the bar that was just returned. Only
 * returning bar will not delete foo.
 *
 */
function FluxMixinLegacy(stores) {
  var options = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {
    withProps: false
  };
  stores = stores.filter(function (store) {
    return !!store;
  });
  return {
    getInitialState: function getInitialState() {
      enforceInterface(this);
      return options.withProps ? this.constructor.calculateState(null, this.props) : this.constructor.calculateState(null, undefined);
    },
    componentWillMount: function componentWillMount() {
      var _this = this;

      // This tracks when any store has changed and we may need to update.
      var changed = false;

      var setChanged = function setChanged() {
        changed = true;
      }; // This adds subscriptions to stores. When a store changes all we do is
      // set changed to true.


      this._fluxMixinSubscriptions = stores.map(function (store) {
        return store.addListener(setChanged);
      }); // This callback is called after the dispatch of the relevant stores. If
      // any have reported a change we update the state, then reset changed.

      var callback = function callback() {
        if (changed) {
          _this.setState(function (prevState) {
            return options.withProps ? _this.constructor.calculateState(prevState, _this.props) : _this.constructor.calculateState(prevState, undefined);
          });
        }

        changed = false;
      };

      this._fluxMixinStoreGroup = new FluxStoreGroup(stores, callback);
    },
    componentWillUnmount: function componentWillUnmount() {
      this._fluxMixinStoreGroup.release();

      var _iterator = _createForOfIteratorHelper(this._fluxMixinSubscriptions),
          _step;

      try {
        for (_iterator.s(); !(_step = _iterator.n()).done;) {
          var subscription = _step.value;
          subscription.remove();
        }
      } catch (err) {
        _iterator.e(err);
      } finally {
        _iterator.f();
      }

      this._fluxMixinSubscriptions = [];
    }
  };
}

function enforceInterface(o) {
  !o.constructor.calculateState ? process.env.NODE_ENV !== "production" ? invariant(false, 'Components that use FluxMixinLegacy must implement ' + '`calculateState()` on the statics object') : invariant(false) : void 0;
}

module.exports = FluxMixinLegacy;