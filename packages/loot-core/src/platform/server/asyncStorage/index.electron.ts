// @ts-strict-ignore
import * as fs from 'fs';
import { join } from 'path';

import { GlobalPrefsJson } from '../../../types/prefs';
import * as lootFs from '../fs';

import * as T from './index.d';

const getStorePath = () => join(lootFs.getDataDir(), 'global-store.json');
let store: GlobalPrefsJson;
let persisted = true;

export const init: T.Init = function ({ persist = true } = {}) {
  if (persist) {
    try {
      store = JSON.parse(fs.readFileSync(getStorePath(), 'utf8'));
    } catch (e) {
      store = {};
    }
  } else {
    store = {};
  }

  persisted = persist;
};

function _saveStore(): Promise<void> {
  if (persisted) {
    return new Promise(function (resolve, reject) {
      fs.writeFile(
        getStorePath(),
        JSON.stringify(store),
        'utf8',
        function (err) {
          return err ? reject(err) : resolve();
        },
      );
    });
  }
}

export const getItem: T.GetItem = function (key) {
  return new Promise(function (resolve) {
    return resolve(store[key]);
  });
};

export const setItem: T.SetItem = function (key, value) {
  store[key] = value;
  return _saveStore();
};

export const removeItem: T.RemoveItem = function (key) {
  delete store[key];
  return _saveStore();
};

export async function multiGet<K extends readonly (keyof GlobalPrefsJson)[]>(
  keys: K,
) {
  return keys.map(key => [key, store[key]]) as {
    [P in keyof K]: [K[P], GlobalPrefsJson[K[P]]];
  };
}

export const multiSet: T.MultiSet = function (keyValues) {
  keyValues.forEach(function ([key, value]) {
    store[key] = value;
  });
  return _saveStore();
};

export const multiRemove: T.MultiRemove = function (keys) {
  keys.forEach(function (key) {
    delete store[key];
  });
  return _saveStore();
};
