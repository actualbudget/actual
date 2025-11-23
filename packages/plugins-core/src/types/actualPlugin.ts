import type { ReactElement } from 'react';

import type { BasicModalProps } from '@actual-app/components/modal';
import type { Query, QueryBuilder } from '@actual-app/query';
import type {
  AccountEntity,
  CategoryEntity,
  CategoryGroupEntity,
  PayeeEntity,
  ScheduleEntity,
} from '@actual-app/shared-types';
import type { i18n } from 'i18next';
export type SlotLocations =
  | 'sidebar-main-menu'
  | 'sidebar-more-menu'
  | 'sidebar-before-accounts'
  | 'sidebar-after-accounts'
  | 'topbar';

// Define condition value types for filtering
export type PluginConditionValue =
  | string
  | number
  | boolean
  | null
  | Array<string | number>
  | { num1: number; num2: number };

export type PluginFilterCondition = {
  field: string;
  op: string;
  value: PluginConditionValue;
  type?: string;
  customName?: string;
};

export type PluginFilterResult = {
  filters: Record<string, unknown>;
};

// Simple color mapping type for theme methods
export interface PluginDatabase {
  runQuery<T = unknown>(
    sql: string,
    params?: (string | number)[],
    fetchAll?: boolean,
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
    query: Query,
    options?: {
      target?: 'plugin' | 'host';
      params?: Record<string, unknown>;
    },
  ): Promise<{ data: unknown; dependencies: string[] }>;
}

export type PluginBinding = string | { name: string; query?: Query };

export type PluginCellValue = { name: string; value: unknown | null };

export interface PluginSpreadsheet {
  /**
   * Bind to a cell and observe changes
   * @param sheetName - Name of the sheet (optional, defaults to global)
   * @param binding - Cell binding (string name or object with name and optional query)
   * @param callback - Function called when cell value changes
   * @returns Cleanup function to stop observing
   */
  bind(
    sheetName: string | undefined,
    binding: PluginBinding,
    callback: (node: PluginCellValue) => void,
  ): () => void;

  /**
   * Get a cell value directly
   * @param sheetName - Name of the sheet
   * @param name - Cell name
   * @returns Promise that resolves to the cell value
   */
  get(sheetName: string, name: string): Promise<PluginCellValue>;

  /**
   * Get all cell names in a sheet
   * @param sheetName - Name of the sheet
   * @returns Promise that resolves to array of cell names
   */
  getCellNames(sheetName: string): Promise<string[]>;

  /**
   * Create a query in a sheet
   * @param sheetName - Name of the sheet
   * @param name - Query name
   * @param query - The query to create
   * @returns Promise that resolves when query is created
   */
  createQuery(sheetName: string, name: string, query: Query): Promise<void>;
}

export type PluginMigration = [
  timestamp: number,
  name: string,
  upCommand: string,
  downCommand: string,
];

// Plugin context type for easier reuse
export type PluginContext = Omit<
  HostContext,
  | 'registerSlotContent'
  | 'pushModal'
  | 'registerRoute'
  | 'registerDashboardWidget'
> & {
  registerSlotContent: (
    location: SlotLocations,
    element: ReactElement,
  ) => () => void;
  pushModal: (element: ReactElement, modalProps?: BasicModalProps) => void;
  registerRoute: (path: string, routeElement: ReactElement) => () => void;

  // Dashboard widget registration - wrapped for JSX elements
  registerDashboardWidget: (
    widgetType: string,
    displayName: string,
    element: ReactElement,
    options?: {
      defaultWidth?: number;
      defaultHeight?: number;
      minWidth?: number;
      minHeight?: number;
    },
  ) => () => void;

  db?: PluginDatabase;
  q: QueryBuilder;

  // Report and spreadsheet utilities
  createSpreadsheet: () => PluginSpreadsheet;

  makeFilters: (
    conditions: Array<PluginFilterCondition>,
  ) => Promise<PluginFilterResult>;
};

export interface ActualPlugin {
  name: string;
  version: string;
  install: (
    oldVersion: string,
    newVersion: string,
    context: PluginContext,
  ) => void;
  uninstall: (context: PluginContext) => void;
  migrations?: () => PluginMigration[];
  activate: (context: PluginContext) => void;
  deactivate: (context: PluginContext) => void;
}

export type ActualPluginInitialized = Omit<ActualPlugin, 'activate'> & {
  initialized: true;
  activate: (context: HostContext & { db: PluginDatabase }) => void;
};

export interface ContextEvent {
  payees: { payees: PayeeEntity[] };
  categories: { categories: CategoryEntity[]; groups: CategoryGroupEntity[] };
  accounts: { accounts: AccountEntity[] };
  schedules: { schedules: ScheduleEntity[] };
}

export interface HostContext {
  navigate: (routePath: string) => void;

  pushModal: (
    parameter: (container: HTMLDivElement) => void | (() => void),
    modalProps?: BasicModalProps,
  ) => void;
  popModal: () => void;

  registerRoute: (
    path: string,
    routeElement: (container: HTMLDivElement) => void | (() => void),
  ) => () => void;

  registerSlotContent: (
    location: SlotLocations,
    parameter: (container: HTMLDivElement) => void | (() => void),
  ) => () => void;

  on: <K extends keyof ContextEvent>(
    eventType: K,
    callback: (data: ContextEvent[K]) => void,
  ) => void;

  // Dashboard widget methods
  registerDashboardWidget: (
    widgetType: string,
    displayName: string,
    renderWidget: (container: HTMLDivElement) => void | (() => void),
    options?: {
      defaultWidth?: number;
      defaultHeight?: number;
      minWidth?: number;
      minHeight?: number;
    },
  ) => () => void;

  // Query builder provided by host (loot-core's q function)
  q: QueryBuilder;

  // Report and spreadsheet utilities for dashboard widgets
  createSpreadsheet: () => PluginSpreadsheet;

  makeFilters: (
    conditions: Array<PluginFilterCondition>,
  ) => Promise<PluginFilterResult>;

  i18nInstance: i18n;
}
