/**
 * Copyright (c) 2014-present, Facebook, Inc.
 * All rights reserved.
 *
 * This source code is licensed under the BSD-style license found in the
 * LICENSE file in the root directory of this source tree. An additional grant
 * of patent rights can be found in the PATENTS file in the same directory.
 *
 * @providesModule EmitterSubscription
 * @typechecks
 */
'use strict';

function _inheritsLoose(subClass, superClass) { subClass.prototype = Object.create(superClass.prototype); subClass.prototype.constructor = subClass; subClass.__proto__ = superClass; }

var EventSubscription = require("./EventSubscription.js");
/**
 * EmitterSubscription represents a subscription with listener and context data.
 */


var EmitterSubscription = /*#__PURE__*/function (_EventSubscription) {
  _inheritsLoose(EmitterSubscription, _EventSubscription);

  /**
   * @param {EventSubscriptionVendor} subscriber - The subscriber that controls
   *   this subscription
   * @param {function} listener - Function to invoke when the specified event is
   *   emitted
   * @param {*} context - Optional context object to use when invoking the
   *   listener
   */
  function EmitterSubscription(subscriber, listener, context) {
    var _this;

    _this = _EventSubscription.call(this, subscriber) || this;
    _this.listener = listener;
    _this.context = context;
    return _this;
  }

  return EmitterSubscription;
}(EventSubscription);

module.exports = EmitterSubscription;