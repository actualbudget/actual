import { getDatabase } from '../indexeddb';

import * as T from '.';

export let init: T.Init = function () {};

function commit(trans) {
  if (trans.commit) {
    trans.commit();
  }
}

export let getItem: T.GetItem = async function (key) {
  let db = await getDatabase();

  let transaction = db.transaction(['asyncStorage'], 'readonly');
  let objectStore = transaction.objectStore('asyncStorage');

  return new Promise((resolve, reject) => {
    let req = objectStore.get(key);
    req.onerror = e => reject(e);
    req.onsuccess = e => resolve(e.target.result);
    commit(transaction);
  });
};

export let setItem: T.SetItem = async function (key, value) {
  let db = await getDatabase();

  let transaction = db.transaction(['asyncStorage'], 'readwrite');
  let objectStore = transaction.objectStore('asyncStorage');

  new Promise((resolve, reject) => {
    let req = objectStore.put(value, key);
    req.onerror = e => reject(e);
    req.onsuccess = e => resolve(undefined);
    commit(transaction);
  });
};

export let removeItem: T.RemoveItem = async function (key) {
  let db = await getDatabase();

  let transaction = db.transaction(['asyncStorage'], 'readwrite');
  let objectStore = transaction.objectStore('asyncStorage');

  return new Promise((resolve, reject) => {
    let req = objectStore.delete(key);
    req.onerror = e => reject(e);
    req.onsuccess = e => resolve(undefined);
    commit(transaction);
  });
};

export let multiGet: T.MultiGet = async function (keys) {
  let db = await getDatabase();

  let transaction = db.transaction(['asyncStorage'], 'readonly');
  let objectStore = transaction.objectStore('asyncStorage');

  let promise = Promise.all(
    keys.map(key => {
      return new Promise<[string, string]>((resolve, reject) => {
        let req = objectStore.get(key);
        req.onerror = e => reject(e);
        req.onsuccess = e => resolve([key, e.target.result]);
      });
    }),
  );

  commit(transaction);
  return promise;
};

export let multiSet: T.MultiSet = async function (keyValues) {
  let db = await getDatabase();

  let transaction = db.transaction(['asyncStorage'], 'readwrite');
  let objectStore = transaction.objectStore('asyncStorage');

  let promise = Promise.all(
    keyValues.map(([key, value]) => {
      return new Promise((resolve, reject) => {
        let req = objectStore.put(value, key);
        req.onerror = e => reject(e);
        req.onsuccess = e => resolve(undefined);
      });
    }),
  );

  commit(transaction);
  return promise;
};

export let multiRemove: T.MultiRemove = async function (keys) {
  let db = await getDatabase();

  let transaction = db.transaction(['asyncStorage'], 'readwrite');
  let objectStore = transaction.objectStore('asyncStorage');

  let promise = Promise.all(
    keys.map(key => {
      return new Promise((resolve, reject) => {
        let req = objectStore.delete(key);
        req.onerror = e => reject(e);
        req.onsuccess = e => resolve(undefined);
      });
    }),
  );

  commit(transaction);
  return promise;
};
