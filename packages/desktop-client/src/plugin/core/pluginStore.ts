import { ActualPluginManifest } from '@actual-app/plugins-core';
import { getDatabase } from 'loot-core/platform/server/indexeddb';
import { ActualPluginStored } from 'loot-core/types/models/actual-plugin-stored';

/** Retrieve all plugins from the IndexedDB store */
export async function getAllPlugins(): Promise<ActualPluginStored[]> {
  const db = await getDatabase();
  const transaction = db.transaction(['plugins'], 'readonly');
  const objectStore = transaction.objectStore('plugins');

  return new Promise((resolve, reject) => {
    const req = objectStore.getAll();
    req.onsuccess = () => {
      resolve(req.result);
    };
    req.onerror = () => {
      reject(req.error);
    };
  });
}

/** Retrieve a single plugin by manifest from the DB */
export async function getStoredPlugin(
  manifest: ActualPluginManifest
): Promise<ActualPluginStored | null> {
  const db = await getDatabase();
  const transaction = db.transaction(['plugins'], 'readonly');
  const objectStore = transaction.objectStore('plugins');

  return new Promise((resolve, reject) => {
    const req = objectStore.get(manifest.url);
    req.onsuccess = () => {
      resolve(req.result || null);
    };
    req.onerror = () => {
      reject(req.error);
    };
  });
}

/** Put or update the plugin in the DB */
export async function persistPlugin(
  scriptBlob: Blob,
  manifest: ActualPluginManifest
): Promise<void> {
  const db = await getDatabase();
  const transaction = db.transaction(['plugins'], 'readwrite');
  const objectStore = transaction.objectStore('plugins');

  const storedPlugin: ActualPluginStored = {
    ...manifest,
    plugin: scriptBlob,
    enabled: true, //TODO
  };

  objectStore.put(storedPlugin);
}