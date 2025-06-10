import {
  type MutableRefObject,
  type Dispatch as ReactDispatch,
  type SetStateAction,
} from 'react';

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

// Import send function to communicate with backend
import { send } from 'loot-core/platform/client/fetch';

export type PluginModalModel = {
  name: string;
  modal: HTMLElement;
};

export type PluginSidebarRegistrationFn = (container: HTMLDivElement) => void;

export type PluginRouteFn = {
  path: string;
  parameter: (container: HTMLDivElement) => void;
};

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
  setPluginsRoutes: ReactDispatch<SetStateAction<Map<string, PluginRouteFn>>>;
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

    // Create database for the plugin
    const db = await createPluginDatabase(pluginId);

    const rawPlugin = pluginEntry();
    
    // Run migrations if the plugin defines them
    if (rawPlugin.migrations) {
      try {
        const migrations = rawPlugin.migrations();
        if (migrations.length > 0) {
          console.log(`Running ${migrations.length} migrations for plugin ${pluginId}`);
          const result = await send('plugin-run-migrations', { pluginId, migrations });
          console.log(`Migration results for plugin ${pluginId}:`, result);
        }
      } catch (error) {
        console.error(`Failed to run migrations for plugin ${pluginId}:`, error);
        // Continue with activation even if migrations fail for now
      }
    }

    await rawPlugin.activate({ ...hostContext, db });
    loadedList.push(rawPlugin);
  }

  // store them in state so the rest of the app can use them.
  setPlugins(loadedList);
}

function generateContext(
  modalMap: MutableRefObject<Map<string, PluginModalModel>>,
  setPluginsRoutes: ReactDispatch<SetStateAction<Map<string, PluginRouteFn>>>,
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
    registerRoute: (
      path: string,
      routeElement: (container: HTMLDivElement) => void,
    ) => {
      const id = uuidv4();
      const url = joinRelativePaths('/custom', path);
      setPluginsRoutes(prev => {
        const newMap = new Map(prev);
        newMap.set(id, {
          path: url,
          parameter: routeElement,
        });
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
    registerMenu: (
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
    unregisterMenu: (id: string) => {
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
  devUrl = '',
}: {
  pluginsData: ActualPluginStored[];
  handleLoadPlugins: (
    pluginsEntries: Map<string, ActualPluginEntry>,
  ) => Promise<void>;
  devUrl?: string;
}): Promise<boolean> {
  const remotes = [
    ...pluginsData,
    ...(devUrl !== ''
      ? [
          {
            name: 'dev-plugin',
            alias: 'dev-plugin',
            url: null,
            entry: devUrl,
          },
        ]
      : []),
  ];

  if (remotes.length === 0) return false;

  init({
    name: '@actual/host-app',
    remotes: remotes.map(plugin => ({
      name: plugin.name,
      alias: plugin.name,
      entry:
        'entry' in plugin
          ? plugin.entry
          : `plugin-data/${encodeURIComponent(plugin.url)}`,
    })),
    shared: {
      react: {
        strategy: 'loaded-first',
      },
    },
  });

  const loadedPlugins: Map<string, ActualPluginEntry> = new Map();
  if (devUrl !== '') {
    const mod = await loadRemote<ActualPluginEntry>('dev-plugin');
    if (mod) {
      // Inject React Refresh for hot reload support
      await injectIntoGlobalHook('dev-plugin', devUrl);
      loadedPlugins.set('dev-plugin', mod);
    }
  }

  await handleLoadPlugins(loadedPlugins);
  return true;
}

async function injectIntoGlobalHook(pluginName: string, pluginEntry: string) {
  if (process.env.NODE_ENV === 'development') {
    try {
      // Get the plugin's base URL
      const pluginBaseUrl = new URL(pluginEntry).origin;
      const refreshUrl = `${pluginBaseUrl}/@react-refresh`;
      
      // Load the plugin's React Refresh module
      const refreshModule = await import(/* @vite-ignore */ refreshUrl);
      
      if (refreshModule.injectIntoGlobalHook) {
        // Inject the plugin's React Refresh into the global hook
        refreshModule.injectIntoGlobalHook(window);
        
        // Set up refresh globals if they don't exist
        if (!(window as any).$RefreshReg$) {
          (window as any).$RefreshReg$ = () => {};
        }
        if (!(window as any).$RefreshSig$) {
          (window as any).$RefreshSig$ = () => (type: any) => type;
        }
        
        console.log(`🔥 React Refresh injected for plugin: ${pluginName}`);
      }
    } catch (error) {
      console.warn(`Failed to inject React Refresh for ${pluginName}:`, error);
    }
  }
}

function joinRelativePaths(...parts) {
  return parts
    .map(p => p.replace(/(^\/+|\/+$)/g, ''))
    .filter(Boolean)
    .join('/');
}

// Plugin database management
const pluginDatabases = new Map<string, any>();

interface PluginDatabase {
  runQuery<T = any>(sql: string, params?: any[], fetchAll?: boolean): Promise<T>;
  execQuery(sql: string): Promise<void>;
  transaction<T>(fn: () => T): Promise<T>;
  migrate(id: string, sql: string): Promise<void>;
  getMigrationState(): Promise<string[]>;
  setMetadata(key: string, value: any): Promise<void>;
  getMetadata(key: string): Promise<any>;
}

async function createPluginDatabase(pluginId: string): Promise<PluginDatabase> {
  // Check if database already exists
  if (pluginDatabases.has(pluginId)) {
    return pluginDatabases.get(pluginId);
  }

  // Create database via backend
  await send('plugin-create-database', { pluginId });

  // Create database interface that communicates with backend
  const dbInterface: PluginDatabase = {
    async runQuery<T = any>(sql: string, params: any[] = [], fetchAll = false): Promise<T> {
      try {
        return await send('plugin-database-query', { pluginId, sql, params, fetchAll });
      } catch (error) {
        console.error(`Plugin ${pluginId} database query error:`, error);
        throw error;
      }
    },

    async execQuery(sql: string): Promise<void> {
      try {
        await send('plugin-database-exec', { pluginId, sql });
      } catch (error) {
        console.error(`Plugin ${pluginId} database exec error:`, error);
        throw error;
      }
    },

    async transaction<T>(fn: () => T): Promise<T> {
      // For transactions, we need to collect operations and send them as a batch
      const operations: any[] = [];
      let result: T;
      
      // Create a proxy context for the transaction function
      const transactionContext = {
        execQuery: (sql: string) => {
          operations.push({ type: 'exec', sql });
        },
        runQuery: (sql: string, params: any[] = [], fetchAll = false) => {
          operations.push({ type: 'query', sql, params, fetchAll });
        }
      };
      
      try {
        // Execute the function to collect operations
        result = fn.call(transactionContext);
        
        // Send all operations as a transaction to backend
        await send('plugin-database-transaction', { pluginId, operations });
        
        return result;
      } catch (error) {
        console.error(`Plugin ${pluginId} database transaction error:`, error);
        throw error;
      }
    },



    async getMigrationState(): Promise<string[]> {
      try {
        return await send('plugin-database-get-migrations', { pluginId });
      } catch (error) {
        console.error(`Plugin ${pluginId} getMigrationState error:`, error);
        throw error;
      }
    },

    async setMetadata(key: string, value: any): Promise<void> {
      try {
        await send('plugin-database-set-metadata', { pluginId, key, value });
      } catch (error) {
        console.error(`Plugin ${pluginId} setMetadata error:`, error);
        throw error;
      }
    },

    async getMetadata(key: string): Promise<any> {
      try {
        return await send('plugin-database-get-metadata', { pluginId, key });
      } catch (error) {
        console.error(`Plugin ${pluginId} getMetadata error:`, error);
        throw error;
      }
    }
  };

  // Cache the database interface
  pluginDatabases.set(pluginId, dbInterface);
  
  console.log(`Plugin ${pluginId}: Database interface created`);
  return dbInterface;
}
