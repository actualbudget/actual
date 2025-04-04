import React, {
  createContext,
  useContext,
  type ReactNode,
  useCallback,
  useRef,
  useState,
} from 'react';
import { type RouteObject } from 'react-router-dom';

import {
  type ActualPluginEntry,
  type ActualPluginInitialized,
} from 'plugins-core/index';

import { type ActualPluginStored } from 'loot-core/types/models/actual-plugin-stored';

import { useFeatureFlag } from '../hooks/useFeatureFlag';
import { useNavigate } from '../hooks/useNavigate';
import { useDispatch } from '../redux';

import {
  loadPlugins,
  loadPluginsScript,
  type PluginModalModel,
  type PluginSidebarRegistrationFn,
} from './core/pluginLoader';
import { getAllPlugins } from './core/pluginStore';

export type ActualPluginsContextType = {
  plugins: ActualPluginInitialized[];
  pluginStore: ActualPluginStored[];
  refreshPluginStore: () => Promise<void>;
  modalMap: Map<string, PluginModalModel>;
  pluginsRoutes: Map<string, RouteObject>;
  sidebarItems: Map<string, PluginSidebarRegistrationFn>;
};

// Create the context
const ActualPluginsContext = createContext<
  ActualPluginsContextType | undefined
>(undefined);

// The Provider
export function ActualPluginsProvider({ children }: { children: ReactNode }) {
  const pluginsEnabled = useFeatureFlag('plugins'); // you can use this if you want to conditionally load

  const [plugins, setPlugins] = useState<ActualPluginInitialized[]>([]);
  const [pluginStore, setPluginStore] = useState<ActualPluginStored[]>([]);

  // We store modules in memory if needed (original code had it, but not used outside loadPlugins)
  // If you want to keep that, do so:
  // const [pluginsModules, setPluginsModules] = useState<Map<string, ActualPluginEntry>>(new Map());

  const modalMap = useRef<Map<string, PluginModalModel>>(new Map());
  const [pluginsRoutes, setPluginsRoutes] = useState<Map<string, RouteObject>>(
    new Map(),
  );
  const [sidebarItems, setSidebarItems] = useState<
    Map<string, PluginSidebarRegistrationFn>
  >(new Map());

  const dispatch = useDispatch();
  const navigateBase = useNavigate();

  // The function that actually registers and activates plugin code
  const handleLoadPlugins = useCallback(
    async (pluginsEntries: Map<string, ActualPluginEntry>) => {
      if (!pluginsEnabled) return;

      // We pass these references so plugin activation can call them.
      await loadPlugins({
        pluginsEntries,
        dispatch,
        setPlugins,
        modalMap,
        setPluginsRoutes,
        setSidebarItems,
        navigateBase,
      });
    },
    [dispatch, navigateBase, pluginsEnabled],
  );

  // The function that loads plugin scripts (the remote modules) and calls handleLoadPlugins
  const handleLoadPluginsScript = useCallback(
    async (pluginsData: ActualPluginStored[]) => {
      if (!pluginsEnabled) return;

      await loadPluginsScript({
        pluginsData,
        handleLoadPlugins,
      });
    },
    [handleLoadPlugins, pluginsEnabled],
  );

  // A function to refresh the plugin store from IndexedDB and reload if needed
  const refreshPluginStore = useCallback(async () => {
    if (!pluginsEnabled) return;

    const pluginsFromDB = (await getAllPlugins()) as ActualPluginStored[];
    // If the new list has changed in size, we might want to reload
    // (or you can do more sophisticated checks if you want)
    if (pluginsFromDB.length !== pluginStore.length) {
      await handleLoadPluginsScript(pluginsFromDB);
    }
    setPluginStore(pluginsFromDB);
  }, [pluginStore.length, handleLoadPluginsScript, pluginsEnabled]);

  // Provide everything
  const contextValue: ActualPluginsContextType = {
    plugins,
    pluginStore,
    refreshPluginStore,
    modalMap: modalMap.current,
    pluginsRoutes,
    sidebarItems,
  };

  return (
    <ActualPluginsContext.Provider value={contextValue}>
      {children}
    </ActualPluginsContext.Provider>
  );
}

// Hook for easy usage
export function useActualPlugins() {
  const context = useContext(ActualPluginsContext);
  if (!context) {
    throw new Error(
      'useActualPlugins must be used within an ActualPluginsProvider',
    );
  }
  return context;
}
