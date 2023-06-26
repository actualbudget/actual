import * as T from '.';

let store = {};

export let init: T.Init = function () {};

export let getItem: T.GetItem = function (key) {
  return new Promise(function (resolve) {
    return resolve(store[key]);
  });
};

export let setItem: T.SetItem = function (key, value) {
  store[key] = value;
};

export let removeItem: T.RemoveItem = function (key) {
  delete store[key];
};

export let multiGet: T.MultiGet = function (keys) {
  return new Promise(function (resolve) {
    return resolve(
      keys.map(function (key) {
        return [key, store[key]];
      }),
    );
  });
};

export let multiSet: T.MultiSet = function (keyValues) {
  keyValues.forEach(function ([key, value]) {
    store[key] = value;
  });
};

export let multiRemove: T.MultiRemove = function (keys) {
  keys.forEach(function (key) {
    delete store[key];
  });
};
