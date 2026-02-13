import { useTranslation } from 'react-i18next';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { QueryClient, QueryKey } from '@tanstack/react-query';
import { v4 as uuidv4 } from 'uuid';

import { send } from 'loot-core/platform/client/connection';
import type { SyncResponseWithErrors } from 'loot-core/server/accounts/app';
import type {
  AccountEntity,
  CategoryEntity,
  SyncServerGoCardlessAccount,
  SyncServerPluggyAiAccount,
  SyncServerSimpleFinAccount,
  TransactionEntity,
} from 'loot-core/types/models';

import {
  markAccountFailed,
  markAccountSuccess,
  markUpdatedAccounts,
  setAccountsSyncing,
} from './accountsSlice';
import { accountQueries } from './queries';

import { sync } from '@desktop-client/app/appSlice';
import { useAccounts } from '@desktop-client/hooks/useAccounts';
import { addNotification } from '@desktop-client/notifications/notificationsSlice';
import { markPayeesDirty } from '@desktop-client/payees/payeesSlice';
import { useDispatch, useStore } from '@desktop-client/redux';
import type { AppDispatch } from '@desktop-client/redux/store';
import { setNewTransactions } from '@desktop-client/transactions/transactionsSlice';

const invalidateQueries = (queryClient: QueryClient, queryKey?: QueryKey) => {
  queryClient.invalidateQueries({
    queryKey: queryKey ?? accountQueries.lists(),
  });
};

const dispatchErrorNotification = (
  dispatch: AppDispatch,
  message: string,
  error?: Error,
) => {
  dispatch(
    addNotification({
      notification: {
        id: uuidv4(),
        type: 'error',
        message,
        pre: error ? error.message : undefined,
      },
    }),
  );
};

type CreateAccountPayload = {
  name: string;
  balance: number;
  offBudget: boolean;
};

export function useCreateAccountMutation() {
  const queryClient = useQueryClient();
  const dispatch = useDispatch();
  const { t } = useTranslation();

  return useMutation({
    mutationFn: async ({ name, balance, offBudget }: CreateAccountPayload) => {
      const id = await send('account-create', {
        name,
        balance,
        offBudget,
      });
      return id;
    },
    onSuccess: () => invalidateQueries(queryClient),
    onError: error => {
      console.error('Error creating account:', error);
      dispatchErrorNotification(
        dispatch,
        t('There was an error creating the account. Please try again.'),
        error,
      );
    },
  });
}

type CloseAccountPayload = {
  id: AccountEntity['id'];
  transferAccountId?: AccountEntity['id'];
  categoryId?: CategoryEntity['id'];
  forced?: boolean;
};

export function useCloseAccountMutation() {
  const queryClient = useQueryClient();
  const dispatch = useDispatch();
  const { t } = useTranslation();

  return useMutation({
    mutationFn: async ({
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
    onSuccess: () => invalidateQueries(queryClient),
    onError: error => {
      console.error('Error closing account:', error);
      dispatchErrorNotification(
        dispatch,
        t('There was an error closing the account. Please try again.'),
        error,
      );
    },
  });
}

type ReopenAccountPayload = {
  id: AccountEntity['id'];
};

export function useReopenAccountMutation() {
  const queryClient = useQueryClient();
  const dispatch = useDispatch();
  const { t } = useTranslation();

  return useMutation({
    mutationFn: async ({ id }: ReopenAccountPayload) => {
      await send('account-reopen', { id });
    },
    onSuccess: () => invalidateQueries(queryClient),
    onError: error => {
      console.error('Error re-opening account:', error);
      dispatchErrorNotification(
        dispatch,
        t('There was an error re-opening the account. Please try again.'),
        error,
      );
    },
  });
}

type UpdateAccountPayload = {
  account: AccountEntity;
};

export function useUpdateAccountMutation() {
  const queryClient = useQueryClient();
  const dispatch = useDispatch();
  const { t } = useTranslation();

  return useMutation({
    mutationFn: async ({ account }: UpdateAccountPayload) => {
      await send('account-update', account);
      return account;
    },
    onSuccess: () => invalidateQueries(queryClient),
    onError: error => {
      console.error('Error updating account:', error);
      dispatchErrorNotification(
        dispatch,
        t('There was an error updating the account. Please try again.'),
        error,
      );
    },
  });
}

type MoveAccountPayload = {
  id: AccountEntity['id'];
  targetId: AccountEntity['id'] | null;
};

export function useMoveAccountMutation() {
  const queryClient = useQueryClient();
  const dispatch = useDispatch();
  const { t } = useTranslation();

  return useMutation({
    mutationFn: async ({ id, targetId }: MoveAccountPayload) => {
      await send('account-move', { id, targetId });
    },
    onSuccess: () => {
      invalidateQueries(queryClient);
      // TODO: Change to a call to queryClient.invalidateQueries
      // once payees have been moved to react-query.
      dispatch(markPayeesDirty());
    },
    onError: error => {
      console.error('Error moving account:', error);
      dispatchErrorNotification(
        dispatch,
        t('There was an error moving the account. Please try again.'),
        error,
      );
    },
  });
}

type ImportPreviewTransactionsPayload = {
  accountId: string;
  transactions: TransactionEntity[];
};

export function useImportPreviewTransactionsMutation() {
  const queryClient = useQueryClient();
  const dispatch = useDispatch();
  const { t } = useTranslation();

  return useMutation({
    mutationFn: async ({
      accountId,
      transactions,
    }: ImportPreviewTransactionsPayload) => {
      const { errors = [], updatedPreview } = await send(
        'transactions-import',
        {
          accountId,
          transactions,
          isPreview: true,
        },
      );

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
    onSuccess: () => invalidateQueries(queryClient),
    onError: error => {
      console.error('Error importing preview transactions to account:', error);
      dispatchErrorNotification(
        dispatch,
        t(
          'There was an error importing preview transactions to the account. Please try again.',
        ),
        error,
      );
    },
  });
}

type ImportTransactionsPayload = {
  accountId: string;
  transactions: TransactionEntity[];
  reconcile: boolean;
};

export function useImportTransactionsMutation() {
  const queryClient = useQueryClient();
  const dispatch = useDispatch();
  const { t } = useTranslation();

  return useMutation({
    mutationFn: async ({
      accountId,
      transactions,
      reconcile,
    }: ImportTransactionsPayload) => {
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
    onSuccess: () => invalidateQueries(queryClient),
    onError: error => {
      console.error('Error importing transactions to account:', error);
      dispatchErrorNotification(
        dispatch,
        t(
          'There was an error importing transactions to the account. Please try again.',
        ),
        error,
      );
    },
  });
}

type UnlinkAccountPayload = {
  id: AccountEntity['id'];
};

export function useUnlinkAccountMutation() {
  const queryClient = useQueryClient();
  const dispatch = useDispatch();
  const { t } = useTranslation();

  return useMutation({
    mutationFn: async ({ id }: UnlinkAccountPayload) => {
      await send('account-unlink', { id });
    },
    onSuccess: (_, { id }) => {
      invalidateQueries(queryClient);
      dispatch(markAccountSuccess({ id }));
    },
    onError: error => {
      console.error('Error unlinking account:', error);
      dispatchErrorNotification(
        dispatch,
        t('There was an error unlinking the account. Please try again.'),
        error,
      );
    },
  });
}

// Shared base type for link account payloads
type LinkAccountBasePayload = {
  upgradingId?: AccountEntity['id'];
  offBudget?: boolean;
  startingDate?: string;
  startingBalance?: number;
};

type LinkAccountPayload = LinkAccountBasePayload & {
  requisitionId: string;
  account: SyncServerGoCardlessAccount;
};

export function useLinkAccountMutation() {
  const queryClient = useQueryClient();
  const dispatch = useDispatch();
  const { t } = useTranslation();

  return useMutation({
    mutationFn: async ({
      requisitionId,
      account,
      upgradingId,
      offBudget,
      startingDate,
      startingBalance,
    }: LinkAccountPayload) => {
      await send('gocardless-accounts-link', {
        requisitionId,
        account,
        upgradingId,
        offBudget,
        startingDate,
        startingBalance,
      });
    },
    onSuccess: () => {
      invalidateQueries(queryClient);
      // TODO: Change to a call to queryClient.invalidateQueries
      // once payees have been moved to react-query.
      dispatch(markPayeesDirty());
    },
    onError: error => {
      console.error('Error linking account:', error);
      dispatchErrorNotification(
        dispatch,
        t('There was an error linking the account. Please try again.'),
        error,
      );
    },
  });
}

type LinkAccountSimpleFinPayload = LinkAccountBasePayload & {
  externalAccount: SyncServerSimpleFinAccount;
};

export function useLinkAccountSimpleFinMutation() {
  const queryClient = useQueryClient();
  const dispatch = useDispatch();
  const { t } = useTranslation();

  return useMutation({
    mutationFn: async ({
      externalAccount,
      upgradingId,
      offBudget,
      startingDate,
      startingBalance,
    }: LinkAccountSimpleFinPayload) => {
      await send('simplefin-accounts-link', {
        externalAccount,
        upgradingId,
        offBudget,
        startingDate,
        startingBalance,
      });
    },
    onSuccess: () => {
      invalidateQueries(queryClient);
      // TODO: Change to a call to queryClient.invalidateQueries
      // once payees have been moved to react-query.
      dispatch(markPayeesDirty());
    },
    onError: error => {
      console.error('Error linking account to SimpleFIN:', error);
      dispatchErrorNotification(
        dispatch,
        t(
          'There was an error linking the account to SimpleFIN. Please try again.',
        ),
        error,
      );
    },
  });
}

type LinkAccountPluggyAiPayload = LinkAccountBasePayload & {
  externalAccount: SyncServerPluggyAiAccount;
};

export function useLinkAccountPluggyAiMutation() {
  const queryClient = useQueryClient();
  const dispatch = useDispatch();
  const { t } = useTranslation();

  return useMutation({
    mutationFn: async ({
      externalAccount,
      upgradingId,
      offBudget,
      startingDate,
      startingBalance,
    }: LinkAccountPluggyAiPayload) => {
      await send('pluggyai-accounts-link', {
        externalAccount,
        upgradingId,
        offBudget,
        startingDate,
        startingBalance,
      });
    },
    onSuccess: () => {
      invalidateQueries(queryClient);
      // TODO: Change to a call to queryClient.invalidateQueries
      // once payees have been moved to react-query.
      dispatch(markPayeesDirty());
    },
    onError: error => {
      console.error('Error linking account to PluggyAI:', error);
      dispatchErrorNotification(
        dispatch,
        t(
          'There was an error linking the account to PluggyAI. Please try again.',
        ),
        error,
      );
    },
  });
}

type SyncAccountsPayload = {
  id?: AccountEntity['id'] | undefined;
};

export function useSyncAccountsMutation() {
  const queryClient = useQueryClient();
  const dispatch = useDispatch();
  const { t } = useTranslation();

  const accounts = useAccounts();
  const store = useStore();

  return useMutation({
    mutationFn: async ({ id }: SyncAccountsPayload) => {
      const {
        account: { accountsSyncing = [] },
      } = store.getState();

      // Disallow two parallel sync operations
      if (accountsSyncing.length > 0) {
        return false;
      }

      if (id === 'uncategorized') {
        // Sync no accounts
        dispatch(setAccountsSyncing({ ids: [] }));
        return false;
      }

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

      const simpleFinAccounts = accounts.filter(
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
            queryClient,
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
          queryClient,
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

      // Reset the sync state back to empty (fallback in case something breaks
      // in the logic above)
      dispatch(setAccountsSyncing({ ids: [] }));
      return isSyncSuccess;
    },
    onSuccess: () => invalidateQueries(queryClient),
    onError: error => {
      console.error('Error syncing accounts:', error);
      dispatchErrorNotification(
        dispatch,
        t('There was an error syncing accounts. Please try again.'),
        error,
      );
    },
  });
}

function handleSyncResponse(
  accountId: AccountEntity['id'],
  res: SyncResponseWithErrors,
  dispatch: AppDispatch,
  queryClient: QueryClient,
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

  invalidateQueries(queryClient);

  return newTransactions.length > 0 || matchedTransactions.length > 0;
}

type SyncAndDownloadPayload = {
  id?: AccountEntity['id'];
};

export function useSyncAndDownloadMutation() {
  const queryClient = useQueryClient();
  const dispatch = useDispatch();
  const { t } = useTranslation();

  const syncAccounts = useSyncAccountsMutation();

  return useMutation({
    mutationFn: async ({ id }: SyncAndDownloadPayload) => {
      // It is *critical* that we sync first because of transaction
      // reconciliation. We want to get all transactions that other
      // clients have already made, so that imported transactions can be
      // reconciled against them. Otherwise, two clients will each add
      // new transactions from the bank and create duplicate ones.
      const syncState = await dispatch(sync()).unwrap();
      if (syncState.error) {
        return { error: syncState.error };
      }

      const hasDownloaded = await syncAccounts.mutateAsync({ id });

      if (hasDownloaded) {
        // Sync again afterwards if new transactions were created
        const syncState = await dispatch(sync()).unwrap();
        if (syncState.error) {
          return { error: syncState.error };
        }

        // `hasDownloaded` is already true, we know there has been
        // updates
        return true;
      }
      return { hasUpdated: hasDownloaded };
    },
    onSuccess: () => invalidateQueries(queryClient),
    onError: error => {
      console.error('Error syncing accounts:', error);
      dispatchErrorNotification(
        dispatch,
        t('There was an error syncing accounts. Please try again.'),
        error,
      );
    },
  });
}
