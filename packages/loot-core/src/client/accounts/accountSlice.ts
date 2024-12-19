import {
  createAsyncThunk,
  createSlice,
  type PayloadAction,
} from '@reduxjs/toolkit';

import { send } from '../../platform/client/fetch';
import { type AccountEntity, type TransactionEntity } from '../../types/models';
import { addNotification, getAccounts, getPayees } from '../actions';
import * as constants from '../constants';
import { type AppDispatch, type RootState } from '../store';

const createAppAsyncThunk = createAsyncThunk.withTypes<{
  state: RootState;
  dispatch: AppDispatch;
}>();

const initialState: AccountState = {
  failedAccounts: {},
  accountsSyncing: [],
};

type SetAccountsSyncingAction = PayloadAction<{
  ids: Array<AccountEntity['id']>;
}>;

type MarkAccountFailedAction = PayloadAction<{
  id: AccountEntity['id'];
  errorType: string;
  errorCode: string;
}>;

type MarkAccountSuccessAction = PayloadAction<{
  id: AccountEntity['id'];
}>;

type AccountState = {
  failedAccounts: {
    [key: AccountEntity['id']]: { type: string; code: string };
  };
  accountsSyncing: Array<AccountEntity['id']>;
};

const accountSlice = createSlice({
  name: 'account',
  initialState,
  reducers: {
    setAccountsSyncing(state, action: SetAccountsSyncingAction) {
      const payload = action.payload;
      state.accountsSyncing = payload.ids;
    },
    markAccountFailed(state, action: MarkAccountFailedAction) {
      const payload = action.payload;
      state.failedAccounts[payload.id] = {
        type: payload.errorType,
        code: payload.errorCode,
      };
    },
    markAccountSuccess(state, action: MarkAccountSuccessAction) {
      const payload = action.payload;
      delete state.failedAccounts[payload.id];
    },
  },
});

const { setAccountsSyncing, markAccountFailed, markAccountSuccess } =
  accountSlice.actions;

type UnlinkAccountArgs = {
  id: string;
};

export const unlinkAccount = createAppAsyncThunk(
  'accounts/unlinkAccount',
  async ({ id }: UnlinkAccountArgs, thunkApi) => {
    await send('account-unlink', { id });
    thunkApi.dispatch(markAccountSuccess({ id }));
    thunkApi.dispatch(getAccounts());
  },
);

type LinkAccountArgs = {
  requisitionId: string;
  account: unknown;
  upgradingId?: string;
  offBudget?: boolean;
};

export const linkAccount = createAppAsyncThunk(
  'accounts/linkAccount',
  async (
    { requisitionId, account, upgradingId, offBudget }: LinkAccountArgs,
    thunkApi,
  ) => {
    await send('gocardless-accounts-link', {
      requisitionId,
      account,
      upgradingId,
      offBudget,
    });
    await thunkApi.dispatch(getPayees());
    await thunkApi.dispatch(getAccounts());
  },
);

type LinkAccountSimpleFinArgs = {
  externalAccount: unknown;
  upgradingId?: string;
  offBudget?: boolean;
};

export const linkAccountSimpleFin = createAppAsyncThunk(
  'accounts/linkAccountSimpleFin',
  async (
    { externalAccount, upgradingId, offBudget }: LinkAccountSimpleFinArgs,
    thunkApi,
  ) => {
    await send('simplefin-accounts-link', {
      externalAccount,
      upgradingId,
      offBudget,
    });
    await thunkApi.dispatch(getPayees());
    await thunkApi.dispatch(getAccounts());
  },
);

function handleSyncResponse(
  accountId: string,
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

type SyncAccountsArgs = {
  id?: string;
};

export const syncAccounts = createAppAsyncThunk(
  'accounts/syncAccounts',
  async ({ id }: SyncAccountsArgs, thunkApi) => {
    // Disallow two parallel sync operations
    if (thunkApi.getState().account.accountsSyncing.length > 0) {
      return false;
    }

    const batchSync = !id;

    // Build an array of IDs for accounts to sync.. if no `id` provided
    // then we assume that all accounts should be synced
    let accountIdsToSync = !batchSync
      ? [id]
      : thunkApi
          .getState()
          .queries.accounts.filter(
            ({ bank, closed, tombstone }) => !!bank && !closed && !tombstone,
          )
          .sort((a, b) =>
            a.offbudget === b.offbudget
              ? a.sort_order - b.sort_order
              : a.offbudget - b.offbudget,
          )
          .map(({ id }) => id);

    thunkApi.dispatch(setAccountsSyncing({ ids: accountIdsToSync }));

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
          thunkApi.dispatch,
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
        thunkApi.dispatch,
        newTransactions,
        matchedTransactions,
        updatedAccounts,
      );

      if (success) isSyncSuccess = true;

      // Dispatch the ids for the accounts that are yet to be synced
      thunkApi.dispatch(
        setAccountsSyncing({ ids: accountIdsToSync.slice(idx + 1) }),
      );
    }

    // Set new transactions
    thunkApi.dispatch({
      type: constants.SET_NEW_TRANSACTIONS,
      newTransactions,
      matchedTransactions,
      updatedAccounts,
    });

    // Reset the sync state back to empty (fallback in case something breaks
    // in the logic above)
    thunkApi.dispatch(setAccountsSyncing({ ids: [] }));
    return isSyncSuccess;
  },
);

type MoveAccountArgs = {
  id: string;
  targetId: string;
};

export const moveAccount = createAppAsyncThunk(
  'accounts/moveAccount',
  async ({ id, targetId }: MoveAccountArgs, thunkApi) => {
    await send('account-move', { id, targetId });
    thunkApi.dispatch(getAccounts());
    thunkApi.dispatch(getPayees());
  },
);

export const { name, reducer, getInitialState } = accountSlice;
export const actions = {
  ...accountSlice.actions,
  linkAccount,
  unlinkAccount,
  syncAccounts,
  linkAccountSimpleFin,
  moveAccount,
};
