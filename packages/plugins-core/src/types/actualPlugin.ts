import type { ReactElement } from 'react';

import type { BasicModalProps } from '@actual-app/components';
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
export type ThemeColorOverrides = {
  // Page colors
  pageBackground?: string;
  pageBackgroundModalActive?: string;
  pageBackgroundTopLeft?: string;
  pageBackgroundBottomRight?: string;
  pageBackgroundLineTop?: string;
  pageBackgroundLineMid?: string;
  pageBackgroundLineBottom?: string;
  pageText?: string;
  pageTextLight?: string;
  pageTextSubdued?: string;
  pageTextDark?: string;
  pageTextPositive?: string;
  pageTextLink?: string;
  pageTextLinkLight?: string;

  // Card colors
  cardBackground?: string;
  cardBorder?: string;
  cardShadow?: string;

  // Table colors
  tableBackground?: string;
  tableRowBackgroundHover?: string;
  tableText?: string;
  tableTextLight?: string;
  tableTextSubdued?: string;
  tableTextSelected?: string;
  tableTextHover?: string;
  tableTextInactive?: string;
  tableHeaderText?: string;
  tableHeaderBackground?: string;
  tableBorder?: string;
  tableBorderSelected?: string;
  tableBorderHover?: string;
  tableBorderSeparator?: string;
  tableRowBackgroundHighlight?: string;
  tableRowBackgroundHighlightText?: string;
  tableRowHeaderBackground?: string;
  tableRowHeaderText?: string;

  // Sidebar colors
  sidebarBackground?: string;
  sidebarItemBackgroundPending?: string;
  sidebarItemBackgroundPositive?: string;
  sidebarItemBackgroundFailed?: string;
  sidebarItemBackgroundHover?: string;
  sidebarItemAccentSelected?: string;
  sidebarItemText?: string;
  sidebarItemTextSelected?: string;

  // Menu colors
  menuBackground?: string;
  menuItemBackground?: string;
  menuItemBackgroundHover?: string;
  menuItemText?: string;
  menuItemTextHover?: string;
  menuItemTextSelected?: string;
  menuItemTextHeader?: string;
  menuBorder?: string;
  menuBorderHover?: string;
  menuKeybindingText?: string;
  menuAutoCompleteBackground?: string;
  menuAutoCompleteBackgroundHover?: string;
  menuAutoCompleteText?: string;
  menuAutoCompleteTextHover?: string;
  menuAutoCompleteTextHeader?: string;
  menuAutoCompleteItemTextHover?: string;
  menuAutoCompleteItemText?: string;

  // Modal colors
  modalBackground?: string;
  modalBorder?: string;

  // Mobile colors
  mobileHeaderBackground?: string;
  mobileHeaderText?: string;
  mobileHeaderTextSubdued?: string;
  mobileHeaderTextHover?: string;
  mobilePageBackground?: string;
  mobileNavBackground?: string;
  mobileNavItem?: string;
  mobileNavItemSelected?: string;
  mobileAccountShadow?: string;
  mobileAccountText?: string;
  mobileTransactionSelected?: string;
  mobileViewTheme?: string;
  mobileConfigServerViewTheme?: string;

  // Markdown colors
  markdownNormal?: string;
  markdownDark?: string;
  markdownLight?: string;

  // Button colors - Menu buttons
  buttonMenuText?: string;
  buttonMenuTextHover?: string;
  buttonMenuBackground?: string;
  buttonMenuBackgroundHover?: string;
  buttonMenuBorder?: string;
  buttonMenuSelectedText?: string;
  buttonMenuSelectedTextHover?: string;
  buttonMenuSelectedBackground?: string;
  buttonMenuSelectedBackgroundHover?: string;
  buttonMenuSelectedBorder?: string;

  // Button colors - Primary buttons
  buttonPrimaryText?: string;
  buttonPrimaryTextHover?: string;
  buttonPrimaryBackground?: string;
  buttonPrimaryBackgroundHover?: string;
  buttonPrimaryBorder?: string;
  buttonPrimaryShadow?: string;
  buttonPrimaryDisabledText?: string;
  buttonPrimaryDisabledBackground?: string;
  buttonPrimaryDisabledBorder?: string;

  // Button colors - Normal buttons
  buttonNormalText?: string;
  buttonNormalTextHover?: string;
  buttonNormalBackground?: string;
  buttonNormalBackgroundHover?: string;
  buttonNormalBorder?: string;
  buttonNormalShadow?: string;
  buttonNormalSelectedText?: string;
  buttonNormalSelectedBackground?: string;
  buttonNormalDisabledText?: string;
  buttonNormalDisabledBackground?: string;
  buttonNormalDisabledBorder?: string;

  // Button colors - Bare buttons
  buttonBareText?: string;
  buttonBareTextHover?: string;
  buttonBareBackground?: string;
  buttonBareBackgroundHover?: string;
  buttonBareBackgroundActive?: string;
  buttonBareDisabledText?: string;
  buttonBareDisabledBackground?: string;

  // Calendar colors
  calendarText?: string;
  calendarBackground?: string;
  calendarItemText?: string;
  calendarItemBackground?: string;
  calendarSelectedBackground?: string;
  calendarCellBackground?: string;

  // Status colors - Notice
  noticeBackground?: string;
  noticeBackgroundLight?: string;
  noticeBackgroundDark?: string;
  noticeText?: string;
  noticeTextLight?: string;
  noticeTextDark?: string;
  noticeTextMenu?: string;
  noticeTextMenuHover?: string;
  noticeBorder?: string;

  // Status colors - Warning
  warningBackground?: string;
  warningText?: string;
  warningTextLight?: string;
  warningTextDark?: string;
  warningBorder?: string;

  // Status colors - Error
  errorBackground?: string;
  errorText?: string;
  errorTextDark?: string;
  errorTextDarker?: string;
  errorTextMenu?: string;
  errorBorder?: string;

  // Status colors - Upcoming
  upcomingBackground?: string;
  upcomingText?: string;
  upcomingBorder?: string;

  // Form colors
  formLabelText?: string;
  formLabelBackground?: string;
  formInputBackground?: string;
  formInputBackgroundSelected?: string;
  formInputBackgroundSelection?: string;
  formInputBorder?: string;
  formInputTextReadOnlySelection?: string;
  formInputBorderSelected?: string;
  formInputText?: string;
  formInputTextSelected?: string;
  formInputTextPlaceholder?: string;
  formInputTextPlaceholderSelected?: string;
  formInputTextSelection?: string;
  formInputShadowSelected?: string;
  formInputTextHighlight?: string;

  // Checkbox colors
  checkboxText?: string;
  checkboxBackgroundSelected?: string;
  checkboxBorderSelected?: string;
  checkboxShadowSelected?: string;
  checkboxToggleBackground?: string;
  checkboxToggleBackgroundSelected?: string;
  checkboxToggleDisabled?: string;

  // Pill colors
  pillBackground?: string;
  pillBackgroundLight?: string;
  pillText?: string;
  pillTextHighlighted?: string;
  pillBorder?: string;
  pillBorderDark?: string;
  pillBackgroundSelected?: string;
  pillTextSelected?: string;
  pillBorderSelected?: string;
  pillTextSubdued?: string;

  // Reports colors
  reportsRed?: string;
  reportsBlue?: string;
  reportsGreen?: string;
  reportsGray?: string;
  reportsLabel?: string;
  reportsInnerLabel?: string;

  // Note tag colors
  noteTagBackground?: string;
  noteTagBackgroundHover?: string;
  noteTagText?: string;

  // Budget colors
  budgetCurrentMonth?: string;
  budgetOtherMonth?: string;
  budgetHeaderCurrentMonth?: string;
  budgetHeaderOtherMonth?: string;

  // Floating action bar colors
  floatingActionBarBackground?: string;
  floatingActionBarBorder?: string;
  floatingActionBarText?: string;

  // Tooltip colors
  tooltipText?: string;
  tooltipBackground?: string;
  tooltipBorder?: string;

  // Custom colors (plugin-specific)
  [customColor: `custom-${string}`]: string;
};

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
  ) => string;
  pushModal: (element: ReactElement, modalProps?: BasicModalProps) => void;
  registerRoute: (path: string, routeElement: ReactElement) => string;

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
  ) => string;

  // Theme methods - simple and direct
  addTheme: (
    themeId: string,
    displayName: string,
    colorOverrides: ThemeColorOverrides,
    options?: {
      baseTheme?: 'light' | 'dark' | 'midnight';
      description?: string;
    },
  ) => void;

  overrideTheme: (
    themeId: 'light' | 'dark' | 'midnight' | string,
    colorOverrides: ThemeColorOverrides,
  ) => void;

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
  uninstall: () => void;
  migrations?: () => PluginMigration[];
  activate: (context: PluginContext) => void;
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
  ) => string;
  unregisterRoute: (id: string) => void;

  registerSlotContent: (
    location: SlotLocations,
    parameter: (container: HTMLDivElement) => void | (() => void),
  ) => string;
  unregisterSlotContent: (id: string) => void;

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
  ) => string;
  unregisterDashboardWidget: (id: string) => void;

  // Theme methods
  addTheme: (
    themeId: string,
    displayName: string,
    colorOverrides: ThemeColorOverrides,
    options?: {
      baseTheme?: 'light' | 'dark' | 'midnight';
      description?: string;
    },
  ) => void;

  overrideTheme: (
    themeId: 'light' | 'dark' | 'midnight' | string,
    colorOverrides: ThemeColorOverrides,
  ) => void;

  // Query builder provided by host (loot-core's q function)
  q: QueryBuilder;

  // Report and spreadsheet utilities for dashboard widgets
  createSpreadsheet: () => PluginSpreadsheet;

  makeFilters: (
    conditions: Array<PluginFilterCondition>,
  ) => Promise<PluginFilterResult>;

  i18nInstance: i18n;
}
