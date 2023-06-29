import { ParseFileResult } from '../server/accounts/parse-file';
import { batchUpdateTransactions } from '../server/accounts/transactions';
import { Backup } from '../server/backups';
import { RemoteFile } from '../server/cloud-storage';
import { Message } from '../server/sync';

import { EmptyObject } from './util';

export interface ServerHandlers {
  'transaction-update': (transaction: { id: string }) => Promise<EmptyObject>;

  undo: () => Promise<void>;

  redo: () => Promise<void>;

  'transactions-batch-update': (
    arg: Omit<
      Parameters<typeof batchUpdateTransactions>[0],
      'detectOrphanPayees'
    >,
  ) => Promise<Awaited<ReturnType<typeof batchUpdateTransactions>>['updated']>;

  'transaction-add': (transaction) => Promise<EmptyObject>;

  'transaction-add': (transaction) => Promise<EmptyObject>;

  'transaction-delete': (transaction) => Promise<EmptyObject>;

  'transactions-parse-file': (arg: {
    filepath: string;
    options;
  }) => Promise<ParseFileResult>;

  'transactions-export': (arg: {
    transactions;
    accounts?;
    categoryGroups;
    payees;
  }) => Promise<unknown>;

  'transactions-export-query': (arg: { query: queryState }) => Promise<unknown>;

  'get-categories': () => Promise<{
    grouped: unknown[];
    list: unknown[];
  }>;

  'get-earliest-transaction': () => Promise<unknown>;

  'get-budget-bounds': () => Promise<{ start: string; end: string }>;

  'rollover-budget-month': (arg: { month }) => Promise<unknown>;

  'report-budget-month': (arg: { month }) => Promise<unknown>;

  'budget-set-type': (arg: { type }) => Promise<unknown>;

  'category-create': (arg: { name; groupId; isIncome }) => Promise<unknown>;

  'category-update': (category) => Promise<unknown>;

  'category-move': (arg: { id; groupId; targetId }) => Promise<unknown>;

  'category-delete': (arg: { id; transferId }) => Promise<{ error?: string }>;

  'category-group-create': (arg: {
    name;
    isIncome?: boolean;
  }) => Promise<unknown>;

  'category-group-update': (group) => Promise<unknown>;

  'category-group-move': (arg: { id; targetId }) => Promise<unknown>;

  'category-group-delete': (arg: { id; transferId }) => Promise<unknown>;

  'must-category-transfer': (arg: { id }) => Promise<unknown>;

  'payee-create': (arg: { name }) => Promise<unknown>;

  'payees-get': () => Promise<unknown[]>;

  'payees-get-rule-counts': () => Promise<unknown>;

  'payees-merge': (arg: { targetId; mergeIds }) => Promise<unknown>;

  'payees-batch-change': (arg: {
    added?;
    deleted?;
    updated?;
  }) => Promise<unknown>;

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
    transferAccountId?;
    categoryId?;
    forced?;
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
  'secret-check': (arg: string) => Promise<string | { error?: string }>;

  'nordigen-poll-web-token': (arg: {
    upgradingAccountId;
    requisitionId;
  }) => Promise<{ error } | { data }>;

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
    errors?: { message: string }[];
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

  'sync-reset': () => Promise<{ error?: { reason: string; meta?: unknown } }>;

  'sync-repair': () => Promise<unknown>;

  'key-make': (arg: { password }) => Promise<unknown>;

  'key-test': (arg: {
    fileId;
    password;
  }) => Promise<{ error?: { reason: string } }>;

  'get-did-bootstrap': () => Promise<boolean>;

  'subscribe-needs-bootstrap': (
    args: { url } = {},
  ) => Promise<
    { error: string } | { bootstrapped: unknown; hasServer: boolean }
  >;

  'subscribe-bootstrap': (arg: { password }) => Promise<{ error?: string }>;

  'subscribe-get-user': () => Promise<{ offline: boolean } | null>;

  'subscribe-change-password': (arg: {
    password;
  }) => Promise<{ error?: string }>;

  'subscribe-sign-in': (arg: { password }) => Promise<{ error?: string }>;

  'subscribe-sign-out': () => Promise<'ok'>;

  'get-server-version': () => Promise<{ error?: string } | { version: string }>;

  'get-server-url': () => Promise<unknown>;

  'set-server-url': (arg: { url; validate }) => Promise<unknown>;

  sync: () => Promise<
    | { error: { message: string; reason: string; meta: unknown } }
    | { messages: Message[] }
  >;

  'get-budgets': () => Promise<
    {
      id: string;
      cloudFileId: string;
      groupId: string;
      name: string;
    }[]
  >;

  'get-remote-files': () => Promise<RemoteFile[]>;

  'reset-budget-cache': () => Promise<unknown>;

  'upload-budget': (arg: { id } = {}) => Promise<{ error?: string }>;

  'download-budget': (arg: { fileId; replace? }) => Promise<{ error; id }>;

  'sync-budget': () => Promise<EmptyObject>;

  'load-budget': (arg: { id }) => Promise<{ error }>;

  'create-demo-budget': () => Promise<unknown>;

  'close-budget': () => Promise<'ok'>;

  'delete-budget': (arg: { id; cloudFileId? }) => Promise<'ok'>;

  'create-budget': (arg: {
    budgetName?;
    avoidUpload?;
    testMode?: boolean;
    testBudgetId?;
  }) => Promise<unknown>;

  'import-budget': (arg: {
    filepath: string;
    type: 'ynab4' | 'ynab5' | 'actual';
  }) => Promise<{ error?: string }>;

  'export-budget': () => Promise<Buffer | null>;

  'upload-file-web': (arg: {
    filename: string;
    contents: ArrayBuffer;
  }) => Promise<EmptyObject | null>;

  'backups-get': (arg: { id: string }) => Promise<Backup[]>;

  'backup-load': (arg: { id: string; backupId: string }) => Promise<void>;

  'backup-make': (arg: { id: string }) => Promise<void>;

  'get-last-opened-backup': () => Promise<string | null>;

  'app-focused': () => Promise<void>;
}
