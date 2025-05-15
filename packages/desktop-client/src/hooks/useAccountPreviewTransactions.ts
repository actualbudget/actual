import { useMemo } from 'react';

import { usePreviewTransactions } from 'loot-core/client/data-hooks/transactions';
import {
  type AccountEntity,
  type PayeeEntity,
  type TransactionEntity,
} from 'loot-core/types/models';

import { useAccounts } from './useAccounts';
import { usePayees } from './usePayees';

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
  const {
    previewTransactions: allPreviewTransactions,
    runningBalances: allRunningBalances,
    isLoading,
    error,
  } = usePreviewTransactions();
  const accounts = useAccounts();
  const payees = usePayees();

  return useMemo(() => {
    if (!accountId) {
      return {
        previewTransactions: [],
        runningBalances: new Map(),
        isLoading: false,
        error: undefined,
      };
    }

    const previewTransactions = accountPreview({
      accountId,
      transactions: allPreviewTransactions,
      getPayeeByTransferAccount: transferAccountId =>
        payees.find(p => p.transfer_acct === transferAccountId),
      getTransferAccountByPayee: payeeId =>
        accounts.find(
          a => a.id === payees.find(p => p.id === payeeId)?.transfer_acct,
        ),
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
    accounts,
    allPreviewTransactions,
    allRunningBalances,
    error,
    isLoading,
    payees,
  ]);
}

type AccountPreviewProps = {
  accountId?: AccountEntity['id'];
  transactions: readonly TransactionEntity[];
  getPayeeByTransferAccount: (
    transferAccountId: PayeeEntity['transfer_acct'],
  ) => PayeeEntity | undefined;
  getTransferAccountByPayee: (
    payeeId: TransactionEntity['payee'],
  ) => AccountEntity | undefined;
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
