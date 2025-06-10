import type { BasicModalProps } from '@actual-app/components/props/modalProps';
import { PluginQuery, PluginQueryBuilder, HostQueryBuilder } from './query';

export type SidebarLocations =
  | 'main-menu'
  | 'more-menu'
  | 'before-accounts'
  | 'after-accounts'
  | 'topbar';

export interface PluginDatabase {
  runQuery<T = any>(
    sql: string,
    params?: (string | number)[],
    fetchAll?: boolean
  ): Promise<T[] | { changes: number; insertId?: number }>;
  
  execQuery(sql: string): void;
  
  transaction(fn: () => void): void;
  
  getMigrationState(): Promise<string[]>;
  
  setMetadata(key: string, value: string): Promise<void>;
  
  getMetadata(key: string): Promise<string | null>;
  
  /**
   * Execute an AQL (Actual Query Language) query.
   * This provides a higher-level abstraction over SQL that's consistent with Actual Budget's query system.
   * 
   * @param query - The AQL query (can be a PluginQuery object or serialized PluginQueryState)
   * @param options - Optional parameters for the query
   * @param options.target - Target database: 'plugin' for plugin tables, 'host' for main app tables. Defaults to 'plugin'
   * @param options.params - Named parameters for the query
   * @returns Promise that resolves to the query result with data and dependencies
   */
  aql(
    query: PluginQuery,
    options?: {
      target?: 'plugin' | 'host';
      params?: Record<string, any>;
    }
  ): Promise<{ data: any; dependencies: string[] }>;
}

export type PluginMigration = [
  timestamp: number,
  name: string,
  upCommand: string,
  downCommand: string
];

export interface ActualPlugin {
  name: string;
  version: string;
  uninstall: () => void;
  migrations?: () => PluginMigration[];
  activate: (
    context: Omit<HostContext, 'registerMenu' | 'pushModal' | 'registerRoute'> & {
      registerMenu: (
        location: SidebarLocations,
        element: JSX.Element,
      ) => string;
      pushModal: (element: JSX.Element, modalProps?: BasicModalProps) => void;
      registerRoute: (path: string, routeElement: JSX.Element) => string;
      db?: PluginDatabase;
      q: PluginQueryBuilder;
    },
  ) => void;
}

export type ActualPluginInitialized = Omit<ActualPlugin, 'activate'> & {
  initialized: true;
  activate: (context: HostContext & { db: PluginDatabase }) => void;
};

export interface ContextEvent {
  payess: { payess: unknown[] };
  categories: { categories: unknown[], groups: unknown[] };
  accounts: { accounts: unknown[] };
}

export interface HostContext {
  navigate: (routePath: string) => void;

  pushModal: (
    parameter: (container: HTMLDivElement) => void,
    modalProps?: BasicModalProps,
  ) => void;
  popModal: () => void;

  registerRoute: (path: string, routeElement: (container: HTMLDivElement) => void) => string;
  unregisterRoute: (id: string) => void;

  registerMenu: (
    location: SidebarLocations,
    parameter: (container: HTMLDivElement) => void,
  ) => string;
  unregisterMenu: (id: string) => void;

  on: <K extends keyof ContextEvent>(
    eventType: K,
    callback: (data: ContextEvent[K]) => void,
  ) => void;

  // Query builder provided by host (loot-core's q function)
  q: HostQueryBuilder;
}
