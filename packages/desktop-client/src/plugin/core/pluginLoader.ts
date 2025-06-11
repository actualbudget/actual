import {
  type MutableRefObject,
  type Dispatch as ReactDispatch,
  type SetStateAction,
} from 'react';

import { init, loadRemote } from '@module-federation/enhanced/runtime';
import {
  type ActualPlugin,
  type ActualPluginEntry,
  type ActualPluginInitialized,
  type PluginQuery,
  type HostQueryBuilder,
  type PluginDatabase,
  type PluginFilterCondition,
  type PluginFilterResult,
  type PluginBinding,
  type PluginCellValue,
} from 'plugins-core/index';
import { q } from 'loot-core/shared/query';
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
  type ThemeColorOverrides,
} from 'plugins-core/types/actualPlugin';
import type { HostContext } from 'plugins-core/types/actualPlugin';
import { type PluginDashboardWidget } from '../ActualPluginsProvider';

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
  setPluginRegisteredWidgets,
  navigateBase,
  setEvents,
  addPluginTheme,
  overrideTheme,
  removePluginThemes,
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
  setPluginRegisteredWidgets: ReactDispatch<
    SetStateAction<Map<string, PluginDashboardWidget>>
  >;
  navigateBase: (path: string) => void;
  setEvents: ReactDispatch<
    SetStateAction<{
      [K in keyof ContextEvent]?: Array<(data: ContextEvent[K]) => void>;
    }>
  >;
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
  removePluginThemes: (pluginName: string) => void;
}) {
  const loadedList: ActualPluginInitialized[] = [];

  for (const [pluginId, entryModule] of pluginsEntries.entries()) {
    try {
      // Clean up any existing themes from this plugin
      removePluginThemes(pluginId);
      
      // the entry module is actually a function that returns an object with name, version, activate.
      const pluginEntry =
        (entryModule as unknown as { default: ActualPluginEntry }).default ||
        entryModule;

      if (!pluginEntry || typeof pluginEntry !== 'function') {
        console.error(`Plugin ${pluginId}: Invalid plugin entry module`);
        continue;
      }

      // The host context is how the plugin interacts with the app.
      const hostContext = generateContext(
        modalMap,
        setPluginsRoutes,
        setSidebarItems,
        setPluginRegisteredWidgets,
        dispatch,
        pluginId,
        navigateBase,
        setEvents,
        addPluginTheme,
        overrideTheme,
        removePluginThemes,
      );

      // Create database for the plugin
      let db: PluginDatabase;
      try {
        db = await createPluginDatabase(pluginId);
      } catch (error) {
        console.error(`Plugin ${pluginId}: Failed to create database:`, error);
        continue;
      }

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

      await rawPlugin.activate({ ...hostContext, db, q } as HostContext & { db: PluginDatabase });
      
      // Mark plugin as initialized and push to list
      const initializedPlugin: ActualPluginInitialized = {
        ...rawPlugin,
        initialized: true,
        activate: rawPlugin.activate as (context: HostContext & { db: PluginDatabase }) => void,
      };
      loadedList.push(initializedPlugin);
    } catch (error) {
      console.error(`Plugin ${pluginId}: Unexpected error during loading:`, error);
      continue;
    }
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
  setPluginRegisteredWidgets: ReactDispatch<
    SetStateAction<Map<string, PluginDashboardWidget>>
  >,
  dispatch: Dispatch,
  pluginId: string,
  navigateBase: (path: string) => void,
  setEvents: ReactDispatch<
    SetStateAction<{
      [K in keyof ContextEvent]?: Array<(data: ContextEvent[K]) => void>;
    }>
  >,
  addPluginTheme: (
    pluginName: string,
    themeId: string,
    displayName: string,
    colorOverrides: ThemeColorOverrides,
    options?: {
      baseTheme?: 'light' | 'dark' | 'midnight';
      description?: string;
    }
  ) => void,
  overrideTheme: (
    pluginName: string,
    themeId: 'light' | 'dark' | 'midnight' | string,
    colorOverrides: ThemeColorOverrides
  ) => void,
  removePluginThemes: (pluginName: string) => void,
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
    q: q as HostQueryBuilder,
    addTheme: (
      themeId: string,
      displayName: string,
      colorOverrides: ThemeColorOverrides,
      options?: {
        baseTheme?: 'light' | 'dark' | 'midnight';
        description?: string;
      }
    ) => addPluginTheme(pluginId, themeId, displayName, colorOverrides, options),
    overrideTheme: (
      themeId: 'light' | 'dark' | 'midnight' | string,
      colorOverrides: ThemeColorOverrides
    ) => overrideTheme(pluginId, themeId, colorOverrides),
    registerDashboardWidget: (
      widgetType: string,
      displayName: string,
      renderWidget: (container: HTMLDivElement) => void,
      options?: {
        defaultWidth?: number;
        defaultHeight?: number;
        minWidth?: number;
        minHeight?: number;
      }
    ) => {
      const id = `${pluginId}_${widgetType}`;
      setPluginRegisteredWidgets(prev => {
        const newMap = new Map(prev);
        newMap.set(id, {
          pluginId,
          widgetType,
          displayName,
          renderWidget,
          defaultWidth: options?.defaultWidth ?? 4,
          defaultHeight: options?.defaultHeight ?? 2,
          minWidth: options?.minWidth ?? 2,
          minHeight: options?.minHeight ?? 1,
        });
        return newMap;
      });
      return id;
    },
    unregisterDashboardWidget: (id: string) => {
      setPluginRegisteredWidgets(prev => {
        const newMap = new Map(prev);
        newMap.delete(id);
        return newMap;
      });
    },
    makeFilters: async (conditions: Array<PluginFilterCondition>): Promise<PluginFilterResult> => {
      const result = await send('make-filters-from-conditions', {
        conditions: conditions.filter(cond => !cond.customName),
      });
      return result as unknown as PluginFilterResult;
    },
    createSpreadsheet: () => {
      return createPluginSpreadsheetInterface();
    },
  };
}

function createPluginSpreadsheetInterface() {
  return {
    bind: (
      sheetName: string | undefined,
      binding: PluginBinding,
      callback: (node: PluginCellValue) => void,
    ) => {
      // Binding is not available through send - plugins would need to use React context for this
      console.warn('Plugin spreadsheet bind is not supported - use React context with useSpreadsheet hook instead');
      return () => {}; // Return empty cleanup function
    },
    get: async (sheetName: string, name: string): Promise<PluginCellValue> => {
      return await send('get-cell', { sheetName, name });
    },
    getCellNames: async (sheetName: string): Promise<string[]> => {
      return await send('get-cell-names', { sheetName });
    },
    createQuery: async (sheetName: string, name: string, query: PluginQuery): Promise<void> => {
      await send('create-query', {
        sheetName,
        name,
        query: query.serialize(),
      });
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

function joinRelativePaths(...parts: string[]) {
  return parts
    .map(p => p.replace(/(^\/+|\/+$)/g, ''))
    .filter(Boolean)
    .join('/');
}

// Plugin database management
const pluginDatabases = new Map<string, any>();

async function createPluginDatabase(pluginId: string): Promise<PluginDatabase> {
  // Check if database already exists
  if (pluginDatabases.has(pluginId)) {
    return pluginDatabases.get(pluginId);
  }

  // Create database via backend
  await send('plugin-create-database', { pluginId });

  // Create database interface that communicates with backend
  const dbInterface: PluginDatabase = {
    async runQuery<T = any>(sql: string, params: (string | number)[] = [], fetchAll = false): Promise<T[] | { changes: number; insertId?: number }> {
      try {
        return await send('plugin-database-query', { pluginId, sql, params, fetchAll }) as T[] | { changes: number; insertId?: number };
      } catch (error) {
        console.error(`Plugin ${pluginId} database query error:`, error);
        throw error;
      }
    },

    execQuery(sql: string): void {
      send('plugin-database-exec', { pluginId, sql }).catch(error => {
        console.error(`Plugin ${pluginId} database exec error:`, error);
      });
    },

    transaction(fn: () => void): void {
      // For transactions, we need to collect operations and send them as a batch
      const operations: Array<{
        type: 'exec' | 'query';
        sql: string;
        params?: (string | number)[];
        fetchAll?: boolean;
      }> = [];
      
      // Create a proxy context for the transaction function
      const transactionContext = {
        execQuery: (sql: string) => {
          operations.push({ type: 'exec', sql });
        },
        runQuery: (sql: string, params: (string | number)[] = [], fetchAll = false) => {
          operations.push({ type: 'query', sql, params, fetchAll });
        }
      };
      
      try {
        // Execute the function to collect operations
        fn.call(transactionContext);
        
        // Send all operations as a transaction to backend
        send('plugin-database-transaction', { pluginId, operations }).catch(error => {
          console.error(`Plugin ${pluginId} database transaction error:`, error);
        });
      } catch (error) {
        console.error(`Plugin ${pluginId} database transaction error:`, error);
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

    async setMetadata(key: string, value: string): Promise<void> {
      try {
        await send('plugin-database-set-metadata', { pluginId, key, value });
      } catch (error) {
        console.error(`Plugin ${pluginId} setMetadata error:`, error);
        throw error;
      }
    },

    async getMetadata(key: string): Promise<string | null> {
      try {
        return await send('plugin-database-get-metadata', { pluginId, key });
      } catch (error) {
        console.error(`Plugin ${pluginId} getMetadata error:`, error);
        throw error;
      }
    },

    async aql(
      query: PluginQuery,
      options?: {
        target?: 'plugin' | 'host';
        params?: Record<string, unknown>;
      }
    ): Promise<{ data: unknown; dependencies: string[] }> {
      try {
        return await send('plugin-aql-query', { pluginId, query, options });
      } catch (error) {
        console.error(`Plugin ${pluginId} AQL query error:`, error);
        throw error;
      }
    }
  };

  // Cache the database interface
  pluginDatabases.set(pluginId, dbInterface);
  
  console.log(`Plugin ${pluginId}: Database interface created`);
  return dbInterface;
}
