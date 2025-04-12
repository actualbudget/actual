import { type ActualPluginManifest } from 'plugins-core/index';

import { getDatabase } from 'loot-core/platform/server/indexeddb';
import { type ActualPluginStored } from 'loot-core/types/models/actual-plugin-stored';
import { ActualPluginConfigType } from 'plugins-core/types/actualPluginManifest';
import { getConfig } from '@testing-library/dom';

/** Retrieve all plugins from the IndexedDB store */
export async function getAllPlugins(): Promise<ActualPluginStored[]> {
  const objectStore = await getPluginsObjectStore('readonly');
  return execute(() => objectStore.getAll());
}

/** Retrieve a single plugin by manifest from the DB */
export async function getStoredPlugin(
  manifest: ActualPluginManifest,
): Promise<ActualPluginStored | null> {
  const objectStore = await getPluginsObjectStore('readonly');
  return execute(() => objectStore.get(manifest.url));
}

/** Put or update the plugin in the DB */
export async function persistPlugin(
  scriptBlob: Blob,
  manifest: ActualPluginManifest,
): Promise<void> {
  const objectStore = await getPluginsObjectStore('readwrite');

  const storedPlugin: ActualPluginStored = {
    enabled: true,
    ...manifest,
    plugin: scriptBlob,
  };

  objectStore.put(storedPlugin);
}

/** Remove a plugin from the DB */
export async function removePlugin(
  manifest: ActualPluginManifest,
): Promise<void> {
  const objectStore = await getPluginsObjectStore('readwrite');
  return execute(() => objectStore.delete(manifest.url));
}

async function getPluginsObjectStore(scope: 'readonly' | 'readwrite') {
  const db: IDBDatabase = await getDatabase();
  const transaction = db.transaction(['plugins'], scope);
  return transaction.objectStore('plugins');
}

export async function persistPluginConfig(
  manifest: ActualPluginManifest,
  config: ActualPluginConfigType<typeof manifest>,
) {
  const objectStore = await getPluginConfigObjectStore('readwrite');

  return execute(() =>
    objectStore.put({
      ...config,
      id: getConfigKey(manifest),
    }),
  );
}

export async function getPluginConfig(
  manifest: ActualPluginManifest,
): Promise<ActualPluginConfigType<typeof manifest>> {
  const objectStore = await getPluginConfigObjectStore('readonly');
  const objectStoreConfig = await execute(() =>
    objectStore.get(getConfigKey(manifest)),
  );
  if (!objectStoreConfig) {
    return {};
  }
  const { id, ...config } = objectStoreConfig;
  return config;
}

function getConfigKey(manifest: ActualPluginManifest) {
  return `${manifest.name}-config`;
}

async function getPluginConfigObjectStore(scope: 'readonly' | 'readwrite') {
  const db: IDBDatabase = await getDatabase();
  const transaction = db.transaction(['plugin-configs'], scope);
  return transaction.objectStore('plugin-configs');
}

async function execute<T>(operation: () => IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    const req = operation();
    req.onsuccess = () => {
      resolve(req.result);
    };
    req.onerror = () => {
      reject(req.error);
    };
  });
}
