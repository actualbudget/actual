import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';

import { q } from 'loot-core/shared/query';
import {
  type AccountEntity,
  type PayeeEntity,
  type TransactionEntity,
} from 'loot-core/types/models';

import { useAccounts } from './useAccounts';
import { usePayeesById } from './usePayees';
import { useTransactions } from './useTransactions';

type Counts = {
  counts: Record<PayeeEntity['id'], number>;
  maxCount: number;
  mostCommonPayeeTransaction: TransactionEntity | null;
};

type UseDisplayPayeeProps = {
  transaction?: TransactionEntity | undefined;
};

export function useDisplayPayee({ transaction }: UseDisplayPayeeProps) {
  const { t } = useTranslation();

  const needsSubtransactionQuery =
    transaction?.is_parent && !transaction?.subtransactions;

  const subtransactionsQuery = useMemo(
    () =>
      needsSubtransactionQuery
        ? q('transactions').filter({ parent_id: transaction?.id }).select('*')
        : null,
    [needsSubtransactionQuery, transaction?.id],
  );

  const { transactions: queriedSubtransactions = [] } = useTransactions({
    query: subtransactionsQuery,
  });

  const subtransactions =
    transaction?.subtransactions || queriedSubtransactions;

  const accounts = useAccounts();
  const payeesById = usePayeesById();
  const payee = payeesById[transaction?.payee || ''];

  return useMemo(() => {
    if (subtransactions.length === 0) {
      return getPrettyPayee({
        t,
        transaction,
        payee,
        transferAccount: accounts.find(
          a => a.id === payeesById[transaction?.payee || '']?.transfer_acct,
        ),
      });
    }

    const { counts, mostCommonPayeeTransaction } =
      subtransactions?.reduce(
        ({ counts, ...result }, sub) => {
          if (sub.payee) {
            counts[sub.payee] = (counts[sub.payee] || 0) + 1;
            if (counts[sub.payee] > result.maxCount) {
              return {
                counts,
                maxCount: counts[sub.payee],
                mostCommonPayeeTransaction: sub,
              };
            }
          }
          return { counts, ...result };
        },
        { counts: {}, maxCount: 0, mostCommonPayeeTransaction: null } as Counts,
      ) || {};

    if (!mostCommonPayeeTransaction) {
      return t('Split (no payee)');
    }

    const mostCommonPayee = payeesById[mostCommonPayeeTransaction.payee || ''];

    if (!mostCommonPayee) {
      return t('Split (no payee)');
    }

    const numDistinctPayees = Object.keys(counts).length;

    return getPrettyPayee({
      t,
      transaction: mostCommonPayeeTransaction,
      payee: mostCommonPayee,
      transferAccount: accounts.find(
        a =>
          a.id ===
          payeesById[mostCommonPayeeTransaction.payee || '']?.transfer_acct,
      ),
      numHiddenPayees: numDistinctPayees - 1,
    });
  }, [subtransactions, payeesById, accounts, transaction, payee, t]);
}

type GetPrettyPayeeProps = {
  t: ReturnType<typeof useTranslation>['t'];
  transaction?: TransactionEntity | undefined;
  payee?: PayeeEntity | undefined;
  transferAccount?: AccountEntity | undefined;
  numHiddenPayees?: number | undefined;
};

function getPrettyPayee({
  t,
  transaction,
  payee,
  transferAccount,
  numHiddenPayees = 0,
}: GetPrettyPayeeProps) {
  if (!transaction) {
    return '';
  }

  const formatPayeeName = (payeeName: string) =>
    numHiddenPayees > 0
      ? `${payeeName} ${t('(+{{numHiddenPayees}} more)', {
          numHiddenPayees,
        })}`
      : payeeName;

  const { payee: payeeId } = transaction;

  if (transferAccount) {
    return formatPayeeName(transferAccount.name);
  } else if (payee) {
    return formatPayeeName(payee.name);
  } else if (payeeId && payeeId.startsWith('new:')) {
    return formatPayeeName(payeeId.slice('new:'.length));
  }

  return '';
}
