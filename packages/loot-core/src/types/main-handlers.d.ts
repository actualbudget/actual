export interface MainHandlers {
  'transaction-update': (
    transaction: unknown,
  ) => Promise<Record<string, never>>;

  undo: () => Promise<unknown>;

  redo: () => Promise<unknown>;

  'transactions-batch-update': (arg: {
    added;
    deleted;
    updated;
    learnCategories;
  }) => Promise<unknown>;

  'transaction-add': (transaction) => Promise<Record<string, never>>;

  'transaction-aupdatedd': (transaction) => Promise<Record<string, never>>;

  'transaction-delete': (transaction) => Promise<Record<string, never>>;

  'transactions-parse-file': (arg: { filepath; options }) => Promise<unknown>;

  'transactions-export': (arg: {
    transactions;
    accounts;
    categoryGroups;
    payees;
  }) => Promise<unknown>;

  'transactions-export-query': (arg: { query: queryState }) => Promise<unknown>;

  'get-categories': () => Promise<{
    grouped: unknown;
    list: unknown;
  }>;

  'get-earliest-transaction': () => Promise<unknown>;

  'get-budget-bounds': () => Promise<unknown>;

  'rollover-budget-month': (arg: { month }) => Promise<unknown>;

  'report-budget-month': (arg: { month }) => Promise<unknown>;

  'budget-set-type': (arg: { type }) => Promise<unknown>;

  'category-create': (arg: { name; groupId; isIncome }) => Promise<unknown>;

  'category-update': (category) => Promise<unknown>;

  'category-move': (arg: { id; groupId; targetId }) => Promise<unknown>;

  'category-delete': (arg: { id; transferId }) => Promise<{ error }>;

  'category-group-create': (arg: {
    name;
    isIncome?: boolean;
  }) => Promise<unknown>;

  'category-group-update': (group) => Promise<unknown>;

  'category-group-move': (arg: { id; targetId }) => Promise<unknown>;

  'category-group-delete': (arg: { id; transferId }) => Promise<unknown>;

  'must-category-transfer': (arg: { id }) => Promise<unknown>;

  'payee-create': (arg: { name }) => Promise<unknown>;

  'payees-get': () => Promise<unknown>;

  'payees-get-rule-counts': () => Promise<unknown>;

  'payees-merge': (arg: { targetId; mergeIds }) => Promise<unknown>;

  'payees-batch-change': (arg: { added; deleted; updated }) => Promise<unknown>;

  'payees-check-orphaned': (arg: { ids }) => Promise<unknown>;

  'payees-get-rules': (arg: { id }) => Promise<unknown>;

  'rule-validate': (rule) => Promise<{ error: unknown }>;

  'rule-add': (rule) => Promise<{ error: unknown } | { id: string }>;

  'rule-add': (rule) => Promise<{ error: unknown } | unknown>;

  'rule-delete': (rule) => Promise<unknown>;

  'rule-delete-all': (ids) => Promise<unknown>;

  'rule-apply-actions': (arg: { transactionIds; actions }) => Promise<unknown>;

  'rule-add-payee-rename': (arg: { fromNames; to }) => Promise<unknown>;

  'rules-get': () => Promise<unknown>;

  'rule-get': (arg: { id }) => Promise<unknown>;

  'rules-run': (arg: { transaction }) => Promise<unknown>;

  'make-filters-from-conditions': (arg: {
    conditions;
  }) => Promise<{ filters: unknown[] }>;

  getCell: (arg: { sheetName; name }) => Promise<unknown>;

  getCells: (arg: { names }) => Promise<unknown>;

  getCellNamesInSheet: (arg: { sheetName }) => Promise<unknown>;

  debugCell: (arg: { sheetName; name }) => Promise<unknown>;

  'create-query': (arg: { sheetName; name; query }) => Promise<unknown>;

  query: (query) => Promise<{ data; dependencies }>;

  'bank-delete': (arg: { id }) => Promise<unknown>;

  'account-update': (arg: { id; name }) => Promise<unknown>;

  'accounts-get': () => Promise<unknown>;

  'account-properties': (arg: {
    id;
  }) => Promise<{ balance: number; numTransactions: number }>;

  'accounts-link': (arg: {
    institution;
    publicToken;
    accountId;
    upgradingId;
  }) => Promise<'ok'>;

  'nordigen-accounts-link': (arg: {
    requisitionId;
    account;
    upgradingId;
  }) => Promise<'ok'>;

  'accounts-connect': (arg: {
    institution;
    publicToken;
    accountIds;
    offbudgetIds;
  }) => Promise<unknown>;

  'nordigen-accounts-connect': (arg: {
    institution;
    publicToken;
    accountIds;
    offbudgetIds;
  }) => Promise<unknown>;

  'account-create': (arg: {
    name;
    balance;
    offBudget;
    closed?;
  }) => Promise<string>;

  'account-close': (arg: {
    id;
    transferAccountId;
    categoryId;
    forced;
  }) => Promise<unknown>;

  'account-reopen': (arg: { id }) => Promise<unknown>;

  'account-move': (arg: { id; targetId }) => Promise<unknown>;

  'poll-web-token': (arg: { token }) => Promise<unknown>;

  'poll-web-token-stop': () => Promise<'ok'>;

  'accounts-sync': (arg: { id }) => Promise<{
    errors: unknown;
    newTransactions: unknown;
    matchedTransactions: unknown;
    updatedAccounts: unknown;
  }>;

  'secret-set': (arg: { name: string; value: string }) => Promise<null>;
  'secret-check': (arg: string) => Promise<null>;

  'nordigen-poll-web-token': (arg: {
    upgradingAccountId;
    requisitionId;
  }) => Promise<null>;

  'nordigen-status': () => Promise<{ configured: boolean }>;

  'nordigen-get-banks': (country) => Promise<unknown>;

  'nordigen-poll-web-token-stop': () => Promise<'ok'>;

  'nordigen-create-web-token': (arg: {
    upgradingAccountId;
    institutionId;
    accessValidForDays;
  }) => Promise<unknown>;

  'nordigen-accounts-sync': (arg: { id }) => Promise<{
    errors;
    newTransactions;
    matchedTransactions;
    updatedAccounts;
  }>;

  'transactions-import': (arg: { accountId; transactions }) => Promise<{
    errors;
    added;
    updated;
  }>;

  'account-unlink': (arg: { id }) => Promise<'ok'>;

  'make-plaid-public-token': (arg: {
    bankId;
  }) => Promise<
    | { error: ''; code: data.error_code; type: data.error_type }
    | { linkToken: data.link_token }
  >;

  'save-global-prefs': (prefs) => Promise<'ok'>;

  'load-global-prefs': () => Promise<{
    floatingSidebar: boolean;
    maxMonths: number;
    autoUpdate: boolean;
    documentDir: string;
    keyId: string;
  }>;

  'save-prefs': (prefsToSet) => Promise<'ok'>;

  'load-prefs': () => Promise<Record<string, unknown> | null>;

  'sync-reset': () => Promise<{ error }>;

  'sync-repair': () => Promise<unknown>;

  'key-make': (arg: { password }) => Promise<unknown>;

  'key-test': (arg: { fileId; password }) => Promise<unknown>;

  'get-did-bootstrap': () => Promise<boolean>;

  'subscribe-needs-bootstrap': (
    args: { url } = {},
  ) => Promise<
    { error: string } | { bootstrapped: unknown; hasServer: boolean }
  >;

  'subscribe-bootstrap': (arg: { password }) => Promise<{ error: string }>;

  'subscribe-get-user': () => Promise<{ offline: boolean } | null>;

  'subscribe-change-password': (arg: {
    password;
  }) => Promise<{ error: string }>;

  'subscribe-sign-in': (arg: { password }) => Promise<{ error: string }>;

  'subscribe-sign-out': () => Promise<'ok'>;

  'get-server-version': () => Promise<{ error: string } | { version: string }>;

  'get-server-url': () => Promise<unknown>;

  'set-server-url': (arg: { url; validate }) => Promise<unknown>;

  sync: () => Promise<{ error: string }>;

  'get-budgets': () => Promise<unknown>;

  'get-remote-files': () => Promise<unknown>;

  'reset-budget-cache': () => Promise<unknown>;

  'upload-budget': (arg: { id } = {}) => Promise<{ error }>;

  'download-budget': (arg: { fileId; replace }) => Promise<{ error; id }>;

  'sync-budget': () => Promise<Record<string, never>>;

  'load-budget': (arg: { id }) => Promise<{ error }>;

  'create-demo-budget': () => Promise<unknown>;

  'close-budget': () => Promise<'ok'>;

  'delete-budget': (arg: { id; cloudFileId }) => Promise<'ok'>;

  'create-budget': (arg: {
    budgetName?;
    avoidUpload?;
    testMode: boolean;
    testBudgetId?;
  }) => Promise<unknown>;

  'import-budget': (arg: { filepath; type }) => Promise<{ error }>;

  'export-budget': () => Promise<unknown>;

  'get-upgrade-notifications': () => Promise<unknown[]>;

  'seen-upgrade-notification': (arg: { type }) => Promise<unknown>;

  'upload-file-web': (arg: { filename; contents }) => Promise<'ok'>;

  'backups-get': (arg: { id }) => Promise<unknown>;

  'backup-load': (arg: { id; backupId }) => Promise<unknown>;

  'backup-make': (arg: { id }) => Promise<unknown>;

  'get-last-opened-backup': () => Promise<unknown>;

  'app-focused': () => Promise<unknown>;
}
