// @ts-strict-ignore
import { GlobalPrefsJson } from '../../../types/prefs';
import { getDatabase } from '../indexeddb';

import * as T from './index-types';

export const init: T.Init = function () {};

export const getItem: T.GetItem = async function (key) {
  const db = await getDatabase();

  const transaction = db.transaction(['asyncStorage'], 'readonly');
  const objectStore = transaction.objectStore('asyncStorage');

  return new Promise((resolve, reject) => {
    const req = objectStore.get(key);
    req.onerror = e => reject(e);
    // @ts-expect-error fix me
    req.onsuccess = e => resolve(e.target.result);
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
    transaction.commit();
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
    transaction.commit();
  });
};

export async function multiGet<K extends readonly (keyof GlobalPrefsJson)[]>(
  keys: K,
): Promise<{ [P in K[number]]: GlobalPrefsJson[P] }> {
  const db = await getDatabase();

  const transaction = db.transaction(['asyncStorage'], 'readonly');
  const objectStore = transaction.objectStore('asyncStorage');

  const results = await Promise.all(
    keys.map(key => {
      return new Promise<[K[number], GlobalPrefsJson[K[number]]]>(
        (resolve, reject) => {
          const req = objectStore.get(key);
          req.onerror = e => reject(e);
          req.onsuccess = e => {
            const target = e.target as IDBRequest<GlobalPrefsJson[K[number]]>;
            resolve([key, target.result]);
          };
        },
      );
    }),
  );

  transaction.commit();

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

  transaction.commit();
  await promise;
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

  transaction.commit();
  await promise;
};
