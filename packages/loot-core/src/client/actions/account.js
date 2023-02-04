import { send } from '../../platform/client/fetch';
import constants from '../constants';

import { addNotification } from './notifications';
import { getPayees, getAccounts } from './queries';

export function setAccountsSyncing(name) {
  return {
    type: constants.SET_ACCOUNTS_SYNCING,
    name
  };
}

export function markAccountFailed(id, errorType, errorCode) {
  return {
    type: 'ACCOUNT_SYNC_STATUS',
    id,
    failed: true,
    errorType,
    errorCode
  };
}
export function markAccountSuccess(id) {
  return {
    type: 'ACCOUNT_SYNC_STATUS',
    id,
    failed: false
  };
}
export function setFailedAccounts(syncErrors) {
  return {
    type: 'ACCOUNT_SYNC_FAILURES',
    syncErrors
  };
}

export function unlinkAccount(id) {
  return async dispatch => {
    await send('account-unlink', { id });
    dispatch(markAccountSuccess(id));
    dispatch(getAccounts());
  };
}

export function linkAccount(institution, publicToken, accountId, upgradingId) {
  return async dispatch => {
    await send('accounts-link', {
      institution,
      publicToken,
      accountId,
      upgradingId
    });
    await dispatch(getPayees());
    await dispatch(getAccounts());
  };
}

export function connectAccounts(
  institution,
  publicToken,
  accountIds,
  offbudgetIds
) {
  return async dispatch => {
    let ids = await send('accounts-connect', {
      institution,
      publicToken,
      accountIds,
      offbudgetIds
    });
    await dispatch(getPayees());
    await dispatch(getAccounts());
    return ids;
  };
}

export function syncAccounts(id) {
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
      await send('accounts-sync', { id });
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
              code: error.code
            }))
        )
      );
    }

    errors.forEach(error => {
      if (error.type === 'SyncError') {
        dispatch(
          addNotification({
            type: 'error',
            message: error.message
          })
        );
      } else {
        dispatch(
          addNotification({
            type: 'error',
            message: error.message,
            internal: error.internal
          })
        );
      }
    });

    dispatch({
      type: constants.SET_NEW_TRANSACTIONS,
      newTransactions,
      matchedTransactions,
      updatedAccounts
    });

    return newTransactions.length > 0 || matchedTransactions.length > 0;
  };
}

// Remember the last transaction manually added to the system
export function setLastTransaction(transaction) {
  return {
    type: constants.SET_LAST_TRANSACTION,
    transaction
  };
}

export function parseTransactions(filepath, options) {
  return async dispatch => {
    return await send('transactions-parse-file', {
      filepath,
      options
    });
  };
}

export function importTransactions(id, transactions) {
  return async dispatch => {
    let {
      errors = [],
      added,
      updated
    } = await send('transactions-import', {
      accountId: id,
      transactions
    });

    errors.forEach(error => {
      dispatch(
        addNotification({
          type: 'error',
          message: error.message,
          internal: error.internal
        })
      );
    });

    dispatch({
      type: constants.SET_NEW_TRANSACTIONS,
      newTransactions: added,
      matchedTransactions: updated,
      updatedAccounts: added.length > 0 ? [id] : []
    });

    return added.length > 0 || updated.length > 0;
  };
}

export function updateNewTransactions(changedId) {
  return {
    type: constants.UPDATE_NEW_TRANSACTIONS,
    changedId
  };
}

export function markAccountRead(accountId) {
  return {
    type: constants.MARK_ACCOUNT_READ,
    accountId: accountId
  };
}

export function getBanks() {
  return async dispatch => {
    dispatch({
      type: constants.LOAD_BANKS,
      banks: await send('banks')
    });
  };
}
