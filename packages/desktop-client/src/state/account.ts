import { type TransactionEntity } from 'loot-core/types/models';

import type { AccountActions } from './actions/account';
import * as constants from './constants';

export type AccountState = {
  failedAccounts: Map<string, { type: string; code: string }>;
  accountsSyncing: string[];
  newTransactions: string[];
  matchedTransactions: string[];
  lastTransaction: TransactionEntity | null;
  updatedAccounts: string[];
};

const initialState: AccountState = {
  failedAccounts: new Map(),
  accountsSyncing: [],
  newTransactions: [],
  matchedTransactions: [],
  lastTransaction: null,
  updatedAccounts: [],
};

export function update(
  state = initialState,
  action: AccountActions,
): AccountState {
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
    case constants.SET_NEW_TRANSACTIONS:
      return {
        ...state,
        newTransactions: action.newTransactions
          ? [...state.newTransactions, ...action.newTransactions]
          : state.newTransactions,
        matchedTransactions: action.matchedTransactions
          ? [...state.matchedTransactions, ...action.matchedTransactions]
          : state.matchedTransactions,
        updatedAccounts: action.updatedAccounts
          ? [...state.updatedAccounts, ...action.updatedAccounts]
          : state.updatedAccounts,
      };
    case constants.UPDATE_NEW_TRANSACTIONS:
      return {
        ...state,
        newTransactions: state.newTransactions.filter(
          id => id !== action.changedId,
        ),
        matchedTransactions: state.matchedTransactions.filter(
          id => id !== action.changedId,
        ),
      };
    case constants.SET_LAST_TRANSACTION:
      return {
        ...state,
        lastTransaction: action.transaction,
      };
    case constants.MARK_ACCOUNT_READ:
      return {
        ...state,
        updatedAccounts: state.updatedAccounts.filter(
          id => id !== action.accountId,
        ),
      };
    default:
  }
  return state;
}
