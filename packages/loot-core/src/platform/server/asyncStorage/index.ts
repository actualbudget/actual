import { getDatabase } from '#platform/server/indexeddb';
// @ts-strict-ignore
import type { GlobalPrefsJson } from '#types/prefs';

import type * as T from './index-types';

export const init: T.Init = function () {
  // No need to initialise in the browser
};

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

  void new Promise((resolve, reject) => {
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
    keys.map(
      key =>
        new Promise<[K[number], GlobalPrefsJson[K[number]]]>(
          (resolve, reject) => {
            try {
              const req = objectStore.get(key);
              req.onerror = () => reject(req.error);
              req.onsuccess = () => {
                resolve([key, req.result]);
              };
            } catch (error) {
              reject(error);
            }
          },
        ),
    ),
  );

  // Wait for transaction to complete
  await new Promise<void>((resolve, reject) => {
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
  });

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
      return new Promise<void>((resolve, reject) => {
        try {
          const req = objectStore.put(value, key);
          req.onerror = () => reject(req.error);
          req.onsuccess = () => resolve();
        } catch (error) {
          reject(error);
        }
      });
    }),
  );

  await promise;

  // Wait for transaction to complete
  await new Promise<void>((resolve, reject) => {
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
  });
};

export const multiRemove: T.MultiRemove = async function (keys) {
  const db = await getDatabase();

  const transaction = db.transaction(['asyncStorage'], 'readwrite');
  const objectStore = transaction.objectStore('asyncStorage');

  const promise = Promise.all(
    keys.map(key => {
      return new Promise<void>((resolve, reject) => {
        try {
          const req = objectStore.delete(key);
          req.onerror = () => reject(req.error);
          req.onsuccess = () => resolve();
        } catch (error) {
          reject(error);
        }
      });
    }),
  );

  await promise;

  // Wait for transaction to complete
  await new Promise<void>((resolve, reject) => {
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
  });
};
