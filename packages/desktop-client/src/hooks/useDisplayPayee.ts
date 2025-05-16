import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';

import { q } from 'loot-core/shared/query';
import {
  type AccountEntity,
  type PayeeEntity,
  type TransactionEntity,
} from 'loot-core/types/models';

import { useAccounts } from './useAccounts';
import { usePayee } from './usePayee';
import { usePayees } from './usePayees';
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
  const subtransactionsQuery = useMemo(
    () => q('transactions').filter({ parent_id: transaction?.id }).select('*'),
    [transaction?.id],
  );
  const { transactions: subtransactions = [] } = useTransactions({
    query: subtransactionsQuery,
  });

  const accounts = useAccounts();
  const payees = usePayees();
  const payee = usePayee(transaction?.payee || '');

  return useMemo(() => {
    if (subtransactions.length === 0) {
      return getPrettyPayee({
        t,
        transaction,
        payee,
        transferAccount: accounts.find(
          a =>
            a.id ===
            payees.find(p => p.id === transaction?.payee)?.transfer_acct,
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

    const mostCommonPayee = payees.find(
      p => p.id === mostCommonPayeeTransaction.payee,
    );

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
          payees.find(p => p.id === mostCommonPayeeTransaction.payee)
            ?.transfer_acct,
      ),
      numHiddenPayees: numDistinctPayees - 1,
    });
  }, [subtransactions, payees, accounts, transaction, payee, t]);
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
