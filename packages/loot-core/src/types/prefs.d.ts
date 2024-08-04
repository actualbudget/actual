import { type numberFormats } from '../shared/util';

import { spendingReportTimeType } from './models/reports';

export type FeatureFlag =
  | 'reportBudget'
  | 'goalTemplatesEnabled'
  | 'spendingReport'
  | 'simpleFinSync'
  | 'iterableTopologicalSort';

export type LocalPrefs = Partial<
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
    budgetName: string;
    'ui.showClosedAccounts': boolean;
    'expand-splits': boolean;
    [key: `show-extra-balances-${string}`]: boolean;
    [key: `hide-cleared-${string}`]: boolean;
    [key: `hide-reconciled-${string}`]: boolean;
    'budget.collapsed': string[];
    'budget.summaryCollapsed': boolean;
    'budget.showHiddenCategories': boolean;
    'budget.startMonth': string;
    // TODO: pull from src/components/modals/ImportTransactions.js
    [key: `parse-date-${string}-${'csv' | 'qif'}`]: string;
    [key: `csv-mappings-${string}`]: string;
    [key: `csv-delimiter-${string}`]: ',' | ';' | '\t';
    [key: `csv-has-header-${string}`]: boolean;
    [key: `ofx-fallback-missing-payee-${string}`]: boolean;
    [key: `flip-amount-${string}-${'csv' | 'qif'}`]: boolean;
    'flags.updateNotificationShownForVersion': string;
    id: string;
    lastUploaded: string;
    cloudFileId: string;
    groupId: string;
    budgetType: 'report' | 'rollover';
    encryptKeyId: string;
    lastSyncedTimestamp: string;
    userId: string;
    resetClock: boolean;
    lastScheduleRun: string;
    reportsViewLegend: boolean;
    reportsViewSummary: boolean;
    reportsViewLabel: boolean;
    spendingReportFilter: string;
    spendingReportTime: spendingReportTimeType;
    spendingReportCompare: spendingReportTimeType;
    sidebarWidth: number;
    'mobile.showSpentColumn': boolean;
  } & Record<`flags.${FeatureFlag}`, boolean>
>;

export type Theme = 'light' | 'dark' | 'auto' | 'midnight' | 'development';
export type GlobalPrefs = Partial<{
  floatingSidebar: boolean;
  maxMonths: number;
  keyId?: string;
  theme: Theme;
  documentDir: string; // Electron only
}>;
