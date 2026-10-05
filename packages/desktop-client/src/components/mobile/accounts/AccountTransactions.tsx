import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { useTranslation } from 'react-i18next';
import { useSearchParams } from 'react-router';

import { send } from '@actual-app/core/platform/client/connection';
import type { Query } from '@actual-app/core/shared/query';
import { isPreviewId } from '@actual-app/core/shared/transactions';
import type { IntegerAmount } from '@actual-app/core/shared/util';
import type {
  AccountEntity,
  TransactionEntity,
} from '@actual-app/core/types/models';

import {
  useSyncAndDownloadMutation,
  useUpdateAccountMutation,
} from '#accounts';
import { markAccountRead } from '#accounts/accountsSlice';
import * as reconciliation from '#accounts/reconciliation';
import { toRegisterView } from '#accounts/registerView';
import { ReconcilingBanner } from '#components/mobile/accounts/ReconcilingBanner';
import { TransactionListWithBalances } from '#components/mobile/transactions/TransactionListWithBalances';
import { AccountCurrencyFormat } from '#hooks/currencyFormatContext';
import { useAccountPreviewTransactions } from '#hooks/useAccountPreviewTransactions';
import { SchedulesProvider } from '#hooks/useCachedSchedules';
import { useDateFormat } from '#hooks/useDateFormat';
import { useNavigate } from '#hooks/useNavigate';
import { postScheduleTransaction } from '#hooks/usePostScheduleTransaction';
import { getSchedulesQuery } from '#hooks/useSchedules';
import { useSheetValue } from '#hooks/useSheetValue';
import { useSyncedPref } from '#hooks/useSyncedPref';
import { useTransactionBatchActions } from '#hooks/useTransactionBatchActions';
import {
  calculateRunningBalancesTopDown,
  useTransactions,
} from '#hooks/useTransactions';
import { useTransactionsSearch } from '#hooks/useTransactionsSearch';
import { collapseModals, pushModal } from '#modals/modalsSlice';
import * as queries from '#queries';
import { aqlQuery } from '#queries/aqlQuery';
import { useDispatch } from '#redux';
import * as bindings from '#spreadsheet/bindings';

export function AccountTransactions({
  account,
}: {
  readonly account: AccountEntity;
}) {
  const schedulesQuery = useMemo(
    () => getSchedulesQuery(account.id),
    [account.id],
  );

  return (
    <SchedulesProvider query={schedulesQuery}>
      {/* A foreign account's page shows native amounts in its currency. */}
      <AccountCurrencyFormat account={account}>
        <TransactionListWithPreviews account={account} />
      </AccountCurrencyFormat>
    </SchedulesProvider>
  );
}

function TransactionListWithPreviews({
  account,
}: {
  readonly account: AccountEntity;
}) {
  const { t } = useTranslation();
  const dateFormat = useDateFormat() || 'MM/dd/yyyy';
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const [showRunningBalances] = useSyncedPref(`show-balances-${account.id}`);
  const [hideReconciled] = useSyncedPref(`hide-reconciled-${account.id}`);

  const [searchParams, setSearchParams] = useSearchParams();
  const parsedReconcileAmount = parseInt(
    searchParams.get('reconcile') ?? '',
    10,
  );
  const reconcileAmount = Number.isNaN(parsedReconcileAmount)
    ? null
    : parsedReconcileAmount;
  const isForeign = !!account.currency && account.currency_precision != null;
  const isReconciling = reconcileAmount != null;

  const baseTransactionsQuery = useCallback(() => {
    let query = queries
      .transactions(account.id)
      .options({ splits: 'all' })
      .select('*');
    if (hideReconciled === 'true' && !isReconciling) {
      query = query.filter({ reconciled: { $eq: false } });
    }
    return query;
  }, [account.id, hideReconciled, isReconciling]);
  const [transactionsQuery, setTransactionsQuery] = useState<Query>(
    baseTransactionsQuery(),
  );

  const { isSearching, search } = useTransactionsSearch({
    updateQuery: setTransactionsQuery,
    resetQuery: () => setTransactionsQuery(baseTransactionsQuery()),
    dateFormat,
    amountField: isForeign ? 'transaction_amount' : 'amount',
  });

  const searchTextRef = useRef('');

  const onSearch = useCallback(
    (searchText: string) => {
      searchTextRef.current = searchText;
      search(searchText);
    },
    [search],
  );

  useEffect(() => {
    setTransactionsQuery(baseTransactionsQuery());
    if (searchTextRef.current !== '') {
      search(searchTextRef.current);
    }
  }, [baseTransactionsQuery, search]);

  const shouldCalculateRunningBalances =
    showRunningBalances === 'true' && !!account?.id && !isSearching;

  // Running balances are in the account's own units.
  const accountBalanceValue = useSheetValue<
    'account',
    'balance' | 'nativeBalance'
  >(bindings.accountDisplayBalance(account));

  const {
    transactions,
    runningBalances,
    isPending: isTransactionsLoading,
    isFetchingNextPage: isLoadingMoreTransactions,
    fetchNextPage: fetchMoreTransactions,
  } = useTransactions({
    query: transactionsQuery,
    options: {
      calculateRunningBalances: shouldCalculateRunningBalances
        ? (rows, splits, start) =>
            calculateRunningBalancesTopDown(
              toRegisterView([...rows], isForeign),
              splits,
              start,
            )
        : shouldCalculateRunningBalances,
      startingBalance: accountBalanceValue || 0,
    },
  });

  // Hidden reconciled rows still change history, so their balances are
  // computed over the account's full sequence.
  const fullSequenceBalances = useFullSequenceRunningBalances({
    account,
    isEnabled:
      shouldCalculateRunningBalances &&
      hideReconciled === 'true' &&
      !isReconciling,
    startingBalance: accountBalanceValue || 0,
    transactions,
  });

  const {
    previewTransactions,
    runningBalances: previewRunningBalances,
    isLoading: isPreviewTransactionsLoading,
  } = useAccountPreviewTransactions({
    accountId: account?.id,
  });

  const syncAndDownload = useSyncAndDownloadMutation();
  const onRefresh = useCallback(() => {
    if (account.id) {
      syncAndDownload.mutate({ id: account.id });
    }
  }, [account.id, syncAndDownload]);

  const allBalances = useMemo(
    () =>
      new Map<TransactionEntity['id'], IntegerAmount>([
        ...previewRunningBalances,
        ...(fullSequenceBalances ?? runningBalances),
      ]),
    [runningBalances, previewRunningBalances, fullSequenceBalances],
  );

  useEffect(() => {
    if (account.id) {
      dispatch(markAccountRead({ id: account.id }));
    }
  }, [account.id, dispatch]);

  const onOpenTransaction = useCallback(
    (transaction: TransactionEntity) => {
      if (!isPreviewId(transaction.id)) {
        void navigate(`/transactions/${transaction.id}`);
      } else {
        dispatch(
          pushModal({
            modal: {
              name: 'scheduled-transaction-menu',
              options: {
                transactionId: transaction.id,
                onPost: async (transactionId, today = false) => {
                  const parts = transactionId.split('/');
                  // Close the menu first: posting may open the conversion
                  // dialog for a foreign schedule without a rate.
                  dispatch(
                    collapseModals({
                      rootModalName: 'scheduled-transaction-menu',
                    }),
                  );
                  await postScheduleTransaction(dispatch, parts[1], today);
                },
                onSkip: async transactionId => {
                  const parts = transactionId.split('/');
                  await send('schedule/skip-next-date', { id: parts[1] });
                  dispatch(
                    collapseModals({
                      rootModalName: 'scheduled-transaction-menu',
                    }),
                  );
                },
                onComplete: async transactionId => {
                  const parts = transactionId.split('/');
                  await send('schedule/update', {
                    schedule: { id: parts[1], completed: true },
                  });
                  dispatch(
                    collapseModals({
                      rootModalName: 'scheduled-transaction-menu',
                    }),
                  );
                },
              },
            },
          }),
        );
      }
    },
    [dispatch, navigate],
  );

  const { mutate: updateAccount } = useUpdateAccountMutation();
  const { onBatchEdit } = useTransactionBatchActions();

  const onDoneReconciling = useCallback(async () => {
    await reconciliation.finishReconciliation(account.id, reconcileAmount);

    updateAccount({
      account: {
        ...account,
        last_reconciled: new Date().getTime().toString(),
      },
    });

    setSearchParams(
      prev => {
        prev.delete('reconcile');
        return prev;
      },
      { replace: true },
    );
  }, [account, reconcileAmount, setSearchParams, updateAccount]);

  const onCreateReconciliationTransaction = useCallback(
    async (targetDiff: number) => {
      if (isForeign && account.currency && account.currency_precision != null) {
        dispatch(
          pushModal({
            modal: {
              name: 'foreign-amount',
              options: {
                transaction: reconciliation.foreignReconciliationDraft(
                  account.id,
                  targetDiff,
                ),
                currencyCode: account.currency,
                nativePrecision: account.currency_precision,
                onPosted: () => undefined,
              },
            },
          }),
        );
        return;
      }
      await reconciliation.createReconciliationTransaction(
        account.id,
        targetDiff,
      );
    },
    [account, isForeign, dispatch],
  );

  const onToggleTransactionCleared = useCallback(
    (transaction: TransactionEntity) => {
      if (isPreviewId(transaction.id)) {
        return;
      }

      if (transaction.reconciled) {
        dispatch(
          pushModal({
            modal: {
              name: 'confirm-transaction-edit',
              options: {
                confirmReason: 'unlockReconciled',
                onConfirm: () => {
                  void reconciliation.unlockTransaction(transaction.id);
                },
              },
            },
          }),
        );
      } else {
        void onBatchEdit({ name: 'cleared', ids: [transaction.id] });
      }
    },
    [dispatch, onBatchEdit],
  );

  const balanceBindings = useMemo(
    () => ({
      balance: isForeign
        ? bindings.accountNativeBalance(account.id)
        : bindings.accountBalance(account.id),
      cleared: isForeign
        ? bindings.accountNativeBalanceCleared(account.id)
        : bindings.accountBalanceCleared(account.id),
      uncleared: isForeign
        ? bindings.accountNativeBalanceUncleared(account.id)
        : bindings.accountBalanceUncleared(account.id),
    }),
    [account, isForeign],
  );

  const previewTransactionsToDisplay = isReconciling ? [] : previewTransactions;

  const viewTransactions = toRegisterView(transactions, isForeign);
  const transactionsToDisplay = !isSearching
    ? // Do not render child transactions in the list, unless searching
      previewTransactionsToDisplay.concat(
        viewTransactions.filter(t => !t.is_child),
      )
    : viewTransactions;

  return (
    <>
      {isReconciling && (
        <ReconcilingBanner
          account={account}
          targetBalance={reconcileAmount}
          onDone={onDoneReconciling}
          onCreateTransaction={onCreateReconciliationTransaction}
        />
      )}
      <TransactionListWithBalances
        isLoading={
          isSearching || isReconciling
            ? isTransactionsLoading
            : isTransactionsLoading || isPreviewTransactionsLoading
        }
        transactions={transactionsToDisplay}
        balance={balanceBindings.balance}
        balanceCleared={balanceBindings.cleared}
        balanceUncleared={balanceBindings.uncleared}
        runningBalances={allBalances}
        showRunningBalances={shouldCalculateRunningBalances}
        isLoadingMore={isLoadingMoreTransactions}
        onLoadMore={fetchMoreTransactions}
        searchPlaceholder={t('Search {{accountName}}', {
          accountName: account.name,
        })}
        onSearch={onSearch}
        onOpenTransaction={onOpenTransaction}
        onRefresh={onRefresh}
        isReconciling={isReconciling}
        onToggleTransactionCleared={onToggleTransactionCleared}
      />
    </>
  );
}

/**
 * Running balances for every row of the account, computed over its full
 * transaction sequence (hidden rows included) in display order.
 * ponytail: loads id and amount for every row of the account; page the
 * aggregate per anchor if very large accounts make this slow.
 */
function useFullSequenceRunningBalances({
  account,
  isEnabled,
  startingBalance,
  transactions,
}: {
  account: AccountEntity;
  isEnabled: boolean;
  startingBalance: IntegerAmount;
  /** Loaded rows; any change (such as a date edit) recomputes balances. */
  transactions: readonly TransactionEntity[];
}) {
  const isForeign = !!account.currency && account.currency_precision != null;
  const [balances, setBalances] = useState<Map<
    TransactionEntity['id'],
    IntegerAmount
  > | null>(null);

  useEffect(() => {
    if (!isEnabled) {
      setBalances(null);
      return;
    }
    let cancelled = false;
    void aqlQuery(
      queries
        .transactions(account.id)
        .options({ splits: 'all' })
        .select(['id', 'parent_id', 'amount', 'transaction_amount']),
    ).then(({ data }) => {
      if (cancelled) return;
      setBalances(
        calculateRunningBalancesTopDown(
          toRegisterView(data, isForeign),
          'all',
          startingBalance,
        ),
      );
    });
    return () => {
      cancelled = true;
    };
  }, [account.id, isEnabled, isForeign, startingBalance, transactions]);

  return balances;
}
