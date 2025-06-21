import { useCallback, useMemo } from 'react';

import { groupById, type IntegerAmount } from 'loot-core/shared/util';
import {
  type ScheduleEntity,
  type AccountEntity,
  type PayeeEntity,
  type TransactionEntity,
} from 'loot-core/types/models';

import { useAccounts } from './useAccounts';
import { usePayees } from './usePayees';
import { usePreviewTransactions } from './usePreviewTransactions';
import { useSheetValue } from './useSheetValue';

import { accountBalance } from '@desktop-client/spreadsheet/bindings';

type UseAccountPreviewTransactionsProps = {
  accountId?: AccountEntity['id'] | undefined;
};

// Mirrors the `splits` AQL option from the server
type TransactionSplitsOption = 'all' | 'inline' | 'grouped' | 'none';

type UseAccountPreviewTransactionsResult = {
  previewTransactions: ReadonlyArray<TransactionEntity>;
  runningBalances: Map<TransactionEntity['id'], IntegerAmount>;
  isLoading: boolean;
  error?: Error;
};

/**
 * Preview transactions for a given account. This will invert the payees, accounts,
 * and amounts depending on which account the preview transactions are being viewed from.
 */
export function useAccountPreviewTransactions({
  accountId,
}: UseAccountPreviewTransactionsProps): UseAccountPreviewTransactionsResult {
  const accounts = useAccounts();
  const accountsById = useMemo(() => groupById(accounts), [accounts]);
  const payees = usePayees();
  const payeesById = useMemo(() => groupById(payees), [payees]);

  const getPayeeByTransferAccount = useCallback(
    (transferAccountId?: AccountEntity['id']) =>
      payees.find(p => p.transfer_acct === transferAccountId) || null,
    [payees],
  );

  const getTransferAccountByPayee = useCallback(
    (payeeId?: PayeeEntity['id']) => {
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
      !accountId ||
      schedule._account === accountId ||
      getTransferAccountByPayee(schedule._payee)?.id === accountId,
    [accountId, getTransferAccountByPayee],
  );

  const accountBalanceValue = useSheetValue<'account', 'balance'>(
    accountBalance(accountId || ''),
  );

  const {
    previewTransactions: allPreviewTransactions,
    isLoading,
    error,
  } = usePreviewTransactions({
    filter: accountSchedulesFilter,
  });

  return useMemo(() => {
    if (!accountId) {
      return {
        previewTransactions: allPreviewTransactions,
        runningBalances: new Map(),
        isLoading,
        error,
      };
    }

    const previewTransactions = accountPreview({
      accountId,
      transactions: allPreviewTransactions,
      getPayeeByTransferAccount,
      getTransferAccountByPayee,
    });

    const allRunningBalances = calculateRunningBalancesBottomUp(
      previewTransactions,
      'all',
      accountBalanceValue ?? 0,
    );
    const transactionIds = new Set(previewTransactions.map(t => t.id));
    const runningBalances = allRunningBalances;
    for (const transactionId of runningBalances.keys()) {
      if (!transactionIds.has(transactionId)) {
        runningBalances.delete(transactionId);
      }
    }

    return {
      isLoading,
      previewTransactions,
      runningBalances,
      error,
    };
  }, [
    accountId,
    accountBalanceValue,
    allPreviewTransactions,
    error,
    getPayeeByTransferAccount,
    getTransferAccountByPayee,
    isLoading,
  ]);
}

type AccountPreviewProps = {
  accountId?: AccountEntity['id'];
  transactions: readonly TransactionEntity[];
  getPayeeByTransferAccount: (
    transferAccountId?: AccountEntity['id'],
  ) => PayeeEntity | null;
  getTransferAccountByPayee: (
    payeeId?: PayeeEntity['id'],
  ) => AccountEntity | null;
};

function accountPreview({
  accountId,
  transactions,
  getPayeeByTransferAccount,
  getTransferAccountByPayee,
}: AccountPreviewProps): TransactionEntity[] {
  return transactions.map(transaction => {
    const inverse = transaction.account !== accountId;
    const subtransactions = transaction.subtransactions?.map(st => ({
      ...st,
      amount: inverse ? -st.amount : st.amount,
      payee:
        (inverse ? getPayeeByTransferAccount(st.account)?.id : st.payee) || '',
      account: inverse
        ? getTransferAccountByPayee(st.payee)?.id || ''
        : st.account,
    }));
    return {
      ...transaction,
      amount: inverse ? -transaction.amount : transaction.amount,
      payee:
        (inverse
          ? getPayeeByTransferAccount(transaction.account)?.id
          : transaction.payee) || '',
      account: inverse
        ? getTransferAccountByPayee(transaction.payee)?.id || ''
        : transaction.account,
      ...(subtransactions && { subtransactions }),
    };
  });
}

export function calculateRunningBalancesBottomUp(
  transactions: TransactionEntity[],
  splits: TransactionSplitsOption,
  startingBalance: IntegerAmount = 0,
) {
  return (
    transactions
      .filter(t => {
        switch (splits) {
          case 'all':
            // Only calculate parent/non-split amounts
            return !t.parent_id;
          default:
            // inline
            // grouped
            // none
            return true;
        }
      })
      // We're using `reduceRight` here to calculate the running balance in reverse order (bottom up).
      .reduceRight((acc, transaction, index, arr) => {
        const previousTransactionIndex = index + 1;
        if (previousTransactionIndex >= arr.length) {
          // This is the last transaction in the list,
          // so we set the running balance to the starting balance + the amount of the transaction
          acc.set(transaction.id, startingBalance + transaction.amount);
          return acc;
        }
        const previousTransaction = arr[previousTransactionIndex];
        const previousRunningBalance = acc.get(previousTransaction.id) ?? 0;
        const currentRunningBalance =
          previousRunningBalance + transaction.amount;
        acc.set(transaction.id, currentRunningBalance);
        return acc;
      }, new Map<TransactionEntity['id'], IntegerAmount>())
  );
}
