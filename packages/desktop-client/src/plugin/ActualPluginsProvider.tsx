import { ActualPluginInitialized } from '@actual-app/plugins-core';
import { ActualPluginStored } from 'loot-core/types/models/actual-plugin-stored';
import React, {
  createContext,
  useContext,
  type ReactNode,
  useCallback,
  useRef,
  useState,
} from 'react';
import { RouteObject } from 'react-router-dom';
import { loadPlugins, loadPluginsScript, PluginModalModel, PluginSidebarRegistrationFn } from './core/pluginLoader';
import { useFeatureFlag } from '../hooks/useFeatureFlag';
import { useDispatch } from '../redux';
import { useNavigate } from '../hooks/useNavigate';
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
const ActualPluginsContext = createContext<ActualPluginsContextType | undefined>(
  undefined
);

// The Provider
export function ActualPluginsProvider({ children }: { children: ReactNode }) {
  // Feature flag example
  const pluginsEnabled = useFeatureFlag('plugins'); // you can use this if you want to conditionally load

  // Global states
  const [plugins, setPlugins] = useState<ActualPluginInitialized[]>([]);
  const [pluginStore, setPluginStore] = useState<ActualPluginStored[]>([]);

  // We store modules in memory if needed (original code had it, but not used outside loadPlugins)
  // If you want to keep that, do so:
  // const [pluginsModules, setPluginsModules] = useState<Map<string, ActualPluginEntry>>(new Map());

  const modalMap = useRef<Map<string, PluginModalModel>>(new Map());
  const [pluginsRoutes, setPluginsRoutes] = useState<Map<string, RouteObject>>(
    new Map()
  );
  const [sidebarItems, setSidebarItems] = useState<
    Map<string, PluginSidebarRegistrationFn>
  >(new Map());

  const dispatch = useDispatch();
  const navigateBase = useNavigate();

  // The function that actually registers and activates plugin code
  const handleLoadPlugins = useCallback(
    async (pluginsEntries: Map<string, any>) => {
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
    [dispatch, navigateBase]
  );

  // The function that loads plugin scripts (the remote modules) and calls handleLoadPlugins
  const handleLoadPluginsScript = useCallback(
    async (pluginsData: ActualPluginStored[]) => {
      await loadPluginsScript({
        pluginsData,
        handleLoadPlugins,
      });
    },
    [handleLoadPlugins]
  );

  // A function to refresh the plugin store from IndexedDB and reload if needed
  const refreshPluginStore = useCallback(async () => {
    const pluginsFromDB = (await getAllPlugins()) as ActualPluginStored[];
    // If the new list has changed in size, we might want to reload
    // (or you can do more sophisticated checks if you want)
    if (pluginsFromDB.length !== pluginStore.length) {
      await handleLoadPluginsScript(pluginsFromDB);
    }
    setPluginStore(pluginsFromDB);
  }, [pluginStore.length, handleLoadPluginsScript]);

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
    throw new Error('useActualPlugins must be used within an ActualPluginsProvider');
  }
  return context;
}
