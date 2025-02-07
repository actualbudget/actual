import Fallback from './integration-bank.js';

import { amountToInteger } from '../utils.js';
import { formatPayeeName } from '../../util/payee-name.js';

/** @type {import('./bank.interface.js').IBank} */
export default {
  ...Fallback,

  institutionIds: ['ING_INGDDEFF'],

  normalizeTransaction(transaction, _booked) {
    const remittanceInformationMatch = /remittanceinformation:(.*)$/.exec(
      transaction.remittanceInformationUnstructured,
    );

    transaction.remittanceInformationUnstructured = remittanceInformationMatch
      ? remittanceInformationMatch[1]
      : transaction.remittanceInformationUnstructured;

    return {
      ...transaction,
      payeeName: formatPayeeName(transaction),
      date: transaction.bookingDate || transaction.valueDate,
    };
  },

  sortTransactions(transactions = []) {
    return transactions.sort((a, b) => {
      const diff =
        +new Date(b.valueDate || b.bookingDate) -
        +new Date(a.valueDate || a.bookingDate);
      if (diff) return diff;
      const idA = parseInt(a.transactionId);
      const idB = parseInt(b.transactionId);
      if (!isNaN(idA) && !isNaN(idB)) return idB - idA;
      return 0;
    });
  },

  calculateStartingBalance(sortedTransactions = [], balances = []) {
    const currentBalance = balances.find(
      (balance) => 'interimBooked' === balance.balanceType,
    );

    return sortedTransactions.reduce((total, trans) => {
      return total - amountToInteger(trans.transactionAmount.amount);
    }, amountToInteger(currentBalance.balanceAmount.amount));
  },
};
