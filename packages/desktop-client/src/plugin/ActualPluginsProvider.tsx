import React, {
  createContext,
  useContext,
  type ReactNode,
  useCallback,
  useRef,
  useState,
  useEffect,
} from 'react';

import {
  type ActualPluginEntry,
  type ActualPluginInitialized,
} from 'plugins-core/index';

import { type ActualPluginStored } from 'loot-core/types/models/actual-plugin-stored';
import { type ThemeColorOverrides } from 'plugins-core/types/actualPlugin';

import { useFeatureFlag } from '../hooks/useFeatureFlag';
import { useNavigate } from '../hooks/useNavigate';
import { useDispatch, useSelector } from '../redux';
import { useGlobalPref } from '../hooks/useGlobalPref';

import {
  loadPlugins,
  loadPluginsScript,
  PluginRouteFn,
  type PluginModalModel,
  type PluginSidebarRegistrationFn,
} from './core/pluginLoader';
import { getAllPlugins } from './core/pluginStore';
import {
  ContextEvent,
  SidebarLocations,
} from 'plugins-core/types/actualPlugin';
import { store } from 'loot-core/client/store';

export type ActualPluginsContextType = {
  plugins: ActualPluginInitialized[];
  pluginStore: ActualPluginStored[];
  refreshPluginStore: (devUrl?: string) => Promise<void>;
  modalMap: Map<string, PluginModalModel>;
  pluginsRoutes: Map<string, PluginRouteFn>;
  sidebarItems: Record<
    SidebarLocations,
    Map<string, PluginSidebarRegistrationFn>
  >;
  // Theme management
  pluginThemes: Map<string, {
    id: string;
    displayName: string;
    colorOverrides: ThemeColorOverrides;
    baseTheme?: 'light' | 'dark' | 'midnight';
    description?: string;
    pluginName: string;
  }>;
  themeOverrides: Map<string, {
    colorOverrides: ThemeColorOverrides;
    pluginName: string;
  }>;
  addPluginTheme: (
    pluginName: string,
    themeId: string,
    displayName: string,
    colorOverrides: ThemeColorOverrides,
    options?: {
      baseTheme?: 'light' | 'dark' | 'midnight';
      description?: string;
    }
  ) => void;
  overrideTheme: (
    pluginName: string,
    themeId: 'light' | 'dark' | 'midnight' | string,
    colorOverrides: ThemeColorOverrides
  ) => void;
  getPluginThemes: () => Array<{ value: string; label: string }>;
  getThemeColors: (
    themeId: string,
    baseColors: Record<string, string>
  ) => Record<string, string>;
  removePluginThemes: (pluginName: string) => void;
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
  const [events, setEvents] = useState<{
    [K in keyof ContextEvent]?: Array<(data: ContextEvent[K]) => void>;
  }>({});

  // Global preference for storing plugin theme metadata
  const [savedPluginThemes, setSavedPluginThemes] = useGlobalPref('pluginThemes');

  // Runtime theme management state  
  const [runtimePluginThemes, setRuntimePluginThemes] = useState<Map<string, {
    id: string;
    displayName: string;
    colorOverrides: ThemeColorOverrides;
    baseTheme?: 'light' | 'dark' | 'midnight';
    description?: string;
    pluginName: string;
  }>>(new Map());
  
  const [themeOverrides, setThemeOverrides] = useState<Map<string, {
    colorOverrides: ThemeColorOverrides;
    pluginName: string;
  }>>(new Map());

  useEventDispatcher(
    'payess',
    state => ({ payess: state.queries.payees }),
    events,
  );
  useEventDispatcher(
    'categories',
    state => ({
      categories: state.queries.categories.list,
      groups: state.queries.categories.grouped,
    }),
    events,
  );

  // We store modules in memory if needed (original code had it, but not used outside loadPlugins)
  // If you want to keep that, do so:
  // const [pluginsModules, setPluginsModules] = useState<Map<string, ActualPluginEntry>>(new Map());

  const [initialized, setinitialized] = useState(false);

  const modalMap = useRef<Map<string, PluginModalModel>>(new Map());
  const [pluginsRoutes, setPluginsRoutes] = useState<
    Map<string, PluginRouteFn>
  >(new Map());
  const [sidebarItems, setSidebarItems] = useState<
    Record<SidebarLocations, Map<string, PluginSidebarRegistrationFn>>
  >({
    'main-menu': new Map(),
    'more-menu': new Map(),
    'before-accounts': new Map(),
    'after-accounts': new Map(),
    topbar: new Map(),
  });

  const dispatch = useDispatch();
  const navigateBase = useNavigate();

  // Theme management functions
  const addPluginTheme = useCallback((
    pluginName: string,
    themeId: string,
    displayName: string,
    colorOverrides: ThemeColorOverrides,
    options?: {
      baseTheme?: 'light' | 'dark' | 'midnight';
      description?: string;
    }
  ) => {
    setRuntimePluginThemes(prev => {
      const newMap = new Map(prev);
      newMap.set(themeId, {
        id: themeId,
        displayName,
        colorOverrides,
        baseTheme: options?.baseTheme || 'light',
        description: options?.description,
        pluginName,
      });
      return newMap;
    });

    // Save theme metadata to global preferences for immediate loading
    setSavedPluginThemes({
      ...savedPluginThemes,
      [themeId]: {
        id: themeId,
        displayName,
        description: options?.description,
        baseTheme: options?.baseTheme || 'light',
        colors: colorOverrides,
      },
    });
  }, [savedPluginThemes, setSavedPluginThemes]);

  const overrideTheme = useCallback((
    pluginName: string,
    themeId: 'light' | 'dark' | 'midnight' | string,
    colorOverrides: ThemeColorOverrides
  ) => {
    const overrideKey = `${pluginName}:${themeId}`;
    setThemeOverrides(prev => {
      const newMap = new Map(prev);
      newMap.set(overrideKey, {
        colorOverrides,
        pluginName,
      });
      return newMap;
    });
  }, []);

  const getPluginThemes = useCallback((): Array<{ value: string; label: string }> => {
    // Get themes from runtime (loaded plugins)
    const runtimeThemes = Array.from(runtimePluginThemes.values()).map(theme => ({
      value: theme.id,
      label: theme.displayName,
    }));

    // Get themes from saved preferences (may not be loaded yet)
    const savedThemes = savedPluginThemes ? Object.values(savedPluginThemes)
      .filter(theme => !runtimeThemes.some(rt => rt.value === theme.id))
      .map(theme => ({
        value: theme.id,
        label: theme.displayName,
      })) : [];

    return [...runtimeThemes, ...savedThemes];
  }, [runtimePluginThemes, savedPluginThemes]);

  const getThemeColors = useCallback((
    themeId: string,
    baseColors: Record<string, string>
  ): Record<string, string> => {
    let colors = { ...baseColors };
    
    // If it's a plugin theme, start with base theme and apply overrides
    const runtimePluginTheme = runtimePluginThemes.get(themeId);
    if (runtimePluginTheme) {
      colors = {
        ...colors,
        ...runtimePluginTheme.colorOverrides,
      };
    } else {
      // Check saved themes as fallback
      const savedTheme = savedPluginThemes?.[themeId];
      if (savedTheme) {
        colors = {
          ...colors,
          ...savedTheme.colors,
        };
      }
    }
    
    // Apply any theme overrides
    for (const [overrideKey, override] of themeOverrides) {
      const [, targetThemeId] = overrideKey.split(':');
      if (targetThemeId === themeId) {
        colors = {
          ...colors,
          ...override.colorOverrides,
        };
      }
    }
    
    return colors;
  }, [runtimePluginThemes, savedPluginThemes, themeOverrides]);

  const removePluginThemes = useCallback((pluginName: string) => {
    const themesToRemove: string[] = [];
    
    setRuntimePluginThemes(prev => {
      const newMap = new Map(prev);
      for (const [themeId, theme] of newMap) {
        if (theme.pluginName === pluginName) {
          themesToRemove.push(themeId);
          newMap.delete(themeId);
        }
      }
      return newMap;
    });

    setThemeOverrides(prev => {
      const newMap = new Map(prev);
      for (const [overrideKey, override] of newMap) {
        if (override.pluginName === pluginName) {
          newMap.delete(overrideKey);
        }
      }
      return newMap;
    });

    // Remove saved themes from global preferences
    if (themesToRemove.length > 0) {
      const updatedSavedThemes = { ...savedPluginThemes };
      for (const themeId of themesToRemove) {
        delete updatedSavedThemes[themeId];
      }
      setSavedPluginThemes(updatedSavedThemes);
    }
  }, [savedPluginThemes, setSavedPluginThemes]);

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
        setEvents,
        addPluginTheme,
        overrideTheme,
        removePluginThemes,
      });

      dispatchEvent('payess', events, {
        payess: store.getState().queries.payees,
      });
      dispatchEvent('categories', events, {
        categories: store.getState().queries.categories.list,
        groups: store.getState().queries.categories.grouped,
      });
      dispatchEvent('accounts', events, {
        accounts: store.getState().queries.accounts,
      });
    },
    [dispatch, navigateBase, pluginsEnabled, addPluginTheme, overrideTheme, removePluginThemes],
  );

  // The function that loads plugin scripts (the remote modules) and calls handleLoadPlugins
  const handleLoadPluginsScript = useCallback(
    async (pluginsData: ActualPluginStored[], devUrl?: string) => {
      if (!pluginsEnabled || initialized) return;

      setinitialized(
        await loadPluginsScript({
          pluginsData,
          handleLoadPlugins,
          devUrl,
        }),
      );
    },
    [handleLoadPlugins, pluginsEnabled, initialized, setinitialized],
  );

  // A function to refresh the plugin store from IndexedDB and reload if needed
  const refreshPluginStore = useCallback(
    async (devUrl?: string) => {
      if (!pluginsEnabled) return;

      const pluginsFromDB = (await getAllPlugins()) as ActualPluginStored[];
      // If the new list has changed in size, we might want to reload
      // (or you can do more sophisticated checks if you want)
      if (pluginsFromDB.length !== pluginStore.length || devUrl !== '') {
        await handleLoadPluginsScript(pluginsFromDB, devUrl);
      }
      setPluginStore(pluginsFromDB);
    },
    [pluginStore.length, handleLoadPluginsScript, pluginsEnabled],
  );

  // Provide everything
  const contextValue: ActualPluginsContextType = {
    plugins,
    pluginStore,
    refreshPluginStore,
    modalMap: modalMap.current,
    pluginsRoutes,
    sidebarItems,
    pluginThemes: runtimePluginThemes,
    themeOverrides,
    addPluginTheme,
    overrideTheme,
    getPluginThemes,
    getThemeColors,
    removePluginThemes,
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

function dispatchEvent<K extends keyof ContextEvent>(
  key: K,
  events: {
    [K in keyof ContextEvent]?: Array<(data: ContextEvent[K]) => void>;
  },
  data: ContextEvent[K],
) {
  const listeners = events[key];
  if (listeners && listeners.length > 0) {
    listeners.forEach(cb => cb(data));
  }
}

function useEventDispatcher<K extends keyof ContextEvent>(
  key: K,
  selector: (state: any) => ContextEvent[K],
  events: {
    [K in keyof ContextEvent]?: Array<(data: ContextEvent[K]) => void>;
  },
) {
  const value = useSelector(selector);

  useEffect(() => {
    dispatchEvent(key, events, value);
  }, [value, events[key]]);
}
