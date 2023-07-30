import { type numberFormats } from '../shared/util';

export type FeatureFlag =
  | 'reportBudget'
  | 'goalTemplatesEnabled'
  | 'privacyMode'
  | 'themes';

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
    hideClosedAccounts: boolean;
    hideMobileMessage: boolean;
    isPrivacyEnabled: boolean;
    budgetName: string;
    'ui.showClosedAccounts': boolean;
    'expand-splits': boolean;
    [`show-extra-balances-${string}`]: boolean;
    [`hide-cleared-${string}`]: boolean;
    'budget.collapsed': boolean;
    'budget.summaryCollapsed': boolean;
    'budget.showHiddenCategories': boolean;
    // TODO: pull from src/components/modals/ImportTransactions.js
    [`parse-date-${string}-${'csv' | 'qif'}`]: string;
    [`csv-mappings-${string}`]: string;
    [`csv-delimiter-${string}`]: ',' | ';' | '\t';
    [`csv-has-header-${string}`]: boolean;
    [`flip-amount-${string}-${'csv' | 'qif'}`]: boolean;
    'flags.updateNotificationShownForVersion': string;
    id: string;
    isCached: boolean;
    lastUploaded: string;
    cloudFileId: string;
    groupId: string;
    budgetType: 'report' | 'rollover';
    encryptKeyId: string;
    lastSyncedTimestamp: string;
    userId: string;
    resetClock: boolean;
    lastScheduleRun: string;
  } & Record<`flags.${FeatureFlag}`, boolean>
>;

export type Theme = 'light' | 'dark';
export type GlobalPrefs = Partial<{
  floatingSidebar: boolean;
  maxMonths: number;
  theme: Theme;
  documentDir: string; // Electron only
}>;
