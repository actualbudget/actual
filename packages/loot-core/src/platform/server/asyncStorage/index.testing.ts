// @ts-strict-ignore
import { GlobalPrefsJson } from '../../../types/prefs';

import * as T from '.';

const store: Partial<GlobalPrefsJson> = {};

export const init: T.Init = function () {};

export const getItem: T.GetItem = function (key) {
  return new Promise(function (resolve) {
    return resolve(store[key]);
  });
};

export const setItem: T.SetItem = function (key, value) {
  store[key] = value;
};

export const removeItem: T.RemoveItem = function (key) {
  delete store[key];
};

export async function multiGet<K extends readonly (keyof GlobalPrefsJson)[]>(
  keys: K,
) {
  return new Promise(function (resolve) {
    return resolve(
      keys.map(function (key) {
        return [key, store[key]];
      }) as { [P in keyof K]: [K[P], GlobalPrefsJson[K[P]]] },
    );
  });
}

export const multiSet: T.MultiSet = function (keyValues) {
  keyValues.forEach(function ([key, value]) {
    store[key] = value;
  });
};

export const multiRemove: T.MultiRemove = function (keys) {
  keys.forEach(function (key) {
    delete store[key];
  });
};
