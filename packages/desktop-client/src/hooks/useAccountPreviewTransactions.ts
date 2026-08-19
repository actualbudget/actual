import { useCallback, useMemo } from 'react';

import { groupById } from '@actual-app/core/shared/util';
import type { IntegerAmount } from '@actual-app/core/shared/util';
import type {
  AccountEntity,
  PayeeEntity,
  ScheduleEntity,
  TransactionEntity,
} from '@actual-app/core/types/models';

import * as bindings from '#spreadsheet/bindings';

import { useAccounts } from './useAccounts';
import { usePayees } from './usePayees';
import { usePreviewTransactions } from './usePreviewTransactions';
import { useSheetValue } from './useSheetValue';
import { useSyncedPref } from './useSyncedPref';
import { calculateRunningBalancesBottomUp } from './useTransactions';

type UseAccountPreviewTransactionsProps = {
  accountId?: AccountEntity['id'] | undefined;
};

type UseAccountPreviewTransactionsResult = ReturnType<
  typeof usePreviewTransactions
>;

/**
 * Preview transactions for a given account or all accounts if no `accountId` is provided.
 * This will invert the payees, accounts, and amounts accordingly depending on which account
 * the preview transactions are being viewed from.
 */
export function useAccountPreviewTransactions({
  accountId,
}: UseAccountPreviewTransactionsProps): UseAccountPreviewTransactionsResult {
  const { data: accounts = [] } = useAccounts();
  const accountsById = useMemo(() => groupById(accounts), [accounts]);
  const { data: payees = [] } = usePayees();
  const payeesById = useMemo(() => groupById(payees), [payees]);

  const getPayeeByTransferAccount = useCallback(
    (transferAccountId?: AccountEntity['id'] | null) =>
      payees.find(p => p.transfer_acct === transferAccountId) || null,
    [payees],
  );

  const getTransferAccountByPayee = useCallback(
    (payeeId?: PayeeEntity['id'] | null) => {
      if (!payeeId) {
        return null;
      }

      const transferAccountId = payeesById[payeeId]?.transfer_acct;
      if (!transferAccountId) {
        return null;
      }
      return accountsById[transferAccountId];
    },
    [accountsById, payeesById],
  );

  const accountSchedulesFilter = useCallback(
    (schedule: ScheduleEntity) =>
      isScheduleRelevantToAccount({
        accountId,
        schedule,
        getTransferAccountByPayee,
      }),
    [accountId, getTransferAccountByPayee],
  );

  const accountBalanceValue = useSheetValue<
    'account',
    'balance' | 'accounts-balance'
  >(
    accountId
      ? bindings.accountBalance(accountId)
      : bindings.allAccountBalance(),
  );

  const [showBalances] = useSyncedPref(`show-balances-${accountId}`);

  const {
    previewTransactions: allPreviewTransactions,
    runningBalances: allRunningBalances,
    isLoading,
    error,
  } = usePreviewTransactions({
    filter: accountSchedulesFilter,
    options: {
      calculateRunningBalances: showBalances === 'true',
      startingBalance: accountBalanceValue ?? 0,
    },
  });

  return useMemo(() => {
    if (!accountId) {
      return {
        previewTransactions: allPreviewTransactions,
        runningBalances: allRunningBalances,
        isLoading,
        error,
      };
    }

    const {
      transactions: previewTransactions,
      runningBalances: previewRunningBalances,
    } = inverseBasedOnAccount({
      accountId,
      transactions: allPreviewTransactions,
      runningBalances: allRunningBalances,
      startingBalance: accountBalanceValue ?? 0,
      getPayeeByTransferAccount,
      getTransferAccountByPayee,
    });

    const transactionIds = new Set(previewTransactions.map(t => t.id));
    const runningBalances = new Map(
      [...previewRunningBalances.entries()].filter(([id]) =>
        transactionIds.has(id),
      ),
    );

    return {
      isLoading,
      previewTransactions,
      runningBalances,
      error,
    };
  }, [
    accountId,
    allPreviewTransactions,
    accountBalanceValue,
    allRunningBalances,
    getPayeeByTransferAccount,
    getTransferAccountByPayee,
    isLoading,
    error,
  ]);
}

type InverseBasedOnAccountProps = {
  accountId?: AccountEntity['id'];
  transactions: readonly TransactionEntity[];
  startingBalance: IntegerAmount;
  runningBalances: Map<TransactionEntity['id'], IntegerAmount>;
  getPayeeByTransferAccount: (
    transferAccountId?: AccountEntity['id'] | null,
  ) => PayeeEntity | null;
  getTransferAccountByPayee: (
    payeeId?: PayeeEntity['id'] | null,
  ) => AccountEntity | null;
};

type AccountPreviewTransaction = TransactionEntity & {
  inversed: boolean;
};

type ScheduleRelevantToAccountProps = Pick<
  InverseBasedOnAccountProps,
  'accountId' | 'getTransferAccountByPayee'
> & {
  schedule: ScheduleEntity;
};

export function isScheduleRelevantToAccount({
  accountId,
  schedule,
  getTransferAccountByPayee,
}: ScheduleRelevantToAccountProps): boolean {
  if (!accountId) {
    return true;
  }

  if (
    schedule._account === accountId ||
    getTransferAccountByPayee(schedule._payee)?.id === accountId
  ) {
    return true;
  }

  return schedule._actions.some(action => {
    if (
      action.op !== 'set' ||
      (action.field !== 'payee' && action.field !== 'description') ||
      !action.options?.splitIndex
    ) {
      return false;
    }

    if (
      action.options.formula != null ||
      action.options.template != null ||
      typeof action.value !== 'string'
    ) {
      return true;
    }

    return getTransferAccountByPayee(action.value)?.id === accountId;
  });
}

function inverseTransferForAccount({
  accountId,
  previewStatus,
  transaction,
  getPayeeByTransferAccount,
}: Pick<
  InverseBasedOnAccountProps,
  'accountId' | 'getPayeeByTransferAccount'
> & {
  previewStatus?: TransactionEntity['category'];
  transaction: TransactionEntity;
}): AccountPreviewTransaction {
  const {
    category: _category,
    is_child: _isChild,
    is_parent: _isParent,
    parent_id: _parentId,
    subtransactions: _subtransactions,
    ...standaloneTransaction
  } = transaction;

  return {
    ...standaloneTransaction,
    inversed: true,
    amount: -transaction.amount,
    payee: getPayeeByTransferAccount(transaction.account)?.id || '',
    account: accountId || '',
    ...(previewStatus != null && { category: previewStatus }),
  };
}

export function inverseBasedOnAccount({
  accountId,
  transactions,
  runningBalances,
  startingBalance,
  getPayeeByTransferAccount,
  getTransferAccountByPayee,
}: InverseBasedOnAccountProps): {
  transactions: TransactionEntity[];
  runningBalances: Map<TransactionEntity['id'], IntegerAmount>;
} {
  const parentPreviewStatuses = new Map(
    transactions
      .filter(transaction => transaction.is_parent)
      .map(transaction => [transaction.id, transaction.category]),
  );
  const mappedTransactions: AccountPreviewTransaction[] = transactions.flatMap(
    transaction => {
      if (transaction.account === accountId) {
        return [{ inversed: false, ...transaction }];
      }

      const candidates = transaction.subtransactions
        ? transaction.subtransactions
        : transaction.is_parent
          ? []
          : [transaction];

      return candidates
        .filter(
          candidate =>
            getTransferAccountByPayee(candidate.payee)?.id === accountId,
        )
        .map(candidate =>
          inverseTransferForAccount({
            accountId,
            previewStatus: candidate.parent_id
              ? parentPreviewStatuses.get(candidate.parent_id)
              : candidate.category,
            transaction: candidate,
            getPayeeByTransferAccount,
          }),
        );
    },
  );

  // Recalculate running balances if any transaction was inversed.
  // This is necessary because the running balances are calculated based on the
  // original transaction amounts and accounts, and we need to adjust them
  // based on the inversed transactions.
  const anyInversed = mappedTransactions.some(t => t.inversed);
  const mappedRunningBalances = anyInversed
    ? calculateRunningBalancesBottomUp(
        mappedTransactions,
        'all',
        startingBalance ?? 0,
      )
    : runningBalances;

  return {
    transactions: mappedTransactions,
    runningBalances: mappedRunningBalances,
  };
}
