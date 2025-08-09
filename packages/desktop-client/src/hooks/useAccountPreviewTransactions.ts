import { useCallback, useMemo } from 'react';

import { groupById } from 'loot-core/shared/util';
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

type UseAccountPreviewTransactionsResult = ReturnType<
  typeof usePreviewTransactions
>;

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
    runningBalances: allRunningBalances,
    isLoading,
    error,
  } = usePreviewTransactions({
    filter: accountSchedulesFilter,
    options: {
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

    const previewTransactions = accountPreview({
      accountId,
      transactions: allPreviewTransactions,
      getPayeeByTransferAccount,
      getTransferAccountByPayee,
    });

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
    allPreviewTransactions,
    allRunningBalances,
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
