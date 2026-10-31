import { useCallback } from 'react';

import type { IntegerAmount } from '@actual-app/core/shared/util';
import type {
  AccountEntity,
  PayeeEntity,
  TransactionEntity,
} from '@actual-app/core/types/models';

import { pushModal } from '#modals/modalsSlice';
import { useDispatch } from '#redux';

import { useAccountCurrencies } from './useAccountCurrencies';
import { useMultiCurrency } from './useMultiCurrency';
import { usePayees } from './usePayees';

type TransferAmountRequest = {
  id: TransactionEntity['id'];
  accountId: AccountEntity['id'];
  transferAccountId: AccountEntity['id'];
  amount: IntegerAmount;
  date: string;
};

// Transactions that start a transfer to an account in another currency,
// for which the user says how much arrived (or left) on the other side.
// Only new transfers and transfers now going to another currency: once a
// transfer exists, each side keeps its own amount, also when it moves to
// another account in the same currency.
export function findTransfersNeedingAmount({
  transactions,
  previousById,
  getTransferAccountId,
  getAccountCurrency,
}: {
  transactions: readonly TransactionEntity[];
  previousById: ReadonlyMap<
    TransactionEntity['id'],
    Pick<TransactionEntity, 'payee'>
  >;
  getTransferAccountId: (
    payeeId: PayeeEntity['id'] | null | undefined,
  ) => AccountEntity['id'] | null;
  getAccountCurrency: (accountId: AccountEntity['id']) => string | null;
}): TransferAmountRequest[] {
  return transactions.flatMap(transaction => {
    const transferAccountId = getTransferAccountId(transaction.payee);
    const previous = previousById.get(transaction.id);
    if (
      transaction.is_parent ||
      transaction.amount === 0 ||
      !transferAccountId ||
      transferAccountId === transaction.account ||
      (previous && previous.payee === transaction.payee)
    ) {
      return [];
    }

    const currency = getAccountCurrency(transaction.account);
    const transferCurrency = getAccountCurrency(transferAccountId);
    if (!currency || !transferCurrency || currency === transferCurrency) {
      return [];
    }

    const previousTransferAccountId =
      previous && getTransferAccountId(previous.payee);
    if (
      previousTransferAccountId &&
      getAccountCurrency(previousTransferAccountId) === transferCurrency
    ) {
      return [];
    }

    return [
      {
        id: transaction.id,
        accountId: transaction.account,
        transferAccountId,
        amount: transaction.amount,
        date: transaction.date,
      },
    ];
  });
}

// Asks for the other side of each new transfer between currencies before
// saving. Resolves with the entered amounts by transaction id, to pass to
// the server as `transferAmounts`. A dialog closed without an amount, or
// gone without being closed (e.g. when moving to another page), leaves
// that transfer to the exchange rate of the day, so nothing the user typed
// is lost.
export function usePromptTransferAmounts() {
  const dispatch = useDispatch();
  const { isEnabled } = useMultiCurrency();
  const currencyByAccount = useAccountCurrencies();
  const { data: payees = [] } = usePayees();

  return useCallback(
    async (
      transactions: readonly TransactionEntity[],
      previousTransactions: readonly TransactionEntity[] = [],
    ): Promise<Record<TransactionEntity['id'], IntegerAmount>> => {
      // Without multiple currencies transfers mirror their amount
      if (!isEnabled) {
        return {};
      }

      const requests = findTransfersNeedingAmount({
        transactions,
        previousById: new Map(
          previousTransactions.map(transaction => [
            transaction.id,
            transaction,
          ]),
        ),
        getTransferAccountId: payeeId =>
          payees.find(payee => payee.id === payeeId)?.transfer_acct ?? null,
        getAccountCurrency: accountId =>
          currencyByAccount.get(accountId) ?? null,
      });

      const amounts: Record<TransactionEntity['id'], IntegerAmount> = {};
      for (const request of requests) {
        // Only the first answer counts: the dialog also closes, and goes
        // away, after an amount was confirmed
        const amount = await new Promise<IntegerAmount | null>(resolve => {
          // Opens in a task of its own: the transaction table saves new
          // rows while rendering, and the previous dialog must be gone
          setTimeout(() => {
            dispatch(
              pushModal({
                modal: {
                  name: 'transfer-amount',
                  options: {
                    accountId: request.accountId,
                    transferAccountId: request.transferAccountId,
                    amount: request.amount,
                    date: request.date,
                    onConfirm: resolve,
                    onClose: () => resolve(null),
                  },
                },
              }),
            );
          }, 0);
        });
        if (amount !== null) {
          amounts[request.id] = amount;
        }
      }
      return amounts;
    },
    [currencyByAccount, dispatch, isEnabled, payees],
  );
}
