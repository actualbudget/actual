import * as T from '.';

const store = {};

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

export const multiGet: T.MultiGet = function (keys) {
  return new Promise(function (resolve) {
    return resolve(
      keys.map(function (key) {
        return [key, store[key]];
      }),
    );
  });
};

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
