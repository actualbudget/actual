import * as constants from '../constants';
import type { Action } from '../state-types';
import type { AccountState } from '../state-types/account';

const initialState: AccountState = {
  failedAccounts: new Map(),
  accountsSyncing: [],
};

export function update(state = initialState, action: Action): AccountState {
  switch (action.type) {
    case constants.SET_ACCOUNTS_SYNCING:
      return {
        ...state,
        accountsSyncing: action.ids,
      };
    case constants.ACCOUNT_SYNC_STATUS: {
      const failedAccounts = new Map(state.failedAccounts);
      if (action.failed) {
        failedAccounts.set(action.id, {
          type: action.errorType,
          code: action.errorCode,
        });
      } else {
        failedAccounts.delete(action.id);
      }

      return { ...state, failedAccounts };
    }
    case constants.ACCOUNT_SYNC_FAILURES: {
      const failures = new Map();
      action.syncErrors.forEach(error => {
        failures.set(error.id, {
          type: error.type,
          code: error.code,
        });
      });

      return { ...state, failedAccounts: failures };
    }
    default:
  }
  return state;
}
