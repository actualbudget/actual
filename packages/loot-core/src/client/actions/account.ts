// @ts-strict-ignore
import { send } from '../../platform/client/fetch';
import * as constants from '../constants';
import type {
  MarkAccountReadAction,
  SetLastTransactionAction,
  UpdateNewTransactionsAction,
} from '../state-types/queries';
import { type AppDispatch } from '../store';

import { addNotification } from './notifications';

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

export function importPreviewTransactions(id: string, transactions) {
  return async (dispatch: AppDispatch): Promise<boolean> => {
    const { errors = [], updatedPreview } = await send('transactions-import', {
      accountId: id,
      transactions,
      isPreview: true,
    });

    errors.forEach(error => {
      dispatch(
        addNotification({
          type: 'error',
          message: error.message,
        }),
      );
    });

    return updatedPreview;
  };
}

export function importTransactions(id: string, transactions, reconcile = true) {
  return async (dispatch: AppDispatch): Promise<boolean> => {
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
      isPreview: false,
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
