import { BasicModalProps } from '@actual-app/components/props/modalProps';
import ReactDOM from 'react-dom/client';

import {
  ActualPlugin,
  ActualPluginInitialized,
  SidebarLocations,
} from './types/actualPlugin';
import {
  ActualPluginConfigType,
  ActualPluginManifest,
} from './types/actualPluginManifest';

const containerRoots = new WeakMap<HTMLElement, Map<string, ReactDOM.Root>>();

function generateRandomPluginId() {
  return 'plugin-' + Math.random().toString(36).slice(2, 12);
}

function getOrCreateRoot(container: HTMLElement, pluginId: string) {
  let pluginMap = containerRoots.get(container);
  if (!pluginMap) {
    pluginMap = new Map();
    containerRoots.set(container, pluginMap);
  }

  let root = pluginMap.get(pluginId);
  if (!root) {
    root = ReactDOM.createRoot(container);
    pluginMap.set(pluginId, root);
  }
  return root;
}

export function initializePlugin(
  plugin: ActualPlugin,
  providedPluginId?: string,
): ActualPluginInitialized {
  const pluginId = providedPluginId || generateRandomPluginId();

  const originalActivate = plugin.activate;

  const newPlugin: ActualPluginInitialized = {
    ...plugin,
    initialized: true,
    activate: context => {
      const wrappedContext = {
        ...context,

        registerMenu(position: SidebarLocations, element: JSX.Element) {
          return context.registerMenu(position, container => {
            const root = getOrCreateRoot(container, pluginId);
            root.render(element);
          });
        },

        pushModal(element: JSX.Element, modalProps?: BasicModalProps) {
          context.pushModal(container => {
            const root = getOrCreateRoot(container, pluginId);
            root.render(element);
          }, modalProps);
        },

        registerRoute(path: string, element: JSX.Element) {
          return context.registerRoute(path, container => {
            const root = getOrCreateRoot(container, pluginId);
            root.render(element);
          });
        },
      };

      originalActivate(wrappedContext);
    },
  };

  return newPlugin;
}

export async function getPluginConfig<T extends ActualPluginManifest>(
  manifest: T,
): Promise<ActualPluginConfigType<typeof manifest>> {
  const db: IDBDatabase = await new Promise((res, rej) => {
    const dbRequest = indexedDB.open('actual', 9);
    dbRequest.onsuccess = event => {
      // @ts-ignore do later
      res(event.target.result as IDBDatabase);
    };
    dbRequest.onerror = event => {
      rej(event.target);
    };
  });
  const transaction = db.transaction(['plugin-configs'], 'readonly');
  const objectStore = transaction.objectStore('plugin-configs');
  const objectStoreValue = await new Promise((res, rej) => {
    const req = objectStore.get(`${manifest.name}-config`);
    // @ts-ignore handle it later
    req.onsuccess = event => res(event.target.result);
    req.onerror = event => rej(event.target);
  });
  return (objectStoreValue ?? {}) as ActualPluginConfigType<typeof manifest>;
}
