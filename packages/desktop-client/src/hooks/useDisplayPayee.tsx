import { createContext, type ReactNode, useContext, useMemo } from 'react';
import { useTranslation } from 'react-i18next';

import {
  type AccountEntity,
  type PayeeEntity,
  type TransactionEntity,
} from 'loot-core/types/models';

import { useAccounts } from './useAccounts';
import { usePayeesById } from './usePayees';

type DisplayPayeeContextValue = {
  displayPayees: Record<TransactionEntity['id'], string>;
};

const DisplayPayeeContext = createContext<DisplayPayeeContextValue | null>(
  null,
);

type DisplayPayeeContextProviderProps = {
  transactions: readonly TransactionEntity[];
  children: ReactNode;
};

export function DisplayPayeeContextProvider({
  transactions,
  children,
}: DisplayPayeeContextProviderProps) {
  const { t } = useTranslation();

  const accounts = useAccounts();
  const payeesById = usePayeesById();

  const displayPayees = useMemo(() => {
    // Build a map of parent_id -> child transactions
    const subtransactionsByParent = new Map<
      TransactionEntity['id'],
      TransactionEntity[]
    >();

    for (const transaction of transactions) {
      if (transaction.parent_id) {
        const existing = subtransactionsByParent.get(transaction.parent_id);
        if (existing) {
          existing.push(transaction);
        } else {
          subtransactionsByParent.set(transaction.parent_id, [transaction]);
        }
      }
    }

    return transactions.reduce(
      (acc, transaction) => {
        const subtransactions =
          subtransactionsByParent.get(transaction.id) || [];

        if (subtransactions.length === 0) {
          acc[transaction.id] = getPrettyPayee({
            t,
            transaction,
            payee: payeesById[transaction?.payee || ''],
            transferAccount: accounts.find(
              a => a.id === payeesById[transaction?.payee || '']?.transfer_acct,
            ),
          });

          return acc;
        }

        const { counts, mostCommonPayeeTransaction } =
          subtransactions.reduce(
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
            {
              counts: {},
              maxCount: 0,
              mostCommonPayeeTransaction: null,
            } as Counts,
          ) || {};

        if (!mostCommonPayeeTransaction) {
          acc[transaction.id] = t('Split (no payee)');
          return acc;
        }

        const mostCommonPayee =
          payeesById[mostCommonPayeeTransaction.payee || ''];

        if (!mostCommonPayee) {
          acc[transaction.id] = t('Split (no payee)');
          return acc;
        }

        const numDistinctPayees = Object.keys(counts).length;

        acc[transaction.id] = getPrettyPayee({
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

        return acc;
      },
      {} as Record<TransactionEntity['id'], string>,
    );
  }, [transactions, payeesById, accounts, t]);

  return (
    <DisplayPayeeContext.Provider value={{ displayPayees }}>
      {children}
    </DisplayPayeeContext.Provider>
  );
}

type Counts = {
  counts: Record<PayeeEntity['id'], number>;
  maxCount: number;
  mostCommonPayeeTransaction: TransactionEntity | null;
};

type UseDisplayPayeeProps = {
  transaction?: TransactionEntity | undefined;
};

export function useDisplayPayee({ transaction }: UseDisplayPayeeProps) {
  const context = useContext(DisplayPayeeContext);
  if (!context) {
    throw new Error(
      'useDisplayPayee must be used within a DisplayPayeeContextProvider.',
    );
  }
  const { displayPayees } = context;

  return transaction ? displayPayees[transaction.id] || '' : '';
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
