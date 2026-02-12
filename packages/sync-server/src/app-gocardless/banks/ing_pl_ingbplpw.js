import { getCurrency } from 'loot-core/shared/currencies';
import { amountToInteger } from 'loot-core/shared/util';

import Fallback from './integration-bank';

/** @type {import('./bank.interface').IBank} */
export default {
  ...Fallback,

  institutionIds: ['ING_PL_INGBPLPW'],

  normalizeTransaction(transaction, booked) {
    const editedTrans = { ...transaction };

    editedTrans.date = transaction.valueDate;

    return Fallback.normalizeTransaction(transaction, booked, editedTrans);
  },

  sortTransactions(transactions = []) {
    return transactions.sort((a, b) => {
      return (
        Number(b.transactionId.substr(2)) - Number(a.transactionId.substr(2))
      );
    });
  },

  calculateStartingBalance(sortedTransactions = [], balances = []) {
    if (sortedTransactions.length) {
      const oldestTransaction =
        sortedTransactions[sortedTransactions.length - 1];
      const oldestKnownBalance = amountToInteger(
        oldestTransaction.balanceAfterTransaction.balanceAmount.amount,
        getCurrency(
          oldestTransaction.balanceAfterTransaction.balanceAmount.currency || '',
        ).decimalPlaces,
      );
      const oldestTransactionAmount = amountToInteger(
        oldestTransaction.transactionAmount.amount,
        getCurrency(oldestTransaction.transactionAmount.currency || '')
          .decimalPlaces,
      );

      return oldestKnownBalance - oldestTransactionAmount;
    } else {
      const balance = balances.find(
        balance => 'interimBooked' === balance.balanceType,
      ).balanceAmount;
      return amountToInteger(
        balance.amount,
        getCurrency(balance.currency || '').decimalPlaces,
      );
    }
  },
};
