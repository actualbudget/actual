import { type numberFormats } from '../../shared/util';
import type * as constants from '../constants';

export type FeatureFlag =
  | 'reportBudget'
  | 'goalTemplatesEnabled'
  | 'privacyMode'
  | 'themes';

type NullableValues<T> = { [K in keyof T]: T[K] | null };

export type LocalPrefs = NullableValues<
  {
    firstDayOfWeekIdx: `${0 | 1 | 2 | 3 | 4 | 5 | 6}`;
    dateFormat: string;
    numberFormat: (typeof numberFormats)[number]['value'];
    hideFraction: boolean;
    hideClosedAccounts: boolean;
    hideMobileMessage: boolean;
    isPrivacyEnabled: boolean;
    budgetName: string;
    'ui.showClosedAccounts': boolean;
    'expand-splits': boolean;
    [key: `show-extra-balances-${string}`]: boolean;
    [key: `hide-cleared-${string}`]: boolean;
    'budget.collapsed': boolean;
    'budget.summaryCollapsed': boolean;
    'budget.showHiddenCategories': boolean;
    // TODO: pull from src/components/modals/ImportTransactions.js
    [key: `parse-date-${string}-${'csv' | 'qif'}`]: string;
    [key: `csv-mappings-${string}`]: string;
    [key: `csv-delimiter-${string}`]: ',' | ';' | '\t';
    [key: `csv-has-header-${string}`]: ',' | ';';
    [key: `flip-amount-${string}-${'csv' | 'qif'}`]: boolean;
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

export type Theme = 'light' | 'dark' | 'development';
export type GlobalPrefs = NullableValues<{
  floatingSidebar: boolean;
  maxMonths: number;
  theme: Theme;
  documentDir: string; // Electron only
}>;

export type PrefsState = {
  local: LocalPrefs | null;
  global: GlobalPrefs | null;
};

export type SetPrefsAction = {
  type: typeof constants.SET_PREFS;
  prefs: LocalPrefs;
  globalPrefs: GlobalPrefs;
};

export type MergeLocalPrefsAction = {
  type: typeof constants.MERGE_LOCAL_PREFS;
  prefs: Partial<LocalPrefs>;
};

export type MergeGlobalPrefsAction = {
  type: typeof constants.MERGE_GLOBAL_PREFS;
  globalPrefs: Partial<GlobalPrefs>;
};

export type PrefsActions =
  | SetPrefsAction
  | MergeLocalPrefsAction
  | MergeGlobalPrefsAction;
