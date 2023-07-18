import { send } from '../../platform/client/fetch';
import * as constants from '../constants';
import type {
  AccountSyncFailuresAction,
  AccountSyncStatusAction,
  SetAccountsSyncingAction,
} from '../state-types/account';

import { addNotification } from './notifications';
import { getPayees, getAccounts } from './queries';
import type { ActionResult } from './types';

export function setAccountsSyncing(
  name: SetAccountsSyncingAction['name'],
): ActionResult {
  return {
    type: constants.SET_ACCOUNTS_SYNCING,
    name,
  };
}

export function markAccountFailed(
  id: AccountSyncStatusAction['id'],
  errorType?: string,
  errorCode?: string,
): ActionResult {
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
): ActionResult {
  return {
    type: 'ACCOUNT_SYNC_STATUS',
    id,
    failed: false,
  };
}
export function setFailedAccounts(
  syncErrors: AccountSyncFailuresAction['syncErrors'],
): ActionResult {
  return {
    type: 'ACCOUNT_SYNC_FAILURES',
    syncErrors,
  };
}

export function unlinkAccount(id: string): ActionResult {
  return async dispatch => {
    await send('account-unlink', { id });
    dispatch(markAccountSuccess(id));
    dispatch(getAccounts());
  };
}

export function linkAccount(requisitionId, account, upgradingId): ActionResult {
  return async dispatch => {
    await send('gocardless-accounts-link', {
      requisitionId,
      account,
      upgradingId,
    });
    await dispatch(getPayees());
    await dispatch(getAccounts());
  };
}

export function connectAccounts(
  institution,
  publicToken,
  accountIds,
  offbudgetIds,
): ActionResult {
  return async dispatch => {
    let ids = await send('accounts-connect', {
      institution,
      publicToken,
      accountIds,
      offbudgetIds,
    });
    await dispatch(getPayees());
    await dispatch(getAccounts());
    return ids;
  };
}

export function connectGoCardlessAccounts(
  institution,
  publicToken,
  accountIds,
  offbudgetIds,
): ActionResult {
  return async dispatch => {
    let ids = await send('gocardless-accounts-connect', {
      institution,
      publicToken,
      accountIds,
      offbudgetIds,
    });
    await dispatch(getPayees());
    await dispatch(getAccounts());
    return ids;
  };
}

export function syncAccounts(id): ActionResult {
  return async (dispatch, getState) => {
    if (getState().account.accountsSyncing) {
      return false;
    }

    if (id) {
      let account = getState().queries.accounts.find(a => a.id === id);
      dispatch(setAccountsSyncing(account.name));
    } else {
      dispatch(setAccountsSyncing('__all'));
    }

    const { errors, newTransactions, matchedTransactions, updatedAccounts } =
      await send('gocardless-accounts-sync', { id });
    dispatch(setAccountsSyncing(null));

    if (id) {
      let error = errors.find(error => error.accountId === id);

      if (error) {
        // We only want to mark the account as having problem if it
        // was a real syncing error.
        if (error.type === 'SyncError') {
          dispatch(markAccountFailed(id, error.category, error.code));
        }
      } else {
        dispatch(markAccountSuccess(id));
      }
    } else {
      dispatch(
        setFailedAccounts(
          errors
            .filter(error => error.type === 'SyncError')
            .map(error => ({
              id: error.accountId,
              type: error.category,
              code: error.code,
            })),
        ),
      );
    }

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

    dispatch({
      type: constants.SET_NEW_TRANSACTIONS,
      newTransactions,
      matchedTransactions,
      updatedAccounts,
    });

    return newTransactions.length > 0 || matchedTransactions.length > 0;
  };
}

// Remember the last transaction manually added to the system
export function setLastTransaction(transaction): ActionResult {
  return {
    type: constants.SET_LAST_TRANSACTION,
    transaction,
  };
}

export function parseTransactions(filepath, options): ActionResult {
  return async dispatch => {
    return await send('transactions-parse-file', {
      filepath,
      options,
    });
  };
}

export function importTransactions(id, transactions): ActionResult {
  return async dispatch => {
    let {
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

export function updateNewTransactions(changedId): ActionResult {
  return {
    type: constants.UPDATE_NEW_TRANSACTIONS,
    changedId,
  };
}

export function markAccountRead(accountId): ActionResult {
  return {
    type: constants.MARK_ACCOUNT_READ,
    accountId: accountId,
  };
}
