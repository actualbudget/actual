import * as fs from 'fs';
import { join } from 'path';

import * as lootFs from '../fs';

let getStorePath = () => join(lootFs.getDataDir(), 'global-store.json');
let store;
let persisted = true;

export const init = function ({ persist = true } = {}) {
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

function _saveStore() {
  if (persisted) {
    return new Promise(function (resolve, reject) {
      fs.writeFile(
        getStorePath(),
        JSON.stringify(store),
        'utf8',
        function (err) {
          return err ? reject(err) : resolve(undefined);
        },
      );
    });
  }
}

export const getItem = function (key) {
  return new Promise(function (resolve) {
    return resolve(store[key]);
  });
};

export const setItem = function (key, value) {
  store[key] = value;
  return _saveStore();
};

export const removeItem = function (key) {
  delete store[key];
  return _saveStore();
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
  return _saveStore();
};

export const multiRemove = function (keys) {
  keys.forEach(function (key) {
    delete store[key];
  });
  return _saveStore();
};
