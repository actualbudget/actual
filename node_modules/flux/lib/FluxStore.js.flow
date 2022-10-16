/**
 * Copyright (c) 2014-present, Facebook, Inc. All rights reserved.
 *
 * This source code is licensed under the BSD-style license found in the
 * LICENSE file in the root directory of this source tree. An additional grant
 * of patent rights can be found in the PATENTS file in the same directory.
 *
 * @providesModule FluxStore
 * @flow
 */

'use strict';

import type Dispatcher from 'Dispatcher';

const {EventEmitter} = require('fbemitter');

const invariant = require('invariant');

/**
 * This class represents the most basic functionality for a FluxStore. Do not
 * extend this store directly; instead extend FluxReduceStore when creating a
 * new store.
 */
class FluxStore {

  // private
  _dispatchToken: string;

  // protected, available to subclasses
  __changed: boolean;
  __changeEvent: string;
  __className: any;
  __dispatcher: Dispatcher<any>;
  __emitter: EventEmitter;

  constructor(dispatcher: Dispatcher<any>): void {
    this.__className = this.constructor.name;

    this.__changed = false;
    this.__changeEvent = 'change';
    this.__dispatcher = dispatcher;
    this.__emitter = new EventEmitter();
    this._dispatchToken = dispatcher.register((payload) => {
      this.__invokeOnDispatch(payload);
    });
  }

  addListener(callback: (eventType?: string) => void): {remove: () => void} {
    return this.__emitter.addListener(this.__changeEvent, callback);
  }

  getDispatcher(): Dispatcher<any> {
    return this.__dispatcher;
  }

  /**
   * This exposes a unique string to identify each store's registered callback.
   * This is used with the dispatcher's waitFor method to declaratively depend
   * on other stores updating themselves first.
   */
  getDispatchToken(): string {
    return this._dispatchToken;
  }

  /**
   * Returns whether the store has changed during the most recent dispatch.
   */
  hasChanged(): boolean {
    invariant(
      this.__dispatcher.isDispatching(),
      '%s.hasChanged(): Must be invoked while dispatching.',
      this.__className
    );
    return this.__changed;
  }

  __emitChange(): void {
    invariant(
      this.__dispatcher.isDispatching(),
      '%s.__emitChange(): Must be invoked while dispatching.',
      this.__className
    );
    this.__changed = true;
  }

  /**
   * This method encapsulates all logic for invoking __onDispatch. It should
   * be used for things like catching changes and emitting them after the
   * subclass has handled a payload.
   */
  __invokeOnDispatch(payload: Object): void {
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
  __onDispatch(payload: Object): void {
    invariant(
      false,
      '%s has not overridden FluxStore.__onDispatch(), which is required',
      this.__className
    );
  }
}

module.exports = FluxStore;
