// @ts-strict-ignore
import { send } from '../../platform/client/fetch';
import * as constants from '../constants';
import type {
  AccountSyncStatusAction,
  SetAccountsSyncingAction,
} from '../state-types/account';
import type {
  MarkAccountReadAction,
  SetLastTransactionAction,
  UpdateNewTransactionsAction,
} from '../state-types/queries';

import { addNotification } from './notifications';
import { getPayees, getAccounts } from './queries';
import type { Dispatch, GetState } from './types';

export function setAccountsSyncing(
  ids: SetAccountsSyncingAction['ids'],
): SetAccountsSyncingAction {
  return {
    type: constants.SET_ACCOUNTS_SYNCING,
    ids,
  };
}

export function markAccountFailed(
  id: AccountSyncStatusAction['id'],
  errorType?: string,
  errorCode?: string,
): AccountSyncStatusAction {
  return {
    type: 'ACCOUNT_SYNC_STATUS',
    id,
    failed: true,
    errorType,
    errorCode,
  };
}
export function markAccountSuccess(
  id: AccountSyncStatusAction['id'],
): AccountSyncStatusAction {
  return {
    type: 'ACCOUNT_SYNC_STATUS',
    id,
    failed: false,
  };
}

export function unlinkAccount(id: string) {
  return async (dispatch: Dispatch) => {
    await send('account-unlink', { id });
    dispatch(markAccountSuccess(id));
    dispatch(getAccounts());
  };
}

export function linkAccount(requisitionId, account, upgradingId, offBudget) {
  return async (dispatch: Dispatch) => {
    await send('gocardless-accounts-link', {
      requisitionId,
      account,
      upgradingId,
      offBudget,
    });
    await dispatch(getPayees());
    await dispatch(getAccounts());
  };
}

export function linkAccountSimpleFin(externalAccount, upgradingId, offBudget) {
  return async (dispatch: Dispatch) => {
    await send('simplefin-accounts-link', {
      externalAccount,
      upgradingId,
      offBudget,
    });
    await dispatch(getPayees());
    await dispatch(getAccounts());
  };
}

export function syncAccounts(id?: string) {
  return async (dispatch: Dispatch, getState: GetState) => {
    // Disallow two parallel sync operations
    if (getState().account.accountsSyncing.length > 0) {
      return false;
    }

    // Build an array of IDs for accounts to sync.. if no `id` provided
    // then we assume that all accounts should be synced
    const accountIdsToSync = id
      ? [id]
      : getState()
          .queries.accounts.filter(
            ({ bank, closed, tombstone }) => !!bank && !closed && !tombstone,
          )
          .map(({ id }) => id);

    dispatch(setAccountsSyncing(accountIdsToSync));

    let isSyncSuccess = false;

    // Loop through the accounts and perform sync operation.. one by one
    for (let idx = 0; idx < accountIdsToSync.length; idx++) {
      const accountId = accountIdsToSync[idx];

      // Perform sync operation
      const { errors, newTransactions, matchedTransactions, updatedAccounts } =
        await send('accounts-bank-sync', {
          id: accountId,
        });

      // Mark the account as failed or succeeded (depending on sync output)
      const [error] = errors;
      if (error) {
        // We only want to mark the account as having problem if it
        // was a real syncing error.
        if (error.type === 'SyncError') {
          dispatch(markAccountFailed(accountId, error.category, error.code));
        }
      } else {
        dispatch(markAccountSuccess(accountId));
      }

      // Dispatch errors (if any)
      errors.forEach(error => {
        if (error.type === 'SyncError') {
          dispatch(
            addNotification({
              type: 'error',
              message: error.message,
            }),
          );
        } else {
          dispatch(
            addNotification({
              type: 'error',
              message: error.message,
              internal: error.internal,
            }),
          );
        }
      });

      // Set new transactions
      dispatch({
        type: constants.SET_NEW_TRANSACTIONS,
        newTransactions,
        matchedTransactions,
        updatedAccounts,
      });

      // Dispatch the ids for the accounts that are yet to be synced
      dispatch(setAccountsSyncing(accountIdsToSync.slice(idx + 1)));

      if (newTransactions.length > 0 || matchedTransactions.length > 0) {
        isSyncSuccess = true;
      }
    }

    // Rest the sync state back to empty (fallback in case something breaks
    // in the logic above)
    dispatch(setAccountsSyncing([]));
    return isSyncSuccess;
  };
}

// Remember the last transaction manually added to the system
export function setLastTransaction(
  transaction: SetLastTransactionAction['transaction'],
): SetLastTransactionAction {
  return {
    type: constants.SET_LAST_TRANSACTION,
    transaction,
  };
}

export function parseTransactions(filepath, options) {
  return async () => {
    return await send('transactions-parse-file', {
      filepath,
      options,
    });
  };
}

export function importTransactions(id: string, transactions, reconcile = true) {
  return async (dispatch: Dispatch): Promise<boolean> => {
    if (!reconcile) {
      await send('api/transactions-add', {
        accountId: id,
        transactions,
      });

      return true;
    }

    const {
      errors = [],
      added,
      updated,
    } = await send('transactions-import', {
      accountId: id,
      transactions,
    });

    errors.forEach(error => {
      dispatch(
        addNotification({
          type: 'error',
          message: error.message,
        }),
      );
    });

    dispatch({
      type: constants.SET_NEW_TRANSACTIONS,
      newTransactions: added,
      matchedTransactions: updated,
      updatedAccounts: added.length > 0 ? [id] : [],
    });

    return added.length > 0 || updated.length > 0;
  };
}

export function updateNewTransactions(changedId): UpdateNewTransactionsAction {
  return {
    type: constants.UPDATE_NEW_TRANSACTIONS,
    changedId,
  };
}

export function markAccountRead(accountId): MarkAccountReadAction {
  return {
    type: constants.MARK_ACCOUNT_READ,
    accountId,
  };
}

export function moveAccount(id, targetId) {
  return async (dispatch: Dispatch) => {
    await send('account-move', { id, targetId });
    dispatch(getAccounts());
    dispatch(getPayees());
  };
}
