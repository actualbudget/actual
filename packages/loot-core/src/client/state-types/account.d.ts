import type * as constants from '../constants';

export type AccountState = {
  failedAccounts: Map<string, { type: string; code: string }>;
  accountsSyncing: string[];
};

export type SetAccountsSyncingAction = {
  type: typeof constants.SET_ACCOUNTS_SYNCING;
  ids: string[];
};

export type AccountSyncStatusAction = {
  type: typeof constants.ACCOUNT_SYNC_STATUS;
  id: string;
} & (
  | {
      failed: false;
    }
  | {
      failed: true;
      errorType: string;
      errorCode: string;
    }
);

export type AccountSyncFailuresAction = {
  type: typeof constants.ACCOUNT_SYNC_FAILURES;
  syncErrors: Array<{
    id: string;
    type: string;
    code: string;
  }>;
};

export type AccountActions =
  | SetAccountsSyncingAction
  | AccountSyncStatusAction
  | AccountSyncFailuresAction;
