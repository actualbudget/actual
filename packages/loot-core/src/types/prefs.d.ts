import { type numberFormats } from '../shared/util';

import { spendingReportTimeType } from './models/reports';

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
  {
    firstDayOfWeekIdx: `${0 | 1 | 2 | 3 | 4 | 5 | 6}`;
    dateFormat:
      | 'MM/dd/yyyy'
      | 'dd/MM/yyyy'
      | 'yyyy-MM-dd'
      | 'MM.dd.yyyy'
      | 'dd.MM.yyyy';
    numberFormat: (typeof numberFormats)[number]['value'];
    hideFraction: boolean;
    isPrivacyEnabled: boolean;
    [key: `show-balances-${string}`]: boolean;
    [key: `show-extra-balances-${string}`]: boolean;
    [key: `hide-cleared-${string}`]: boolean;
    [key: `hide-reconciled-${string}`]: boolean;
    // TODO: pull from src/components/modals/ImportTransactions.js
    [key: `parse-date-${string}-${'csv' | 'qif'}`]: string;
    [key: `csv-mappings-${string}`]: string;
    [key: `csv-delimiter-${string}`]: ',' | ';' | '\t';
    [key: `csv-skip-lines-${string}`]: number;
    [key: `csv-has-header-${string}`]: boolean;
    [key: `ofx-fallback-missing-payee-${string}`]: boolean;
    [key: `flip-amount-${string}-${'csv' | 'qif'}`]: boolean;
    budgetType: 'report' | 'rollover';
    upcomingScheduledTransactionLength: `${1 | 7 | 14 | 30}`;
  } & Record<`flags.${FeatureFlag}`, boolean>
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
 * TODO: eventually `LocalPrefs` type should not use `SyncedPrefs` or `MetadataPrefs`;
 * this is only a stop-gap solution.
 */
export type LocalPrefs = SyncedPrefs &
  MetadataPrefs &
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
    spendingReportTime: spendingReportTimeType;
    spendingReportCompare: spendingReportTimeType;
    sidebarWidth: number;
    'mobile.showSpentColumn': boolean;
  }>;

export type Theme = 'light' | 'dark' | 'auto' | 'midnight' | 'development';
export type GlobalPrefs = Partial<{
  floatingSidebar: boolean;
  maxMonths: number;
  keyId?: string;
  theme: Theme;
  documentDir: string; // Electron only
  serverSelfSignedCert: string; // Electron only
}>;
