const store = {};

export const init = function () {};

export const getItem = function (key) {
  return new Promise(function (resolve) {
    return resolve(store[key]);
  });
};

export const setItem = function (key, value) {
  store[key] = value;
};

export const removeItem = function (key) {
  delete store[key];
};

export const multiGet = function (keys) {
  return new Promise(function (resolve) {
    return resolve(
      keys.map(function (key) {
        return [key, store[key]];
      }),
    );
  });
};

export const multiSet = function (keyValues) {
  keyValues.forEach(function ([key, value]) {
    store[key] = value;
  });
};

export const multiRemove = function (keys) {
  keys.forEach(function (key) {
    delete store[key];
  });
};
