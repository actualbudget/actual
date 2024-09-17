import { spendingReportModeType } from './models/reports';

export type FeatureFlag =
  | 'dashboards'
  | 'reportBudget'
  | 'goalTemplatesEnabled'
  | 'spendingReport'
  | 'simpleFinSync';

/**
 * Cross-device preferences. These sync across devices when they are changed.
 */
export type SyncedPrefs = Partial<
  Record<
    | 'budgetType'
    | 'firstDayOfWeekIdx'
    | 'dateFormat'
    | 'numberFormat'
    | 'hideFraction'
    | 'isPrivacyEnabled'
    | `show-balances-${string}`
    | `show-extra-balances-${string}`
    | `hide-cleared-${string}`
    | `hide-reconciled-${string}`
    // TODO: pull from src/components/modals/ImportTransactions.js
    | `parse-date-${string}-${'csv' | 'qif'}`
    | `csv-mappings-${string}`
    | `csv-delimiter-${string}`
    | `csv-skip-lines-${string}`
    | `csv-has-header-${string}`
    | `ofx-fallback-missing-payee-${string}`
    | `flip-amount-${string}-${'csv' | 'qif'}`
    | `flags.${FeatureFlag}`,
    string
  >
>;

/**
 * Preferences that are stored in the `metadata.json` file along with the
 * core database.
 */
export type MetadataPrefs = Partial<{
  budgetName: string;
  id: string;
  lastUploaded: string;
  cloudFileId: string;
  groupId: string;
  encryptKeyId: string;
  lastSyncedTimestamp: string;
  resetClock: boolean;
  lastScheduleRun: string;
  userId: string; // TODO: delete this (unused)
}>;

/**
 * Local preferences applicable to a single device. Stored in local storage.
 * TODO: eventually `LocalPrefs` type should not use `MetadataPrefs`;
 * this is only a stop-gap solution.
 */
export type LocalPrefs = MetadataPrefs &
  Partial<{
    'ui.showClosedAccounts': boolean;
    'expand-splits': boolean;
    'budget.collapsed': string[];
    'budget.summaryCollapsed': boolean;
    'budget.showHiddenCategories': boolean;
    'budget.startMonth': string;
    'flags.updateNotificationShownForVersion': string;
    reportsViewLegend: boolean;
    reportsViewSummary: boolean;
    reportsViewLabel: boolean;
    spendingReportFilter: string;
    spendingReportMode: spendingReportModeType;
    spendingReportCompare: string;
    spendingReportCompareTo: string;
    sidebarWidth: number;
    'mobile.showSpentColumn': boolean;
  }>;

export type Theme = 'light' | 'dark' | 'auto' | 'midnight' | 'development';
export type DarkTheme = 'dark' | 'midnight';
export type GlobalPrefs = Partial<{
  floatingSidebar: boolean;
  maxMonths: number;
  keyId?: string;
  theme: Theme;
  preferredDarkTheme: DarkTheme;
  documentDir: string; // Electron only
  serverSelfSignedCert: string; // Electron only
}>;
