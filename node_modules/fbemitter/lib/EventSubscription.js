/**
 * Copyright (c) 2014-present, Facebook, Inc.
 * All rights reserved.
 *
 * This source code is licensed under the BSD-style license found in the
 * LICENSE file in the root directory of this source tree. An additional grant
 * of patent rights can be found in the PATENTS file in the same directory.
 *
 * @providesModule EventSubscription
 * @typechecks
 */
'use strict';
/**
 * EventSubscription represents a subscription to a particular event. It can
 * remove its own subscription.
 */

var EventSubscription = /*#__PURE__*/function () {
  /**
   * @param {EventSubscriptionVendor} subscriber the subscriber that controls
   *   this subscription.
   */
  function EventSubscription(subscriber) {
    this.subscriber = subscriber;
  }
  /**
   * Removes this subscription from the subscriber that controls it.
   */


  var _proto = EventSubscription.prototype;

  _proto.remove = function remove() {
    if (this.subscriber) {
      this.subscriber.removeSubscription(this);
      this.subscriber = null;
    }
  };

  return EventSubscription;
}();

module.exports = EventSubscription;