import {
  type MutableRefObject,
  type Dispatch as ReactDispatch,
  type SetStateAction,
} from 'react';

import { type BasicModalProps } from '@actual-app/components/props/modalProps';
import {
  createInstance,
  getInstance,
} from '@module-federation/enhanced/runtime';
import {
  type ActualPluginEntry,
  type ActualPluginInitialized,
  type Query,
  type QueryBuilder,
  type PluginDatabase,
  type PluginFilterCondition,
  type PluginFilterResult,
  type PluginCellValue,
  type AQLQueryResult,
  type AQLQueryOptions,
} from 'plugins-core/index';
import {
  type ContextEvent,
  type SidebarLocations,
  type ThemeColorOverrides,
  type HostContext,
} from 'plugins-core/types/actualPlugin';
import type { Dispatch } from 'redux';
import { v4 as uuidv4 } from 'uuid';

import { send } from 'loot-core/platform/client/fetch';
import { q } from 'loot-core/shared/query';
import { type ActualPluginStored } from 'loot-core/types/models/actual-plugin-stored';

import { i18nInstance } from '@desktop-client/i18n';
import {
  pushModal as basePushModal,
  popModal,
} from '@desktop-client/modals/modalsSlice';
import { type PluginDashboardWidget } from '@desktop-client/plugin/ActualPluginsProvider';

// Import send function to communicate with backend

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
    },
  ) => void;
  overrideTheme: (
    pluginName: string,
    themeId: 'light' | 'dark' | 'midnight' | string,
    colorOverrides: ThemeColorOverrides,
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
        // removePluginThemes,
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
            await send('plugin-run-migrations', {
              pluginId,
              migrations,
            });
          }
        } catch (error) {
          console.error(
            `Failed to run migrations for plugin ${pluginId}:`,
            error,
          );
          // Continue with activation even if migrations fail for now
        }
      }

      await rawPlugin.activate({
        ...hostContext,
        db,
        q,
        i18nInstance,
      } as HostContext & {
        db: PluginDatabase;
      });

      // Mark plugin as initialized and push to list
      const initializedPlugin: ActualPluginInitialized = {
        ...rawPlugin,
        initialized: true,
        activate: rawPlugin.activate as (
          context: HostContext & { db: PluginDatabase },
        ) => void,
      };
      loadedList.push(initializedPlugin);
    } catch (error) {
      console.error(
        `Plugin ${pluginId}: Unexpected error during loading:`,
        error,
      );
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
    },
  ) => void,
  overrideTheme: (
    pluginName: string,
    themeId: 'light' | 'dark' | 'midnight' | string,
    colorOverrides: ThemeColorOverrides,
  ) => void,
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
    q: q as QueryBuilder,
    addTheme: (
      themeId: string,
      displayName: string,
      colorOverrides: ThemeColorOverrides,
      options?: {
        baseTheme?: 'light' | 'dark' | 'midnight';
        description?: string;
      },
    ) =>
      addPluginTheme(pluginId, themeId, displayName, colorOverrides, options),
    overrideTheme: (
      themeId: 'light' | 'dark' | 'midnight' | string,
      colorOverrides: ThemeColorOverrides,
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
      },
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
    makeFilters: async (
      conditions: Array<PluginFilterCondition>,
    ): Promise<PluginFilterResult> => {
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
    bind: () => {
      // Binding is not available through send - plugins would need to use React context for this
      console.warn(
        'Plugin spreadsheet bind is not supported - use React context with useSpreadsheet hook instead',
      );
      return () => {}; // Return empty cleanup function
    },
    get: async (sheetName: string, name: string): Promise<PluginCellValue> => {
      return await send('get-cell', { sheetName, name });
    },
    getCellNames: async (sheetName: string): Promise<string[]> => {
      return await send('get-cell-names', { sheetName });
    },
    createQuery: async (
      sheetName: string,
      name: string,
      query: Query,
    ): Promise<void> => {
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
  mfInstance = null,
}: {
  pluginsData: ActualPluginStored[];
  handleLoadPlugins: (
    pluginsEntries: Map<string, ActualPluginEntry>,
  ) => Promise<void>;
  devUrl?: string;
  mfInstance?: ReturnType<typeof createInstance> | null;
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

  try {
    // Use the passed instance or try to get existing one
    let workingMfInstance = mfInstance || getInstance();

    // If no instance available, create one as fallback
    if (!workingMfInstance) {
      console.warn(
        'No Module Federation instance found during plugin loading, creating one...',
      );
      workingMfInstance = createInstance({
        name: '@actual/host-app',
        remotes: [],
        shared: {
          'react-i18next': {
            shareConfig: {
              singleton: true,
              requiredVersion: '^15.5.3',
            },
          },
          i18next: {
            shareConfig: {
              singleton: true,
              requiredVersion: '^25.2.1',
            },
          },
        },
      });
    }

    // Register all plugin remotes to the instance
    if (remotes.length > 0) {
      workingMfInstance.registerRemotes(
        remotes.map(plugin => ({
          name: plugin.name,
          alias: plugin.name,
          entry: `plugin-data/${encodeURIComponent(plugin.url ?? '')}/mf-manifest.json?t=${Date.now()}`,
        })),
      );
    }

    // Wait a bit for the runtime to fully register remotes before loading
    await new Promise(resolve => setTimeout(resolve, 100));

    // Now load all plugins using the working instance
    await loadPluginsWithInstance(
      workingMfInstance,
      pluginsData,
      devUrl,
      handleLoadPlugins,
    );
    return true;
  } catch (error) {
    // Log the error but don't fail completely - this might be a re-initialization
    console.warn('Module federation setup warning:', error);
    // Return early if setup failed
    return false;
  }
}

// Helper function to load all plugins with a given MF instance
async function loadPluginsWithInstance(
  mfInstance: ReturnType<typeof createInstance>,
  pluginsData: ActualPluginStored[],
  devUrl: string,
  handleLoadPlugins: (
    pluginsEntries: Map<string, ActualPluginEntry>,
  ) => Promise<void>,
) {
  // Helper function to load a plugin with retry logic
  async function loadPluginWithRetry(
    pluginName: string,
    isDevPlugin = false,
    devUrl?: string,
    instanceToUse?: ReturnType<typeof createInstance> | null,
  ): Promise<ActualPluginEntry | null> {
    const maxRetries = 3;
    let retryCount = 0;

    while (retryCount < maxRetries) {
      try {
        // Use the passed instance (should always be available now)

        if (!instanceToUse) {
          throw new Error(
            `No MF instance passed to loadPluginWithRetry for ${pluginName}. This should not happen!`,
          );
        }

        console.log('Loading plugin', pluginName);
        const mod =
          await instanceToUse.loadRemote<ActualPluginEntry>(pluginName);

        if (mod) {
          // Inject React Refresh for dev plugins only
          if (isDevPlugin && devUrl) {
            await injectIntoGlobalHook(pluginName, devUrl);
          }

          return mod;
        }
      } catch (error) {
        retryCount++;
        const isLastRetry = retryCount >= maxRetries;

        if (isLastRetry) {
          console.error(
            `Failed to load plugin ${pluginName} after ${maxRetries} attempts:`,
            error,
          );
          if (isDevPlugin) {
            console.info(
              'This might happen during hot reloads - try refreshing the browser',
            );
          }
        } else {
          const delay = Math.pow(2, retryCount - 1) * 1000; // Exponential backoff: 1s, 2s, 4s
          console.warn(
            `Failed to load plugin ${pluginName} (attempt ${retryCount}/${maxRetries}), retrying in ${delay}ms...`,
            error,
          );
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }

    return null;
  }

  const loadedPlugins: Map<string, ActualPluginEntry> = new Map();

  // Load regular plugins from pluginsData
  for (const plugin of pluginsData) {
    const mod = await loadPluginWithRetry(
      plugin.name,
      false,
      undefined,
      mfInstance,
    );
    if (mod) {
      loadedPlugins.set(plugin.name, mod);
    }
  }

  // Load dev plugin if devUrl is provided
  if (devUrl !== '') {
    const mod = await loadPluginWithRetry(
      'dev-plugin',
      true,
      devUrl,
      mfInstance,
    );
    if (mod) {
      loadedPlugins.set('dev-plugin', mod);
    }
  }

  await handleLoadPlugins(loadedPlugins);
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
        if (
          !(
            window as Window & typeof globalThis & { $RefreshReg$?: () => void }
          ).$RefreshReg$
        ) {
          (
            window as Window & typeof globalThis & { $RefreshReg$: () => void }
          ).$RefreshReg$ = () => {};
        }
        if (
          !(
            window as Window &
              typeof globalThis & { $RefreshSig$?: () => <T>(type: T) => T }
          ).$RefreshSig$
        ) {
          (
            window as Window &
              typeof globalThis & { $RefreshSig$: () => <T>(type: T) => T }
          ).$RefreshSig$ =
            () =>
            <T>(type: T): T =>
              type;
        }
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
const pluginDatabases = new Map<string, PluginDatabase>();

async function createPluginDatabase(pluginId: string): Promise<PluginDatabase> {
  // Check if database already exists
  if (pluginDatabases.has(pluginId)) {
    return pluginDatabases.get(pluginId)!;
  }

  // Create database via backend
  await send('plugin-create-database', { pluginId });

  // Create database interface that communicates with backend
  const dbInterface: PluginDatabase = {
    async runQuery<T = unknown>(
      sql: string,
      params: (string | number)[] = [],
      fetchAll = false,
    ): Promise<T[] | { changes: number; insertId?: number }> {
      try {
        return (await send('plugin-database-query', {
          pluginId,
          sql,
          params,
          fetchAll,
        })) as T[] | { changes: number; insertId?: number };
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
        runQuery: (
          sql: string,
          params: (string | number)[] = [],
          fetchAll = false,
        ) => {
          operations.push({ type: 'query', sql, params, fetchAll });
        },
      };

      try {
        // Execute the function to collect operations
        fn.call(transactionContext);

        // Send all operations as a transaction to backend
        send('plugin-database-transaction', { pluginId, operations }).catch(
          error => {
            console.error(
              `Plugin ${pluginId} database transaction error:`,
              error,
            );
          },
        );
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
      query: Query,
      options?: AQLQueryOptions,
    ): Promise<AQLQueryResult> {
      try {
        return await send('plugin-aql-query', { pluginId, query, options });
      } catch (error) {
        console.error(`Plugin ${pluginId} AQL query error:`, error);
        throw error;
      }
    },
  };

  // Cache the database interface
  pluginDatabases.set(pluginId, dbInterface);

  return dbInterface;
}
