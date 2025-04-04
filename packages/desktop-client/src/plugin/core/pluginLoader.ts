import { init, loadRemote } from '@module-federation/enhanced/runtime';
import type { Dispatch } from 'redux';
import { pushModal as basePushModal } from 'loot-core/client/modals/modalsSlice';
import { v4 as uuidv4 } from 'uuid';
import type { RouteObject } from 'react-router-dom';
import { ActualPluginEntry, ActualPluginInitialized } from '@actual-app/plugins-core';
import { ActualPluginStored } from 'loot-core/types/models/actual-plugin-stored';


export type PluginModalModel = {
    name: string;
    modalBody: JSX.Element;
  };

export type PluginSidebarRegistrationFn = (container: HTMLDivElement) => void;  

export async function loadPlugins({
  pluginsEntries,
  dispatch,
  setPlugins,
  modalMap,
  setPluginsRoutes,
  setSidebarItems,
  navigateBase,
}: {
  pluginsEntries: Map<string, ActualPluginEntry>;
  dispatch: Dispatch;
  setPlugins: React.Dispatch<React.SetStateAction<ActualPluginInitialized[]>>;
  modalMap: React.MutableRefObject<Map<string, PluginModalModel>>;
  setPluginsRoutes: React.Dispatch<React.SetStateAction<Map<string, RouteObject>>>;
  setSidebarItems: React.Dispatch<React.SetStateAction<Map<string, PluginSidebarRegistrationFn>>>;
  navigateBase: (path: string) => void;
}) {
  const loadedList: ActualPluginInitialized[] = [];

  for (const [pluginId, entryModule] of pluginsEntries.entries()) {
    // the entry module is actually a function that returns an object with name, version, activate.
    const pluginEntry = (entryModule as unknown as { default: ActualPluginEntry }).default || entryModule;

    // The host context is how the plugin interacts with the app.
    const hostContext = {
      registerModal: (modalName: string, ModalBodyElement: JSX.Element) => {
        const id = uuidv4();
        modalMap.current.set(id, {
          name: modalName,
          modalBody: ModalBodyElement,
        });
        return id;
      },
      unregisterModal: (id: string) => {
        modalMap.current.delete(id);
      },
      registerRoute: (path: string, routeElement: JSX.Element) => {
        const id = uuidv4();
        setPluginsRoutes(prev => {
          const newMap = new Map(prev);
          newMap.set(id, {
            id,
            path: `/custom/${path}`,
            element: routeElement,
          } as RouteObject);
          return newMap;
        });
        return id;
      },
      unregisterRoute: (id: string) => {
        setPluginsRoutes(prev => {
          const newMap = new Map(prev);
          newMap.delete(id);
          return newMap;
        });
      },
      registerSidebarMenu: (param: PluginSidebarRegistrationFn) => {
        const id = uuidv4();
        setSidebarItems(prev => {
          const newMap = new Map(prev);
          newMap.set(id, param);
          return newMap;
        });
        return id;
      },
      unregisterSidebarMenu: (id: string) => {
        setSidebarItems(prev => {
          const newMap = new Map(prev);
          newMap.delete(id);
          return newMap;
        });
      },
      on: (event: string, args: unknown) => {
        // you can define event bus logic if needed
      },
      actions: {
        pushModal(modalName: string, options: any) {
          dispatch(
            basePushModal({
              modal: {
                name: `plugin-${pluginId}-${modalName}`,
                options,
              },
            })
          );
        },
        navigate: (path: string) => {
          navigateBase(path);
        },
      },
    };

    const rawPlugin = pluginEntry();
    await rawPlugin.activate(hostContext);
    loadedList.push(rawPlugin);
  }

  // store them in state so the rest of the app can use them.
  setPlugins(loadedList);
}

/**
 * loadPluginsScript - sets up module federation for all plugin scripts,
 * then loads them remotely and triggers plugin activation.
 */
export async function loadPluginsScript({
  pluginsData,
  handleLoadPlugins,
}: {
  pluginsData: ActualPluginStored[];
  handleLoadPlugins: (pluginsEntries: Map<string, ActualPluginEntry>) => Promise<void>;
}) {
  init({
    name: '@actual/host-app',
    remotes: pluginsData.map(plugin => ({
      name: plugin.name,
      alias: plugin.name,
      entry: `plugin-data/${encodeURIComponent(plugin.url)}`,
    })),
    shared: {
      react: {
        strategy: 'loaded-first',
      },
    },
  });

  const loadedPlugins: Map<string, ActualPluginEntry> = new Map();
  for (const plugin of pluginsData) {
    const mod = await loadRemote<ActualPluginEntry>(plugin.name);
    loadedPlugins.set(plugin.name, mod);
  }

  await handleLoadPlugins(loadedPlugins);
}
