/**
 * Copyright (c) 2014-present, Facebook, Inc.
 * All rights reserved.
 *
 * This source code is licensed under the BSD-style license found in the
 * LICENSE file in the root directory of this source tree. An additional grant
 * of patent rights can be found in the PATENTS file in the same directory.
 *
 * @providesModule FluxContainer
 * 
 */
'use strict';

function _assertThisInitialized(self) { if (self === void 0) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return self; }

function _inheritsLoose(subClass, superClass) { subClass.prototype = Object.create(superClass.prototype); subClass.prototype.constructor = subClass; _setPrototypeOf(subClass, superClass); }

function _setPrototypeOf(o, p) { _setPrototypeOf = Object.setPrototypeOf || function _setPrototypeOf(o, p) { o.__proto__ = p; return o; }; return _setPrototypeOf(o, p); }

function ownKeys(object, enumerableOnly) { var keys = Object.keys(object); if (Object.getOwnPropertySymbols) { var symbols = Object.getOwnPropertySymbols(object); if (enumerableOnly) { symbols = symbols.filter(function (sym) { return Object.getOwnPropertyDescriptor(object, sym).enumerable; }); } keys.push.apply(keys, symbols); } return keys; }

function _objectSpread(target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i] != null ? arguments[i] : {}; if (i % 2) { ownKeys(Object(source), true).forEach(function (key) { _defineProperty(target, key, source[key]); }); } else if (Object.getOwnPropertyDescriptors) { Object.defineProperties(target, Object.getOwnPropertyDescriptors(source)); } else { ownKeys(Object(source)).forEach(function (key) { Object.defineProperty(target, key, Object.getOwnPropertyDescriptor(source, key)); }); } } return target; }

function _defineProperty(obj, key, value) { if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }

var FluxContainerSubscriptions = require("./FluxContainerSubscriptions");

var React = require("react");

var invariant = require("fbjs/lib/invariant");

var shallowEqual = require("fbjs/lib/shallowEqual");

var Component = React.Component;
var DEFAULT_OPTIONS = {
  pure: true,
  withProps: false,
  withContext: false
};
/**
 * A FluxContainer is used to subscribe a react component to multiple stores.
 * The stores that are used must be returned from a static `getStores()` method.
 *
 * The component receives information from the stores via state. The state
 * is generated using a static `calculateState()` method that each container
 * must implement. A simple container may look like:
 *
 *   class FooContainer extends Component {
 *     static getStores() {
 *       return [FooStore];
 *     }
 *
 *     static calculateState() {
 *       return {
 *         foo: FooStore.getState(),
 *       };
 *     }
 *
 *     render() {
 *       return <FooView {...this.state} />;
 *     }
 *   }
 *
 *   module.exports = FluxContainer.create(FooContainer);
 *
 * Flux container also supports some other, more advanced use cases. If you need
 * to base your state off of props as well:
 *
 *   class FooContainer extends Component {
 *     ...
 *
 *     static calculateState(prevState, props) {
 *       return {
 *         foo: FooStore.getSpecificFoo(props.id),
 *       };
 *     }
 *
 *     ...
 *   }
 *
 *   module.exports = FluxContainer.create(FooContainer, {withProps: true});
 *
 * Or if your stores are passed through your props:
 *
 *   class FooContainer extends Component {
 *     ...
 *
 *     static getStores(props) {
 *       const {BarStore, FooStore} = props.stores;
 *       return [BarStore, FooStore];
 *     }
 *
 *     static calculateState(prevState, props) {
 *       const {BarStore, FooStore} = props.stores;
 *       return {
 *         bar: BarStore.getState(),
 *         foo: FooStore.getState(),
 *       };
 *     }
 *
 *     ...
 *   }
 *
 *   module.exports = FluxContainer.create(FooContainer, {withProps: true});
 */

function create(Base, options) {
  enforceInterface(Base); // Construct the options using default, override with user values as necessary.

  var realOptions = _objectSpread(_objectSpread({}, DEFAULT_OPTIONS), options || {});

  var getState = function getState(state, maybeProps, maybeContext) {
    var props = realOptions.withProps ? maybeProps : undefined;
    var context = realOptions.withContext ? maybeContext : undefined;
    return Base.calculateState(state, props, context);
  };

  var getStores = function getStores(maybeProps, maybeContext) {
    var props = realOptions.withProps ? maybeProps : undefined;
    var context = realOptions.withContext ? maybeContext : undefined;
    return Base.getStores(props, context);
  }; // Build the container class.


  var ContainerClass = /*#__PURE__*/function (_Base) {
    _inheritsLoose(ContainerClass, _Base);

    function ContainerClass(props, context) {
      var _this;

      _this = _Base.call(this, props, context) || this;

      _defineProperty(_assertThisInitialized(_this), "_fluxContainerSubscriptions", void 0);

      _this._fluxContainerSubscriptions = new FluxContainerSubscriptions();

      _this._fluxContainerSubscriptions.setStores(getStores(props, context));

      _this._fluxContainerSubscriptions.addListener(function () {
        _this.setState(function (prevState, currentProps) {
          return getState(prevState, currentProps, context);
        });
      });

      var calculatedState = getState(undefined, props, context);
      _this.state = _objectSpread(_objectSpread({}, _this.state || {}), calculatedState);
      return _this;
    }

    var _proto = ContainerClass.prototype;

    _proto.UNSAFE_componentWillReceiveProps = function UNSAFE_componentWillReceiveProps(nextProps, nextContext) {
      if (_Base.prototype.UNSAFE_componentWillReceiveProps) {
        _Base.prototype.UNSAFE_componentWillReceiveProps.call(this, nextProps, nextContext);
      }

      if (_Base.prototype.componentWillReceiveProps) {
        _Base.prototype.componentWillReceiveProps.call(this, nextProps, nextContext);
      }

      if (realOptions.withProps || realOptions.withContext) {
        // Update both stores and state.
        this._fluxContainerSubscriptions.setStores(getStores(nextProps, nextContext));

        this.setState(function (prevState) {
          return getState(prevState, nextProps, nextContext);
        });
      }
    };

    _proto.componentWillUnmount = function componentWillUnmount() {
      if (_Base.prototype.componentWillUnmount) {
        _Base.prototype.componentWillUnmount.call(this);
      }

      this._fluxContainerSubscriptions.reset();
    };

    return ContainerClass;
  }(Base); // Make sure we override shouldComponentUpdate only if the pure option is
  // specified. We can't override this above because we don't want to override
  // the default behavior on accident. Super works weird with react ES6 classes.


  var container = realOptions.pure ? createPureComponent(ContainerClass) : ContainerClass; // Update the name of the container before returning

  var componentName = Base.displayName || Base.name;
  container.displayName = 'FluxContainer(' + componentName + ')';
  return container;
}

function createPureComponent(BaseComponent) {
  var PureComponent = /*#__PURE__*/function (_BaseComponent) {
    _inheritsLoose(PureComponent, _BaseComponent);

    function PureComponent() {
      return _BaseComponent.apply(this, arguments) || this;
    }

    var _proto2 = PureComponent.prototype;

    _proto2.shouldComponentUpdate = function shouldComponentUpdate(nextProps, nextState) {
      return !shallowEqual(this.props, nextProps) || !shallowEqual(this.state, nextState);
    };

    return PureComponent;
  }(BaseComponent);

  return PureComponent;
}

function enforceInterface(o) {
  !o.getStores ? process.env.NODE_ENV !== "production" ? invariant(false, 'Components that use FluxContainer must implement `static getStores()`') : invariant(false) : void 0;
  !o.calculateState ? process.env.NODE_ENV !== "production" ? invariant(false, 'Components that use FluxContainer must implement `static calculateState()`') : invariant(false) : void 0;
}
/**
 * This is a way to connect stores to a functional stateless view. Here's a
 * simple example:
 *
 *   // FooView.js
 *
 *   function FooView(props) {
 *     return <div>{props.value}</div>;
 *   }
 *
 *   module.exports = FooView;
 *
 *
 *   // FooContainer.js
 *
 *   function getStores() {
 *     return [FooStore];
 *   }
 *
 *   function calculateState() {
 *     return {
 *       value: FooStore.getState();
 *     };
 *   }
 *
 *   module.exports = FluxContainer.createFunctional(
 *     FooView,
 *     getStores,
 *     calculateState,
 *   );
 *
 */


function createFunctional(viewFn, _getStores, _calculateState, options) {
  var FunctionalContainer = /*#__PURE__*/function (_Component) {
    _inheritsLoose(FunctionalContainer, _Component);

    function FunctionalContainer() {
      var _this2;

      for (var _len = arguments.length, args = new Array(_len), _key = 0; _key < _len; _key++) {
        args[_key] = arguments[_key];
      }

      _this2 = _Component.call.apply(_Component, [this].concat(args)) || this;

      _defineProperty(_assertThisInitialized(_this2), "state", void 0);

      return _this2;
    }

    FunctionalContainer.getStores = function getStores(props, context) {
      return _getStores(props, context);
    };

    FunctionalContainer.calculateState = function calculateState(prevState, props, context) {
      return _calculateState(prevState, props, context);
    };

    var _proto3 = FunctionalContainer.prototype;

    _proto3.render = function render() {
      return viewFn(this.state);
    };

    return FunctionalContainer;
  }(Component); // Update the name of the component before creating the container.


  var viewFnName = viewFn.displayName || viewFn.name || 'FunctionalContainer';
  FunctionalContainer.displayName = viewFnName;
  return create(FunctionalContainer, options);
}

module.exports = {
  create: create,
  createFunctional: createFunctional
};