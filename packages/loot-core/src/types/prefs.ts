export type FeatureFlag =
  | 'goalTemplatesEnabled'
  | 'goalTemplatesUIEnabled'
  | 'actionTemplating'
  | 'pluggyAiBankSync'
  | 'currency';

/**
 * Cross-device preferences. These sync across devices when they are changed.
 */
export type SyncedPrefs = Partial<
  Record<
    | 'budgetType'
    | 'upcomingScheduledTransactionLength'
    | 'firstDayOfWeekIdx'
    | 'dateFormat'
    | 'numberFormat'
    | 'hideFraction'
    | 'isPrivacyEnabled'
    | 'currencySymbolPosition'
    | 'currencySpaceBetweenAmountAndSymbol'
    | 'defaultCurrencyCode'
    | `show-balances-${string}`
    | `show-extra-balances-${string}`
    | `hide-cleared-${string}`
    | `hide-reconciled-${string}`
    // TODO: pull from src/components/modals/ImportTransactions.js
    | `parse-date-${string}-${'csv' | 'qif'}`
    | `csv-mappings-${string}`
    | `csv-delimiter-${string}`
    | `csv-skip-lines-${string}`
    | `csv-in-out-mode-${string}`
    | `csv-out-value-${string}`
    | `csv-has-header-${string}`
    | `custom-sync-mappings-${string}`
    | `sync-import-pending-${string}`
    | `sync-reimport-deleted-${string}`
    | `sync-import-notes-${string}`
    | `ofx-fallback-missing-payee-${string}`
    | `flip-amount-${string}-${'csv' | 'qif'}`
    | `flags.${FeatureFlag}`
    | `learn-categories`,
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
 */
export type LocalPrefs = Partial<{
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
  sidebarWidth: number;
  'mobile.showSpentColumn': boolean;
}>;

export type Theme = 'light' | 'dark' | 'auto' | 'midnight' | 'development';
export type DarkTheme = 'dark' | 'midnight';

// GlobalPrefs are the parsed global-store.json values
export type GlobalPrefs = Partial<{
  floatingSidebar: boolean;
  maxMonths: number;
  categoryExpandedState: number;
  keyId?: string;
  language: string;
  theme: Theme;
  preferredDarkTheme: DarkTheme;
  documentDir: string; // Electron only
  serverSelfSignedCert: string; // Electron only
  syncServerConfig?: {
    // Electron only
    autoStart?: boolean;
    port?: number;
  };
}>;

// GlobalPrefsJson represents what's saved in the global-store.json file
export type GlobalPrefsJson = Partial<{
  'user-id'?: string;
  'user-key'?: string;
  'encrypt-keys'?: string;
  lastBudget?: string;
  readOnly?: string;
  'server-url'?: string;
  'did-bootstrap'?: boolean;
  'user-token'?: string;
  'floating-sidebar'?: string; // "true" or "false"
  'max-months'?: string; // e.g. "2" or "3"
  'category-expanded-state'?: string; // "0" or "1" or "2"
  'document-dir'?: GlobalPrefs['documentDir'];
  'encrypt-key'?: string;
  language?: GlobalPrefs['language'];
  theme?: GlobalPrefs['theme'];
  'preferred-dark-theme'?: GlobalPrefs['preferredDarkTheme'];
  'server-self-signed-cert'?: GlobalPrefs['serverSelfSignedCert'];
  syncServerConfig?: GlobalPrefs['syncServerConfig'];
}>;

export type AuthMethods = 'password' | 'openid';
