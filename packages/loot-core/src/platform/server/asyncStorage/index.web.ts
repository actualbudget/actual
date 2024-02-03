// @ts-strict-ignore
import { getDatabase } from '../indexeddb';

import * as T from '.';

export const init: T.Init = function () {};

function commit(trans) {
  if (trans.commit) {
    trans.commit();
  }
}

export const getItem: T.GetItem = async function (key) {
  const db = await getDatabase();

  const transaction = db.transaction(['asyncStorage'], 'readonly');
  const objectStore = transaction.objectStore('asyncStorage');

  return new Promise((resolve, reject) => {
    const req = objectStore.get(key);
    req.onerror = e => reject(e);
    req.onsuccess = e => resolve(e.target.result);
    commit(transaction);
  });
};

export const setItem: T.SetItem = async function (key, value) {
  const db = await getDatabase();

  const transaction = db.transaction(['asyncStorage'], 'readwrite');
  const objectStore = transaction.objectStore('asyncStorage');

  new Promise((resolve, reject) => {
    const req = objectStore.put(value, key);
    req.onerror = e => reject(e);
    req.onsuccess = () => resolve(undefined);
    commit(transaction);
  });
};

export const removeItem: T.RemoveItem = async function (key) {
  const db = await getDatabase();

  const transaction = db.transaction(['asyncStorage'], 'readwrite');
  const objectStore = transaction.objectStore('asyncStorage');

  return new Promise((resolve, reject) => {
    const req = objectStore.delete(key);
    req.onerror = e => reject(e);
    req.onsuccess = () => resolve(undefined);
    commit(transaction);
  });
};

export const multiGet: T.MultiGet = async function (keys) {
  const db = await getDatabase();

  const transaction = db.transaction(['asyncStorage'], 'readonly');
  const objectStore = transaction.objectStore('asyncStorage');

  const promise = Promise.all(
    keys.map(key => {
      return new Promise<[string, string]>((resolve, reject) => {
        const req = objectStore.get(key);
        req.onerror = e => reject(e);
        req.onsuccess = e => resolve([key, e.target.result]);
      });
    }),
  );

  commit(transaction);
  return promise;
};

export const multiSet: T.MultiSet = async function (keyValues) {
  const db = await getDatabase();

  const transaction = db.transaction(['asyncStorage'], 'readwrite');
  const objectStore = transaction.objectStore('asyncStorage');

  const promise = Promise.all(
    keyValues.map(([key, value]) => {
      return new Promise((resolve, reject) => {
        const req = objectStore.put(value, key);
        req.onerror = e => reject(e);
        req.onsuccess = () => resolve(undefined);
      });
    }),
  );

  commit(transaction);
  return promise;
};

export const multiRemove: T.MultiRemove = async function (keys) {
  const db = await getDatabase();

  const transaction = db.transaction(['asyncStorage'], 'readwrite');
  const objectStore = transaction.objectStore('asyncStorage');

  const promise = Promise.all(
    keys.map(key => {
      return new Promise((resolve, reject) => {
        const req = objectStore.delete(key);
        req.onerror = e => reject(e);
        req.onsuccess = () => resolve(undefined);
      });
    }),
  );

  commit(transaction);
  return promise;
};
