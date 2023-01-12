const fs = require('fs');
const { join } = require('path');

const lootFs = require('../fs');

let getStorePath = () => join(lootFs.getDataDir(), 'global-store.json');
let store;
let persisted = true;

function init({ persist = true } = {}) {
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
}

function _saveStore() {
  if (persisted) {
    return new Promise(function (resolve, reject) {
      fs.writeFile(
        getStorePath(),
        JSON.stringify(store),
        'utf8',
        function (err, _) {
          return err ? reject(err) : resolve();
        }
      );
    });
  }
}

function getItem(key) {
  return new Promise(function (resolve) {
    return resolve(store[key]);
  });
}

function setItem(key, value) {
  store[key] = value;
  return _saveStore();
}

function removeItem(key) {
  delete store[key];
  return _saveStore();
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
  return _saveStore();
}

function multiRemove(keys) {
  keys.forEach(function (key) {
    delete store[key];
  });
  return _saveStore();
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
