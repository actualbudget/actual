import { Backup } from '../server/backups';
import { RemoteFile } from '../server/cloud-storage';
import { Message } from '../server/sync';

import { Budget } from './budget';
// eslint-disable-next-line import/no-unresolved
import { Query } from './query';
import { EmptyObject } from './util';

export interface ServerHandlers {
  undo: () => Promise<void>;
  redo: () => Promise<void>;

  'get-earliest-transaction': () => Promise<{ date: string }>;

  'make-filters-from-conditions': (arg: {
    conditions: unknown;
    applySpecialCases?: boolean;
  }) => Promise<{ filters: unknown[] }>;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  query: (query: Query) => Promise<{ data: any; dependencies: string[] }>;

  'key-make': (arg: {
    password;
  }) => Promise<{ error?: { reason: string; meta?: unknown } }>;

  'key-test': (arg: {
    fileId;
    password;
  }) => Promise<{ error?: { reason: string } }>;

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
}
