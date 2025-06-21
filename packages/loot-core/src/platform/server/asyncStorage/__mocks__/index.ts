// @ts-strict-ignore
import { GlobalPrefsJson } from '../../../../types/prefs';
import * as T from '../index-types';

const store: GlobalPrefsJson = {};

export const init: T.Init = function () {};

export const getItem: T.GetItem = async function (key) {
  return store[key];
};

export const setItem: T.SetItem = async function (key, value) {
  store[key] = value;
};

export const removeItem: T.RemoveItem = async function (key) {
  delete store[key];
};

export async function multiGet<K extends readonly (keyof GlobalPrefsJson)[]>(
  keys: K,
): Promise<{ [P in K[number]]: GlobalPrefsJson[P] }> {
  const results = keys.map(key => [key, store[key]]) as {
    [P in keyof K]: [K[P], GlobalPrefsJson[K[P]]];
  };

  // Convert the array of tuples to an object with properly typed properties
  return results.reduce(
    (acc, [key, value]) => {
      acc[key] = value;
      return acc;
    },
    {} as { [P in K[number]]: GlobalPrefsJson[P] },
  );
}

export const multiSet: T.MultiSet = async function (keyValues) {
  keyValues.forEach(function ([key, value]) {
    store[key] = value;
  });
};

export const multiRemove: T.MultiRemove = async function (keys) {
  keys.forEach(function (key) {
    delete store[key];
  });
};
