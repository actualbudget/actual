import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import memoizeOne from 'memoize-one';

import { send } from 'loot-core/platform/client/fetch';
import { type SyncResponseWithErrors } from 'loot-core/server/accounts/app';
import { groupById } from 'loot-core/shared/util';
import {
  type AccountEntity,
  type CategoryEntity,
  type SyncServerGoCardlessAccount,
  type SyncServerPluggyAiAccount,
  type SyncServerSimpleFinAccount,
  type TransactionEntity,
} from 'loot-core/types/models';

import { resetApp } from '@desktop-client/app/appSlice';
import { addNotification } from '@desktop-client/notifications/notificationsSlice';
import { markPayeesDirty } from '@desktop-client/payees/payeesSlice';
import { createAppAsyncThunk } from '@desktop-client/redux';
import { type AppDispatch } from '@desktop-client/redux/store';
import { setNewTransactions } from '@desktop-client/transactions/transactionsSlice';

const sliceName = 'account';

type SyncRequest = {
  id: string; // account ID or special values like 'ALL_ACCOUNTS'
  timestamp: number;
};

type AccountState = {
  failedAccounts: {
    [key: AccountEntity['id']]: { type: string; code: string };
  };
  accountsSyncing: Array<AccountEntity['id']>;
  updatedAccounts: Array<AccountEntity['id']>;
  accounts: AccountEntity[];
  isAccountsLoading: boolean;
  isAccountsLoaded: boolean;
  isAccountsDirty: boolean;
  syncQueue: Array<SyncRequest>;
  isProcessingQueue: boolean;
};

const initialState: AccountState = {
  failedAccounts: {},
  accountsSyncing: [],
  updatedAccounts: [],
  accounts: [],
  isAccountsLoading: false,
  isAccountsLoaded: false,
  isAccountsDirty: false,
  syncQueue: [],
  isProcessingQueue: false,
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

type MarkUpdatedAccountsPayload = {
  ids: AccountState['updatedAccounts'];
};

type MarkAccountReadPayload = {
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
    markUpdatedAccounts(
      state,
      action: PayloadAction<MarkUpdatedAccountsPayload>,
    ) {
      state.updatedAccounts = action.payload.ids
        ? [...state.updatedAccounts, ...action.payload.ids]
        : state.updatedAccounts;
    },
    markAccountRead(state, action: PayloadAction<MarkAccountReadPayload>) {
      state.updatedAccounts = state.updatedAccounts.filter(
        id => id !== action.payload.id,
      );
    },
    markAccountsDirty(state) {
      _markAccountsDirty(state);
    },
    addToSyncQueue(state, action: PayloadAction<SyncRequest>) {
      // Prevent duplicate requests
      const exists = state.syncQueue.some(req => req.id === action.payload.id);
      if (!exists) {
        state.syncQueue.push(action.payload);
      }
    },
    removeFromSyncQueue(state, action: PayloadAction<{ id: string }>) {
      state.syncQueue = state.syncQueue.filter(
        req => req.id !== action.payload.id,
      );
    },
    setProcessingQueue(
      state,
      action: PayloadAction<{ isProcessing: boolean }>,
    ) {
      state.isProcessingQueue = action.payload.isProcessing;
    },
    clearSyncQueue(state) {
      state.syncQueue = [];
      state.isProcessingQueue = false;
    },
  },
  extraReducers: builder => {
    builder.addCase(resetApp, () => initialState);

    builder.addCase(createAccount.fulfilled, _markAccountsDirty);
    builder.addCase(updateAccount.fulfilled, _markAccountsDirty);
    builder.addCase(closeAccount.fulfilled, _markAccountsDirty);
    builder.addCase(reopenAccount.fulfilled, _markAccountsDirty);

    builder.addCase(reloadAccounts.fulfilled, (state, action) => {
      _loadAccounts(state, action.payload);
    });

    builder.addCase(reloadAccounts.rejected, state => {
      state.isAccountsLoading = false;
    });

    builder.addCase(reloadAccounts.pending, state => {
      state.isAccountsLoading = true;
    });

    builder.addCase(getAccounts.fulfilled, (state, action) => {
      _loadAccounts(state, action.payload);
    });

    builder.addCase(getAccounts.rejected, state => {
      state.isAccountsLoading = false;
    });

    builder.addCase(getAccounts.pending, state => {
      state.isAccountsLoading = true;
    });
  },
});
type CreateAccountPayload = {
  name: string;
  balance: number;
  offBudget: boolean;
};

export const createAccount = createAppAsyncThunk(
  `${sliceName}/createAccount`,
  async ({ name, balance, offBudget }: CreateAccountPayload) => {
    const id = await send('account-create', {
      name,
      balance,
      offBudget,
    });
    return id;
  },
);

type CloseAccountPayload = {
  id: AccountEntity['id'];
  transferAccountId?: AccountEntity['id'];
  categoryId?: CategoryEntity['id'];
  forced?: boolean;
};

export const closeAccount = createAppAsyncThunk(
  `${sliceName}/closeAccount`,
  async ({
    id,
    transferAccountId,
    categoryId,
    forced,
  }: CloseAccountPayload) => {
    await send('account-close', {
      id,
      transferAccountId: transferAccountId || undefined,
      categoryId: categoryId || undefined,
      forced,
    });
  },
);

type ReopenAccountPayload = {
  id: AccountEntity['id'];
};

export const reopenAccount = createAppAsyncThunk(
  `${sliceName}/reopenAccount`,
  async ({ id }: ReopenAccountPayload) => {
    await send('account-reopen', { id });
  },
);

type UpdateAccountPayload = {
  account: AccountEntity;
};

export const updateAccount = createAppAsyncThunk(
  `${sliceName}/updateAccount`,
  async ({ account }: UpdateAccountPayload) => {
    await send('account-update', account);
    return account;
  },
);

export const getAccounts = createAppAsyncThunk(
  `${sliceName}/getAccounts`,
  async () => {
    // TODO: Force cast to AccountEntity.
    // Server is currently returning the DB model it should return the entity model instead.
    const accounts = (await send('accounts-get')) as unknown as AccountEntity[];
    return accounts;
  },
  {
    condition: (_, { getState }) => {
      const { account } = getState();
      return (
        !account.isAccountsLoading &&
        (account.isAccountsDirty || !account.isAccountsLoaded)
      );
    },
  },
);

export const reloadAccounts = createAppAsyncThunk(
  `${sliceName}/reloadAccounts`,
  async () => {
    // TODO: Force cast to AccountEntity.
    // Server is currently returning the DB model it should return the entity model instead.
    const accounts = (await send('accounts-get')) as unknown as AccountEntity[];
    return accounts;
  },
);

type UnlinkAccountPayload = {
  id: AccountEntity['id'];
};

export const unlinkAccount = createAppAsyncThunk(
  `${sliceName}/unlinkAccount`,
  async ({ id }: UnlinkAccountPayload, { dispatch }) => {
    await send('account-unlink', { id });
    dispatch(actions.markAccountSuccess({ id }));
    dispatch(actions.markAccountsDirty());
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
    dispatch(markPayeesDirty());
    dispatch(markAccountsDirty());
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
    dispatch(markPayeesDirty());
    dispatch(markAccountsDirty());
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
    dispatch(markPayeesDirty());
    dispatch(markAccountsDirty());
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

  dispatch(markAccountsDirty());

  return newTransactions.length > 0 || matchedTransactions.length > 0;
}

type SyncAccountsPayload = {
  id?: AccountEntity['id'] | undefined;
};

export const syncAccounts = createAppAsyncThunk(
  `${sliceName}/syncAccounts`,
  async ({ id }: SyncAccountsPayload, { dispatch, getState }) => {
    const { addToSyncQueue } = accountsSlice.actions;

    // Convert id to queue format
    const queueId = id || 'ALL_ACCOUNTS';

    // Add to queue
    dispatch(
      addToSyncQueue({
        id: queueId,
        timestamp: Date.now(),
      }),
    );

    // Only start processing if not already processing (atomic check-and-set)
    const { isProcessingQueue } = getState().account;
    if (!isProcessingQueue) {
      return dispatch(processQueue()).unwrap();
    }

    // Item queued but processing already active
    return false;
  },
);

export const processQueue = createAppAsyncThunk(
  `${sliceName}/processQueue`,
  async (_, { dispatch, getState }) => {
    const { setProcessingQueue, removeFromSyncQueue } = accountsSlice.actions;

    // Atomic check-and-set using Redux state
    const currentState = getState().account;
    if (currentState.isProcessingQueue) {
      return false; // Already processing
    }

    // Set processing flag immediately
    dispatch(setProcessingQueue({ isProcessing: true }));

    let hasAnySuccess = false;

    try {
      while (true) {
        const { syncQueue } = getState().account;

        if (syncQueue.length === 0) {
          break;
        }

        const request = syncQueue[0];

        // Convert back to original format
        const originalId =
          request.id === 'ALL_ACCOUNTS' ? undefined : request.id;

        try {
          // Process using original sync logic
          const success = await dispatch(
            processSingleSync({ id: originalId }),
          ).unwrap();
          if (success) {
            hasAnySuccess = true;
          }

          // Only remove from queue if processing succeeded
          dispatch(removeFromSyncQueue({ id: request.id }));
        } catch (error) {
          console.error(`Sync failed for ${request.id}:`, error);
          // Remove failed item from queue to prevent infinite retry
          dispatch(removeFromSyncQueue({ id: request.id }));
        }
      }
    } catch (error) {
      console.error('Queue processing error:', error);
    } finally {
      // Always reset processing flag
      dispatch(setProcessingQueue({ isProcessing: false }));
    }

    return hasAnySuccess;
  },
);

export const processSingleSync = createAppAsyncThunk(
  `${sliceName}/processSingleSync`,
  async ({ id }: SyncAccountsPayload, { dispatch, getState }) => {
    const { setAccountsSyncing } = accountsSlice.actions;

    if (id === 'uncategorized') {
      dispatch(setAccountsSyncing({ ids: [] }));
      return false;
    }

    const { accounts } = getState().account;
    let accountIdsToSync: string[];
    if (id === 'offbudget' || id === 'onbudget') {
      const targetOffbudget = id === 'offbudget' ? 1 : 0;
      accountIdsToSync = accounts
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
      accountIdsToSync = accounts
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

    try {
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

        // Process SimpleFin results and update accountsSyncing progressively
        for (let i = 0; i < res.length; i++) {
          const account = res[i];
          const success = handleSyncResponse(
            account.accountId,
            account.res,
            dispatch,
            newTransactions,
            matchedTransactions,
            updatedAccounts,
          );
          if (success) isSyncSuccess = true;

          // Update accountsSyncing to show remaining accounts
          const remainingSimpleFinIds = simpleFinAccounts
            .slice(i + 1)
            .map(a => a.id);
          const remainingOtherIds = accountIdsToSync.filter(
            id => !simpleFinAccounts.find(sfa => sfa.id === id),
          );
          dispatch(
            setAccountsSyncing({
              ids: [...remainingSimpleFinIds, ...remainingOtherIds],
            }),
          );
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
        }),
      );

      dispatch(markUpdatedAccounts({ ids: updatedAccounts }));

      return isSyncSuccess;
    } catch (error) {
      console.error('Sync error:', error);
      throw error;
    } finally {
      // Always reset sync state
      dispatch(setAccountsSyncing({ ids: [] }));
    }
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
    dispatch(markAccountsDirty());
    dispatch(markPayeesDirty());
  },
);

type ImportPreviewTransactionsPayload = {
  accountId: string;
  transactions: TransactionEntity[];
};

export const importPreviewTransactions = createAppAsyncThunk(
  `${sliceName}/importPreviewTransactions`,
  async (
    { accountId, transactions }: ImportPreviewTransactionsPayload,
    { dispatch },
  ) => {
    const { errors = [], updatedPreview } = await send('transactions-import', {
      accountId,
      transactions,
      isPreview: true,
    });

    errors.forEach(error => {
      dispatch(
        addNotification({
          notification: {
            type: 'error',
            message: error.message,
          },
        }),
      );
    });

    return updatedPreview;
  },
);

type ImportTransactionsPayload = {
  accountId: string;
  transactions: TransactionEntity[];
  reconcile: boolean;
};

export const importTransactions = createAppAsyncThunk(
  `${sliceName}/importTransactions`,
  async (
    { accountId, transactions, reconcile }: ImportTransactionsPayload,
    { dispatch },
  ) => {
    if (!reconcile) {
      await send('api/transactions-add', {
        accountId,
        transactions,
      });

      return true;
    }

    const {
      errors = [],
      added,
      updated,
    } = await send('transactions-import', {
      accountId,
      transactions,
      isPreview: false,
    });

    errors.forEach(error => {
      dispatch(
        addNotification({
          notification: {
            type: 'error',
            message: error.message,
          },
        }),
      );
    });

    dispatch(
      setNewTransactions({
        newTransactions: added,
        matchedTransactions: updated,
      }),
    );

    dispatch(
      markUpdatedAccounts({
        ids: added.length > 0 ? [accountId] : [],
      }),
    );

    return added.length > 0 || updated.length > 0;
  },
);

export const getAccountsById = memoizeOne(
  (accounts: AccountEntity[] | null | undefined) => groupById(accounts),
);

export const { name, reducer, getInitialState } = accountsSlice;
export const actions = {
  ...accountsSlice.actions,
  createAccount,
  updateAccount,
  getAccounts,
  reloadAccounts,
  closeAccount,
  reopenAccount,
  linkAccount,
  linkAccountSimpleFin,
  linkAccountPluggyAi,
  moveAccount,
  unlinkAccount,
  syncAccounts,
};

export const {
  markAccountRead,
  markAccountFailed,
  markAccountSuccess,
  markAccountsDirty,
  markUpdatedAccounts,
  setAccountsSyncing,
} = accountsSlice.actions;

function _loadAccounts(
  state: AccountState,
  accounts: AccountState['accounts'],
) {
  state.accounts = accounts;
  state.isAccountsLoading = false;
  state.isAccountsLoaded = true;
  state.isAccountsDirty = false;
}

function _markAccountsDirty(state: AccountState) {
  state.isAccountsDirty = true;
}
