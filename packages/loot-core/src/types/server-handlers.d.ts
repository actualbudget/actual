import { Backup } from '../server/backups';
import { RemoteFile } from '../server/cloud-storage';
import { Node as SpreadsheetNode } from '../server/spreadsheet/spreadsheet';
import { Message } from '../server/sync';

import { Budget } from './budget';
import { CategoryEntity, CategoryGroupEntity } from './models';
import { OpenIdConfig } from './models/openid';
// eslint-disable-next-line import/no-unresolved
import { Query } from './query';
import { EmptyObject } from './util';

export interface ServerHandlers {
  undo: () => Promise<void>;
  redo: () => Promise<void>;

  'get-categories': () => Promise<{
    grouped: Array<CategoryGroupEntity>;
    list: Array<CategoryEntity>;
  }>;

  'get-category-groups': () => Promise<Array<CategoryGroupEntity>>;

  'get-earliest-transaction': () => Promise<{ date: string }>;

  'get-budget-bounds': () => Promise<{ start: string; end: string }>;

  'envelope-budget-month': (arg: { month: string }) => Promise<
    {
      value: string | number | boolean;
      name: string;
    }[]
  >;

  'tracking-budget-month': (arg: { month: string }) => Promise<
    {
      value: string | number | boolean;
      name: string;
    }[]
  >;

  'category-create': (arg: {
    name: CategoryEntity['name'];
    groupId: CategoryGroupEntity['id'];
    isIncome?: CategoryEntity['is_income'];
    hidden?: CategoryEntity['hidden'];
  }) => Promise<CategoryEntity['id']>;

  'category-update': (
    category: CategoryEntity,
  ) => Promise<{ error?: { type: 'category-exists' } }>;

  'category-move': (arg: {
    id: CategoryEntity['id'];
    groupId: CategoryGroupEntity['id'];
    targetId: CategoryEntity['id'];
  }) => Promise<void>;

  'category-delete': (arg: {
    id: CategoryEntity['id'];
    transferId?: CategoryEntity['id'];
  }) => Promise<{ error?: 'no-categories' | 'category-type' }>;

  'category-group-create': (arg: {
    name: CategoryGroupEntity['name'];
    isIncome?: CategoryGroupEntity['is_income'];
    hidden?: CategoryGroupEntity['hidden'];
  }) => Promise<CategoryGroupEntity['id']>;

  'category-group-update': (group: CategoryGroupEntity) => Promise<unknown>;

  'category-group-move': (arg: {
    id: CategoryGroupEntity['id'];
    targetId: CategoryGroupEntity['id'];
  }) => Promise<void>;

  'category-group-delete': (arg: {
    id: CategoryGroupEntity['id'];
    transferId: CategoryEntity['id'];
  }) => Promise<void>;

  'must-category-transfer': (arg: {
    id: CategoryEntity['id'];
  }) => Promise<boolean>;

  'make-filters-from-conditions': (arg: {
    conditions: unknown;
    applySpecialCases?: boolean;
  }) => Promise<{ filters: unknown[] }>;

  getCell: (arg: { sheetName; name }) => Promise<{
    name: SpreadsheetNode['name'];
    value: SpreadsheetNode['value'];
  }>;

  getCells: (arg: {
    names;
  }) => Promise<
    Array<{ name: SpreadsheetNode['name']; value?: SpreadsheetNode['value'] }>
  >;

  getCellNamesInSheet: (arg: {
    sheetName;
  }) => Promise<Array<SpreadsheetNode['name']>>;

  debugCell: (arg: { sheetName; name }) => Promise<unknown>;

  'create-query': (arg: { sheetName; name; query }) => Promise<'ok'>;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  query: (query: Query) => Promise<{ data: any; dependencies: string[] }>;

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

  'subscribe-needs-bootstrap': (args: { url }) => Promise<
    | { error: string }
    | {
        bootstrapped: boolean;
        hasServer: false;
      }
    | {
        bootstrapped: boolean;
        hasServer: true;
        availableLoginMethods: {
          method: string;
          displayName: string;
          active: boolean;
        }[];
        multiuser: boolean;
      }
  >;

  'subscribe-get-login-methods': () => Promise<{
    methods?: { method: string; displayName: string; active: boolean }[];
    error?: string;
  }>;

  'subscribe-bootstrap': (arg: {
    password?: string;
    openId?: OpenIdConfig;
  }) => Promise<{ error?: string }>;

  'subscribe-get-user': () => Promise<{
    offline: boolean;
    userName?: string;
    userId?: string;
    displayName?: string;
    permission?: string;
    loginMethod?: string;
    tokenExpired?: boolean;
  } | null>;

  'subscribe-change-password': (arg: {
    password;
  }) => Promise<{ error?: string }>;

  'subscribe-sign-in': (
    arg:
      | {
          password;
          loginMethod?: string;
        }
      | {
          return_url;
          loginMethod?: 'openid';
        },
  ) => Promise<{ error?: string; redirect_url?: string }>;

  'subscribe-sign-out': () => Promise<'ok'>;

  'subscribe-set-token': (arg: { token: string }) => Promise<void>;

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

  'validate-budget-name': (arg: {
    name: string;
  }) => Promise<{ valid: boolean; message?: string }>;

  'unique-budget-name': (arg: { name: string }) => Promise<string>;

  'get-budgets': () => Promise<Budget[]>;

  'get-remote-files': () => Promise<RemoteFile[]>;

  'get-user-file-info': (fileId: string) => Promise<RemoteFile | null>;

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
    id?: string | undefined;
    cloudFileId?: string | undefined;
  }) => Promise<'ok' | 'fail'>;

  /**
   * Duplicates a budget file.
   * @param {Object} arg - The arguments for duplicating a budget.
   * @param {string} [arg.id] - The ID of the local budget to duplicate.
   * @param {string} [arg.cloudId] - The ID of the cloud-synced budget to duplicate.
   * @param {string} arg.newName - The name for the duplicated budget.
   * @param {boolean} [arg.cloudSync] - Whether to sync the duplicated budget to the cloud.
   * @returns {Promise<string>} The ID of the newly created budget.
   */
  'duplicate-budget': (arg: {
    id?: string | undefined;
    cloudId?: string | undefined;
    newName: string;
    cloudSync?: boolean;
    open: 'none' | 'original' | 'copy';
  }) => Promise<string>;

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

  'enable-openid': (arg: {
    openId?: OpenIdConfig;
  }) => Promise<{ error?: string }>;

  'enable-password': (arg: { password: string }) => Promise<{ error?: string }>;

  'get-openid-config': () => Promise<
    | {
        openId: OpenIdConfig;
      }
    | { error: string }
    | null
  >;
}
