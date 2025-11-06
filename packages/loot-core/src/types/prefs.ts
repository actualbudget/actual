export type FeatureFlag =
  | 'goalTemplatesEnabled'
  | 'goalTemplatesUIEnabled'
  | 'actionTemplating'
  | 'formulaMode'
  | 'currency'
  | 'plugins'
  | 'budgetViews';

/**
 * Cross-device preferences. These sync across devices when they are changed.
 * Note: Values are stored as JSON strings in the database and need to be parsed.
 */
export type SyncedPrefs = Partial<
  {
    budgetType?: string;
    upcomingScheduledTransactionLength?: string;
    firstDayOfWeekIdx?: string;
    dateFormat?: string;
    numberFormat?: string;
    hideFraction?: string;
    isPrivacyEnabled?: string;
    currencySymbolPosition?: string;
    currencySpaceBetweenAmountAndSymbol?: string;
    defaultCurrencyCode?: string;
    plugins?: string;
    'budget.budgetViewMap'?: string; // JSON string of Record<string, string[]>
    'budget.customBudgetViews'?: string; // JSON string of Array<{ id: string; name: string }>
    'learn-categories'?: string;
  } & Record<`show-account-${string}-net-worth-chart`, string>
  & Record<`side-nav.show-balance-history-${string}`, string>
  & Record<`show-balances-${string}`, string>
  & Record<`show-extra-balances-${string}`, string>
  & Record<`hide-cleared-${string}`, string>
  & Record<`hide-reconciled-${string}`, string>
  & Record<`parse-date-${string}-${'csv' | 'qif'}`, string>
  & Record<`csv-mappings-${string}`, string>
  & Record<`csv-delimiter-${string}`, string>
  & Record<`csv-skip-start-lines-${string}`, string>
  & Record<`csv-skip-end-lines-${string}`, string>
  & Record<`csv-in-out-mode-${string}`, string>
  & Record<`csv-out-value-${string}`, string>
  & Record<`csv-has-header-${string}`, string>
  & Record<`custom-sync-mappings-${string}`, string>
  & Record<`sync-import-pending-${string}`, string>
  & Record<`sync-reimport-deleted-${string}`, string>
  & Record<`sync-import-notes-${string}`, string>
  & Record<`sync-import-transactions-${string}`, string>
  & Record<`ofx-fallback-missing-payee-${string}`, string>
  & Record<`flip-amount-${string}-${'csv' | 'qif'}`, string>
  & Record<`flags.${FeatureFlag}`, string>
  & Record<string, string>
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

export type Theme =
  | 'light'
  | 'dark'
  | 'auto'
  | 'midnight'
  | 'development'
  | string;
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
  plugins: boolean;
  pluginThemes: Record<
    string,
    {
      id: string;
      displayName: string;
      description?: string;
      baseTheme?: 'light' | 'dark' | 'midnight';
      colors: Record<string, string>;
    }
  >; // Complete plugin theme metadata
  documentDir: string; // Electron only
  serverSelfSignedCert: string; // Electron only
  syncServerConfig?: {
    // Electron only
    autoStart?: boolean;
    port?: number;
  };
  notifyWhenUpdateIsAvailable: boolean;
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
  plugins?: string; // "true" or "false"
  'plugin-theme'?: string; // JSON string of complete plugin theme (current selected plugin theme)
  'server-self-signed-cert'?: GlobalPrefs['serverSelfSignedCert'];
  syncServerConfig?: GlobalPrefs['syncServerConfig'];
  notifyWhenUpdateIsAvailable?: GlobalPrefs['notifyWhenUpdateIsAvailable'];
}>;

export type AuthMethods = 'password' | 'openid';
