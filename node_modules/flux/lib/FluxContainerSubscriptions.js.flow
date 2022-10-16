/**
 * Copyright (c) 2014-present, Facebook, Inc. All rights reserved.
 *
 * This source code is licensed under the BSD-style license found in the
 * LICENSE file in the root directory of this source tree. An additional grant
 * of patent rights can be found in the PATENTS file in the same directory.
 *
 * @providesModule FluxContainerSubscriptions
 * @flow
 */

'use strict';

import type FluxStore from 'FluxStore';

const FluxStoreGroup = require('FluxStoreGroup');

function shallowArrayEqual(a: Array<FluxStore>, b: Array<FluxStore>): boolean {
  if (a === b) {
    return true;
  }
  if (a.length !== b.length) {
    return false;
  }
  for (let i = 0; i < a.length; i++) {
    if (a[i] !== b[i]) {
      return false;
    }
  }
  return true;
}

class FluxContainerSubscriptions {

  _callbacks: Array<() => void>;
  _storeGroup: ?FluxStoreGroup;
  _stores: ?Array<FluxStore>;
  _tokens: ?Array<{remove: () => void}>;

  constructor() {
    this._callbacks = [];
  }

  setStores(stores: Array<FluxStore>): void {
    if (this._stores && shallowArrayEqual(this._stores, stores)) {
      return;
    }
    this._stores = stores;
    this._resetTokens();
    this._resetStoreGroup();

    let changed = false;
    let changedStores = [];

    if (__DEV__) {
      // Keep track of the stores that changed for debugging purposes only
      this._tokens = stores.map(store => store.addListener(() => {
        changed = true;
        changedStores.push(store);
      }));
    } else {
      const setChanged = () => { changed = true; };
      this._tokens = stores.map(store => store.addListener(setChanged));
    }

    const callCallbacks = () => {
      if (changed) {
        this._callbacks.forEach(fn => fn());
        changed = false;
        if (__DEV__) {
          // Uncomment this to print the stores that changed.
          // console.log(changedStores);
          changedStores = [];
        }
      }
    };
    this._storeGroup = new FluxStoreGroup(stores, callCallbacks);
  }

  addListener(fn: () => void): void {
    this._callbacks.push(fn);
  }

  reset(): void {
    this._resetTokens();
    this._resetStoreGroup();
    this._resetCallbacks();
    this._resetStores();
  }

  _resetTokens() {
    if (this._tokens) {
      this._tokens.forEach(token => token.remove());
      this._tokens = null;
    }
  }

  _resetStoreGroup(): void {
    if (this._storeGroup) {
      this._storeGroup.release();
      this._storeGroup = null;
    }
  }

  _resetStores(): void {
    this._stores = null;
  }

  _resetCallbacks(): void {
    this._callbacks = [];
  }
}

module.exports = FluxContainerSubscriptions;
