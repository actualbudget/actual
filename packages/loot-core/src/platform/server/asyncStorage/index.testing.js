const store = {};

function init() {}

function getItem(key) {
  return new Promise(function (resolve) {
    return resolve(store[key]);
  });
}

function setItem(key, value) {
  store[key] = value;
}

function removeItem(key) {
  delete store[key];
}

function multiGet(keys) {
  return new Promise(function (resolve) {
    return resolve(
      keys.map(function (key) {
        return [key, store[key]];
      })
    );
  });
}

function multiSet(keyValues) {
  keyValues.forEach(function ([key, value]) {
    store[key] = value;
  });
}

function multiRemove(keys) {
  keys.forEach(function (key) {
    delete store[key];
  });
}

module.exports = {
  init,
  getItem,
  setItem,
  removeItem,
  multiGet,
  multiSet,
  multiRemove
};
