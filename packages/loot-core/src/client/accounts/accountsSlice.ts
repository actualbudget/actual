import { createSlice, type PayloadAction } from '@reduxjs/toolkit';

import { send } from '../../platform/client/fetch';
import { type AccountEntity, type TransactionEntity } from '../../types/models';
import { addNotification, getAccounts, getPayees } from '../actions';
import * as constants from '../constants';
import { createAppAsyncThunk, type AppDispatch } from '../store';

const sliceName = 'accounts';

const initialState: AccountState = {
  failedAccounts: {},
  accountsSyncing: [],
};

type SetAccountsSyncingPayload = {
  ids: Array<AccountEntity['id']>;
};

type MarkAccountFailedPayload = {
  id: AccountEntity['id'];
  errorType: string;
  errorCode: string;
};

type MarkAccountSuccessPayload = {
  id: AccountEntity['id'];
};

type AccountState = {
  failedAccounts: {
    [key: AccountEntity['id']]: { type: string; code: string };
  };
  accountsSyncing: Array<AccountEntity['id']>;
};

const accountsSlice = createSlice({
  name: sliceName,
  initialState,
  reducers: {
    setAccountsSyncing(
      state,
      action: PayloadAction<SetAccountsSyncingPayload>,
    ) {
      state.accountsSyncing = action.payload.ids;
    },
    markAccountFailed(state, action: PayloadAction<MarkAccountFailedPayload>) {
      state.failedAccounts[action.payload.id] = {
        type: action.payload.errorType,
        code: action.payload.errorCode,
      };
    },
    markAccountSuccess(
      state,
      action: PayloadAction<MarkAccountSuccessPayload>,
    ) {
      delete state.failedAccounts[action.payload.id];
    },
  },
});

type UnlinkAccountPayload = {
  id: AccountEntity['id'];
};

export const unlinkAccount = createAppAsyncThunk(
  'accounts/unlinkAccount',
  async ({ id }: UnlinkAccountPayload, { dispatch }) => {
    const { markAccountSuccess } = accountsSlice.actions;

    await send('account-unlink', { id });
    dispatch(markAccountSuccess({ id }));
    await dispatch(getAccounts());
  },
);

type LinkAccountArgs = {
  requisitionId: string;
  account: unknown;
  upgradingId?: string;
  offBudget?: boolean;
};

export const linkAccount = createAppAsyncThunk(
  `${sliceName}/linkAccount`,
  async (
    { requisitionId, account, upgradingId, offBudget }: LinkAccountArgs,
    { dispatch },
  ) => {
    await send('gocardless-accounts-link', {
      requisitionId,
      account,
      upgradingId,
      offBudget,
    });
    await dispatch(getPayees());
    await dispatch(getAccounts());
  },
);

type LinkAccountSimpleFinPayload = {
  externalAccount: unknown;
  upgradingId?: AccountEntity['id'];
  offBudget?: boolean;
};

export const linkAccountSimpleFin = createAppAsyncThunk(
  `${sliceName}/linkAccountSimpleFin`,
  async (
    { externalAccount, upgradingId, offBudget }: LinkAccountSimpleFinPayload,
    { dispatch },
  ) => {
    await send('simplefin-accounts-link', {
      externalAccount,
      upgradingId,
      offBudget,
    });
    await dispatch(getPayees());
    await dispatch(getAccounts());
  },
);

function handleSyncResponse(
  accountId: AccountEntity['id'],
  res: {
    errors: Array<{
      type: string;
      category: string;
      code: string;
      message: string;
      internal?: string;
    }>;
    newTransactions: Array<TransactionEntity['id']>;
    matchedTransactions: Array<TransactionEntity['id']>;
    updatedAccounts: Array<AccountEntity['id']>;
  },
  dispatch: AppDispatch,
  resNewTransactions: Array<TransactionEntity['id']>,
  resMatchedTransactions: Array<TransactionEntity['id']>,
  resUpdatedAccounts: Array<AccountEntity['id']>,
) {
  const { errors, newTransactions, matchedTransactions, updatedAccounts } = res;
  const { markAccountFailed, markAccountSuccess } = accountsSlice.actions;

  // Mark the account as failed or succeeded (depending on sync output)
  const [error] = errors;
  if (error) {
    // We only want to mark the account as having problem if it
    // was a real syncing error.
    if (error.type === 'SyncError') {
      dispatch(
        markAccountFailed({
          id: accountId,
          errorType: error.category,
          errorCode: error.code,
        }),
      );
    }
  } else {
    dispatch(markAccountSuccess({ id: accountId }));
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

  resNewTransactions.push(...newTransactions);
  resMatchedTransactions.push(...matchedTransactions);
  resUpdatedAccounts.push(...updatedAccounts);

  return newTransactions.length > 0 || matchedTransactions.length > 0;
}

type SyncAccountsPayload = {
  id?: AccountEntity['id'];
};

export const syncAccounts = createAppAsyncThunk(
  `${sliceName}/syncAccounts`,
  async ({ id }: SyncAccountsPayload, { dispatch, getState }) => {
    // Disallow two parallel sync operations
    const accountsState = getState().accounts;
    if (accountsState.accountsSyncing.length > 0) {
      return false;
    }

    const batchSync = !id;

    // Build an array of IDs for accounts to sync.. if no `id` provided
    // then we assume that all accounts should be synced
    const queriesState = getState().queries;
    let accountIdsToSync = !batchSync
      ? [id]
      : queriesState.accounts
          .filter(
            ({ bank, closed, tombstone }) => !!bank && !closed && !tombstone,
          )
          .sort((a, b) =>
            a.offbudget === b.offbudget
              ? a.sort_order - b.sort_order
              : a.offbudget - b.offbudget,
          )
          .map(({ id }) => id);

    const { setAccountsSyncing } = accountsSlice.actions;
    dispatch(setAccountsSyncing({ ids: accountIdsToSync }));

    const accountsData: AccountEntity[] = await send('accounts-get');
    const simpleFinAccounts = accountsData.filter(
      a => a.account_sync_source === 'simpleFin',
    );

    let isSyncSuccess = false;
    const newTransactions: Array<TransactionEntity['id']> = [];
    const matchedTransactions: Array<TransactionEntity['id']> = [];
    const updatedAccounts: Array<AccountEntity['id']> = [];

    if (batchSync && simpleFinAccounts.length > 0) {
      console.log('Using SimpleFin batch sync');

      const res = await send('simplefin-batch-sync', {
        ids: simpleFinAccounts.map(a => a.id),
      });

      for (const account of res) {
        const success = handleSyncResponse(
          account.accountId,
          account.res,
          dispatch,
          newTransactions,
          matchedTransactions,
          updatedAccounts,
        );
        if (success) isSyncSuccess = true;
      }

      accountIdsToSync = accountIdsToSync.filter(
        id => !simpleFinAccounts.find(sfa => sfa.id === id),
      );
    }

    // Loop through the accounts and perform sync operation.. one by one
    for (let idx = 0; idx < accountIdsToSync.length; idx++) {
      const accountId = accountIdsToSync[idx];

      // Perform sync operation
      const res = await send('accounts-bank-sync', {
        ids: [accountId],
      });

      const success = handleSyncResponse(
        accountId,
        res,
        dispatch,
        newTransactions,
        matchedTransactions,
        updatedAccounts,
      );

      if (success) isSyncSuccess = true;

      // Dispatch the ids for the accounts that are yet to be synced
      dispatch(setAccountsSyncing({ ids: accountIdsToSync.slice(idx + 1) }));
    }

    // Set new transactions
    dispatch({
      type: constants.SET_NEW_TRANSACTIONS,
      newTransactions,
      matchedTransactions,
      updatedAccounts,
    });

    // Reset the sync state back to empty (fallback in case something breaks
    // in the logic above)
    dispatch(setAccountsSyncing({ ids: [] }));
    return isSyncSuccess;
  },
);

type MoveAccountPayload = {
  id: AccountEntity['id'];
  targetId: AccountEntity['id'];
};

export const moveAccount = createAppAsyncThunk(
  `${sliceName}/moveAccount`,
  async ({ id, targetId }: MoveAccountPayload, { dispatch }) => {
    await send('account-move', { id, targetId });
    await dispatch(getAccounts());
    await dispatch(getPayees());
  },
);

export const { name, reducer, getInitialState } = accountsSlice;
export const actions = {
  ...accountsSlice.actions,
  linkAccount,
  linkAccountSimpleFin,
  moveAccount,
  unlinkAccount,
  syncAccounts,
};
