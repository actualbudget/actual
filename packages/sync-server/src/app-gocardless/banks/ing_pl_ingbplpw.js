import Fallback from './integration-bank.js';

import { amountToInteger } from '../utils.js';
import { formatPayeeName } from '../../util/payee-name.js';

/** @type {import('./bank.interface.js').IBank} */
export default {
  ...Fallback,

  institutionIds: ['ING_PL_INGBPLPW'],

  normalizeTransaction(transaction, _booked) {
    return {
      ...transaction,
      payeeName: formatPayeeName(transaction),
      date: transaction.valueDate ?? transaction.bookingDate,
    };
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
      );
      const oldestTransactionAmount = amountToInteger(
        oldestTransaction.transactionAmount.amount,
      );

      return oldestKnownBalance - oldestTransactionAmount;
    } else {
      return amountToInteger(
        balances.find((balance) => 'interimBooked' === balance.balanceType)
          .balanceAmount.amount,
      );
    }
  },
};
