import { createSlice, type PayloadAction } from '@reduxjs/toolkit';

import { send } from 'loot-core/platform/client/fetch';
import { type SyncResponseWithErrors } from 'loot-core/server/accounts/app';
import {
  type SyncServerGoCardlessAccount,
  type AccountEntity,
  type TransactionEntity,
  type SyncServerSimpleFinAccount,
  type SyncServerPluggyAiAccount,
} from 'loot-core/types/models';

import { resetApp } from '@desktop-client/app/appSlice';
import { addNotification } from '@desktop-client/notifications/notificationsSlice';
import {
  getAccounts,
  getPayees,
  setNewTransactions,
} from '@desktop-client/queries/queriesSlice';
import { createAppAsyncThunk } from '@desktop-client/redux';
import { type AppDispatch } from '@desktop-client/redux/store';

const sliceName = 'account';

type AccountState = {
  failedAccounts: {
    [key: AccountEntity['id']]: { type: string; code: string };
  };
  accountsSyncing: Array<AccountEntity['id']>;
};

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
  extraReducers: builder => {
    builder.addCase(resetApp, () => initialState);
  },
});

type UnlinkAccountPayload = {
  id: AccountEntity['id'];
};

export const unlinkAccount = createAppAsyncThunk(
  `${sliceName}/unlinkAccount`,
  async ({ id }: UnlinkAccountPayload, { dispatch }) => {
    const { markAccountSuccess } = accountsSlice.actions;
    await send('account-unlink', { id });
    dispatch(markAccountSuccess({ id }));
    dispatch(getAccounts());
  },
);

type LinkAccountPayload = {
  requisitionId: string;
  account: SyncServerGoCardlessAccount;
  upgradingId?: AccountEntity['id'] | undefined;
  offBudget?: boolean | undefined;
};

export const linkAccount = createAppAsyncThunk(
  `${sliceName}/linkAccount`,
  async (
    { requisitionId, account, upgradingId, offBudget }: LinkAccountPayload,
    { dispatch },
  ) => {
    await send('gocardless-accounts-link', {
      requisitionId,
      account,
      upgradingId,
      offBudget,
    });
    dispatch(getPayees());
    dispatch(getAccounts());
  },
);

type LinkAccountSimpleFinPayload = {
  externalAccount: SyncServerSimpleFinAccount;
  upgradingId?: AccountEntity['id'] | undefined;
  offBudget?: boolean | undefined;
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
    dispatch(getPayees());
    dispatch(getAccounts());
  },
);

type LinkAccountPluggyAiPayload = {
  externalAccount: SyncServerPluggyAiAccount;
  upgradingId?: AccountEntity['id'];
  offBudget?: boolean;
};

export const linkAccountPluggyAi = createAppAsyncThunk(
  `${sliceName}/linkAccountPluggyAi`,
  async (
    { externalAccount, upgradingId, offBudget }: LinkAccountPluggyAiPayload,
    { dispatch },
  ) => {
    await send('pluggyai-accounts-link', {
      externalAccount,
      upgradingId,
      offBudget,
    });
    dispatch(getPayees());
    dispatch(getAccounts());
  },
);

function handleSyncResponse(
  accountId: AccountEntity['id'],
  res: SyncResponseWithErrors,
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
    if ('type' in error && error.type === 'SyncError') {
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
    if ('type' in error && error.type === 'SyncError') {
      dispatch(
        addNotification({
          notification: {
            type: 'error',
            message: error.message,
          },
        }),
      );
    } else {
      dispatch(
        addNotification({
          notification: {
            type: 'error',
            message: error.message,
            internal: 'internal' in error ? error.internal : undefined,
          },
        }),
      );
    }
  });

  resNewTransactions.push(...newTransactions);
  resMatchedTransactions.push(...matchedTransactions);
  resUpdatedAccounts.push(...updatedAccounts);

  dispatch(getAccounts());

  return newTransactions.length > 0 || matchedTransactions.length > 0;
}

type SyncAccountsPayload = {
  id?: AccountEntity['id'] | undefined;
};

export const syncAccounts = createAppAsyncThunk(
  `${sliceName}/syncAccounts`,
  async ({ id }: SyncAccountsPayload, { dispatch, getState }) => {
    // Disallow two parallel sync operations
    const accountsState = getState().account;
    if (accountsState.accountsSyncing.length > 0) {
      return false;
    }

    const { setAccountsSyncing } = accountsSlice.actions;

    if (id === 'uncategorized') {
      // Sync no accounts
      dispatch(setAccountsSyncing({ ids: [] }));
      return false;
    }

    const queriesState = getState().queries;
    let accountIdsToSync: string[];
    if (id === 'offbudget' || id === 'onbudget') {
      const targetOffbudget = id === 'offbudget' ? 1 : 0;
      accountIdsToSync = queriesState.accounts
        .filter(
          ({ bank, closed, tombstone, offbudget }) =>
            !!bank && !closed && !tombstone && offbudget === targetOffbudget,
        )
        .sort((a, b) => a.sort_order - b.sort_order)
        .map(({ id }) => id);
    } else if (id) {
      accountIdsToSync = [id];
    } else {
      // Default: all accounts
      accountIdsToSync = queriesState.accounts
        .filter(
          ({ bank, closed, tombstone }) => !!bank && !closed && !tombstone,
        )
        .sort((a, b) =>
          a.offbudget === b.offbudget
            ? a.sort_order - b.sort_order
            : a.offbudget - b.offbudget,
        )
        .map(({ id }) => id);
    }

    dispatch(setAccountsSyncing({ ids: accountIdsToSync }));

    // TODO: Force cast to AccountEntity.
    // Server is currently returning the DB model it should return the entity model instead.
    const accountsData = (await send(
      'accounts-get',
    )) as unknown as AccountEntity[];
    const simpleFinAccounts = accountsData.filter(
      a =>
        a.account_sync_source === 'simpleFin' &&
        accountIdsToSync.includes(a.id),
    );

    let isSyncSuccess = false;
    const newTransactions: Array<TransactionEntity['id']> = [];
    const matchedTransactions: Array<TransactionEntity['id']> = [];
    const updatedAccounts: Array<AccountEntity['id']> = [];

    if (simpleFinAccounts.length > 0) {
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
    dispatch(
      setNewTransactions({
        newTransactions,
        matchedTransactions,
        updatedAccounts,
      }),
    );

    // Reset the sync state back to empty (fallback in case something breaks
    // in the logic above)
    dispatch(setAccountsSyncing({ ids: [] }));
    return isSyncSuccess;
  },
);

type MoveAccountPayload = {
  id: AccountEntity['id'];
  targetId: AccountEntity['id'] | null;
};

export const moveAccount = createAppAsyncThunk(
  `${sliceName}/moveAccount`,
  async ({ id, targetId }: MoveAccountPayload, { dispatch }) => {
    await send('account-move', { id, targetId });
    dispatch(getAccounts());
    dispatch(getPayees());
  },
);

export const { name, reducer, getInitialState } = accountsSlice;
export const actions = {
  ...accountsSlice.actions,
  linkAccount,
  linkAccountSimpleFin,
  linkAccountPluggyAi,
  moveAccount,
  unlinkAccount,
  syncAccounts,
};
