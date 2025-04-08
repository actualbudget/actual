import {
  type MutableRefObject,
  type Dispatch as ReactDispatch,
  type SetStateAction,
} from 'react';
import type { RouteObject } from 'react-router-dom';

import { init, loadRemote } from '@module-federation/enhanced/runtime';
import {
  type ActualPluginEntry,
  type ActualPluginInitialized,
} from 'plugins-core/index';
import type { Dispatch } from 'redux';
import { v4 as uuidv4 } from 'uuid';

import {
  pushModal as basePushModal,
  popModal,
} from 'loot-core/client/modals/modalsSlice';
import { type ActualPluginStored } from 'loot-core/types/models/actual-plugin-stored';
import { BasicModalProps } from '../../../../component-library/src/props/modalProps';
import {
  ContextEvent,
  SidebarLocations,
} from 'plugins-core/types/actualPlugin';

export type PluginModalModel = {
  name: string;
  modal: HTMLElement;
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
  setEvents,
}: {
  pluginsEntries: Map<string, ActualPluginEntry>;
  dispatch: Dispatch;
  setPlugins: ReactDispatch<SetStateAction<ActualPluginInitialized[]>>;
  modalMap: MutableRefObject<Map<string, PluginModalModel>>;
  setPluginsRoutes: ReactDispatch<SetStateAction<Map<string, RouteObject>>>;
  setSidebarItems: ReactDispatch<
    SetStateAction<
      Record<SidebarLocations, Map<string, PluginSidebarRegistrationFn>>
    >
  >;
  navigateBase: (path: string) => void;
  setEvents: ReactDispatch<
    SetStateAction<{
      [K in keyof ContextEvent]?: Array<(data: ContextEvent[K]) => void>;
    }>
  >;
}) {
  const loadedList: ActualPluginInitialized[] = [];

  for (const [pluginId, entryModule] of pluginsEntries.entries()) {
    // the entry module is actually a function that returns an object with name, version, activate.
    const pluginEntry =
      (entryModule as unknown as { default: ActualPluginEntry }).default ||
      entryModule;

    // The host context is how the plugin interacts with the app.
    const hostContext = generateContext(
      modalMap,
      setPluginsRoutes,
      setSidebarItems,
      dispatch,
      pluginId,
      navigateBase,
      setEvents,
    );

    const rawPlugin = pluginEntry();
    await rawPlugin.activate(hostContext);
    loadedList.push(rawPlugin);
  }

  // store them in state so the rest of the app can use them.
  setPlugins(loadedList);
}

function generateContext(
  modalMap: MutableRefObject<Map<string, PluginModalModel>>,
  setPluginsRoutes,
  setSidebarItems: ReactDispatch<
    SetStateAction<
      Record<SidebarLocations, Map<string, PluginSidebarRegistrationFn>>
    >
  >,
  dispatch,
  pluginId: string,
  navigateBase: (path: string) => void,
  setEvents: ReactDispatch<
    SetStateAction<{
      [K in keyof ContextEvent]?: Array<(data: ContextEvent[K]) => void>;
    }>
  >,
) {
  return {
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
    registerSidebarMenu: (
      position: SidebarLocations,
      param: PluginSidebarRegistrationFn,
    ) => {
      const id = uuidv4();
      setSidebarItems(prev => {
        const updated = new Map(prev[position]);
        updated.set(id, param);

        return {
          ...prev,
          [position]: updated,
        };
      });
      return id;
    },
    unregisterSidebarMenu: (id: string) => {
      setSidebarItems(prev => {
        const updated: Record<
          SidebarLocations,
          Map<string, PluginSidebarRegistrationFn>
        > = {
          ...prev,
        };

        (Object.keys(prev) as SidebarLocations[]).forEach(location => {
          const currentMap = prev[location];
          if (currentMap.has(id)) {
            const newMap = new Map(currentMap);
            newMap.delete(id);
            updated[location] = newMap;
          }
        });

        return updated;
      });
    },
    on: <K extends keyof ContextEvent>(
      eventType: K,
      callback: (data: ContextEvent[K]) => void,
    ) => {
      setEvents(prev => ({
        ...prev,
        [eventType]: [...(prev[eventType] ?? []), callback],
      }));
    },
    pushModal(
      parameter: (container: HTMLDivElement) => void,
      modalProps: BasicModalProps,
    ) {
      dispatch(
        basePushModal({
          modal: {
            name: `plugin-modal`,
            options: {
              parameter,
              modalProps,
            },
          },
        }),
      );
    },
    popModal: () => {
      dispatch(popModal());
    },
    navigate: (path: string) => {
      navigateBase(path);
    },
  };
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
  handleLoadPlugins: (
    pluginsEntries: Map<string, ActualPluginEntry>,
  ) => Promise<void>;
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
