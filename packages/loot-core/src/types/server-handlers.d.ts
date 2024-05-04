import { ParseFileResult } from '../server/accounts/parse-file';
import { batchUpdateTransactions } from '../server/accounts/transactions';
import { Backup } from '../server/backups';
import { RemoteFile } from '../server/cloud-storage';
import { Node as SpreadsheetNode } from '../server/spreadsheet/spreadsheet';
import { Message } from '../server/sync';
import { QueryState } from '../shared/query';

import { Budget } from './budget';
import {
  AccountEntity,
  CategoryEntity,
  CategoryGroupEntity,
  GoCardlessToken,
  GoCardlessInstitution,
  SimpleFinAccount,
  PayeeEntity,
} from './models';
import { GlobalPrefs, LocalPrefs } from './prefs';
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

  'transactions-export-query': (arg: { query: QueryState }) => Promise<unknown>;

  'get-categories': () => Promise<{
    grouped: Array<CategoryGroupEntity>;
    list: Array<CategoryEntity>;
  }>;

  'get-earliest-transaction': () => Promise<{ date: string }>;

  'get-budget-bounds': () => Promise<{ start: string; end: string }>;

  'rollover-budget-month': (arg: { month }) => Promise<
    {
      value: string | number | boolean;
      name: string;
    }[]
  >;

  'report-budget-month': (arg: { month }) => Promise<
    {
      value: string | number | boolean;
      name: string;
    }[]
  >;

  'budget-set-type': (arg: { type }) => Promise<unknown>;

  'category-create': (arg: {
    name;
    groupId;
    isIncome?;
    hidden?: boolean;
  }) => Promise<string>;

  'category-update': (category) => Promise<unknown>;

  'category-move': (arg: { id; groupId; targetId }) => Promise<unknown>;

  'category-delete': (arg: { id; transferId? }) => Promise<{ error?: string }>;

  'category-group-create': (arg: {
    name;
    isIncome?: boolean;
  }) => Promise<string>;

  'category-group-update': (group) => Promise<unknown>;

  'category-group-move': (arg: { id; targetId }) => Promise<unknown>;

  'category-group-delete': (arg: { id; transferId }) => Promise<unknown>;

  'must-category-transfer': (arg: { id }) => Promise<unknown>;

  'payee-create': (arg: { name }) => Promise<string>;

  'payees-get': () => Promise<PayeeEntity[]>;

  'payees-get-rule-counts': () => Promise<unknown>;

  'payees-merge': (arg: { targetId; mergeIds }) => Promise<unknown>;

  'payees-batch-change': (arg: {
    added?;
    deleted?;
    updated?;
  }) => Promise<unknown>;

  'payees-check-orphaned': (arg: { ids }) => Promise<unknown>;

  'payees-get-rules': (arg: { id }) => Promise<unknown>;

  'make-filters-from-conditions': (arg: {
    conditions;
  }) => Promise<{ filters: unknown[] }>;

  getCell: (arg: {
    sheetName;
    name;
  }) => Promise<SpreadsheetNode | { value?: SpreadsheetNode['value'] }>;

  getCells: (arg: { names }) => Promise<unknown>;

  getCellNamesInSheet: (arg: { sheetName }) => Promise<unknown>;

  debugCell: (arg: { sheetName; name }) => Promise<unknown>;

  'create-query': (arg: { sheetName; name; query }) => Promise<unknown>;

  query: (query) => Promise<{ data; dependencies }>;

  'account-update': (arg: { id; name }) => Promise<unknown>;

  'accounts-get': () => Promise<AccountEntity[]>;

  'account-properties': (arg: {
    id;
  }) => Promise<{ balance: number; numTransactions: number }>;

  'gocardless-accounts-link': (arg: {
    requisitionId;
    account;
    upgradingId;
  }) => Promise<'ok'>;

  'simplefin-accounts-link': (arg: {
    externalAccount;
    upgradingId;
  }) => Promise<'ok'>;

  'account-create': (arg: {
    name: string;
    balance?: number;
    offBudget?: boolean;
    closed?: 0 | 1;
  }) => Promise<string>;

  'account-close': (arg: {
    id;
    transferAccountId?;
    categoryId?;
    forced?;
  }) => Promise<unknown>;

  'account-reopen': (arg: { id }) => Promise<unknown>;

  'account-move': (arg: { id; targetId }) => Promise<unknown>;

  'secret-set': (arg: { name: string; value: string }) => Promise<null>;
  'secret-check': (arg: string) => Promise<string | { error?: string }>;

  'gocardless-poll-web-token': (arg: {
    upgradingAccountId?: string;
    requisitionId: string;
  }) => Promise<
    { error: 'unknown' } | { error: 'timeout' } | { data: GoCardlessToken }
  >;

  'gocardless-status': () => Promise<{ configured: boolean }>;

  'simplefin-status': () => Promise<{ configured: boolean }>;

  'simplefin-accounts': () => Promise<{ accounts: SimpleFinAccount[] }>;

  'gocardless-get-banks': (country: string) => Promise<{
    data: GoCardlessInstitution[];
    error?: { reason: string };
  }>;

  'gocardless-poll-web-token-stop': () => Promise<'ok'>;

  'gocardless-create-web-token': (arg: {
    upgradingAccountId?: string;
    institutionId: string;
    accessValidForDays: number;
  }) => Promise<
    | {
        requisitionId: string;
        link: string;
      }
    | { error: 'unauthorized' }
    | { error: 'failed' }
  >;

  'gocardless-accounts-sync': (arg: { id: string }) => Promise<{
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

  'save-global-prefs': (prefs) => Promise<'ok'>;

  'load-global-prefs': () => Promise<GlobalPrefs>;

  'save-prefs': (prefsToSet) => Promise<'ok'>;

  'load-prefs': () => Promise<LocalPrefs | null>;

  'sync-reset': () => Promise<{ error?: { reason: string; meta?: unknown } }>;

  'sync-repair': () => Promise<unknown>;

  'key-make': (arg: {
    password;
  }) => Promise<{ error?: { reason: string; meta?: unknown } }>;

  'key-test': (arg: {
    fileId;
    password;
  }) => Promise<{ error?: { reason: string } }>;

  'get-did-bootstrap': () => Promise<boolean>;

  'subscribe-needs-bootstrap': (args: {
    url;
  }) => Promise<
    { error: string } | { bootstrapped: unknown; hasServer: boolean }
  >;

  'subscribe-bootstrap': (arg: { password }) => Promise<{ error?: string }>;

  'subscribe-get-user': () => Promise<{ offline: boolean } | null>;

  'subscribe-change-password': (arg: {
    password;
  }) => Promise<{ error?: string }>;

  'subscribe-sign-in': (arg: {
    password;
    loginMethod?: string;
  }) => Promise<{ error?: string }>;

  'subscribe-sign-out': () => Promise<'ok'>;

  'get-server-version': () => Promise<{ error?: string } | { version: string }>;

  'get-server-url': () => Promise<string | null>;

  'set-server-url': (arg: {
    url: string;
    validate?: boolean;
  }) => Promise<{ error?: string }>;

  sync: () => Promise<
    | { error: { message: string; reason: string; meta: unknown } }
    | { messages: Message[] }
  >;

  'get-budgets': () => Promise<Budget[]>;

  'get-remote-files': () => Promise<RemoteFile[]>;

  'reset-budget-cache': () => Promise<unknown>;

  'upload-budget': (arg: { id }) => Promise<{ error?: string }>;

  'download-budget': (arg: { fileId; replace? }) => Promise<{ error; id }>;

  'sync-budget': () => Promise<{
    error?: { message: string; reason: string; meta: unknown };
  }>;

  'load-budget': (arg: { id: string }) => Promise<{ error }>;

  'create-demo-budget': () => Promise<unknown>;

  'close-budget': () => Promise<'ok'>;

  'delete-budget': (arg: {
    id?: string;
    cloudFileId?: string;
  }) => Promise<'ok'>;

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

  'export-budget': () => Promise<{ data: Buffer } | { error: string }>;

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
