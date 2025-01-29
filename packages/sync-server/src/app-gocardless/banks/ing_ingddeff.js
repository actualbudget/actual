import Fallback from './integration-bank.js';

import { amountToInteger } from '../utils.js';

/** @type {import('./bank.interface.js').IBank} */
export default {
  ...Fallback,

  institutionIds: ['ING_INGDDEFF'],

  normalizeTransaction(transaction, booked) {
    const editedTrans = { ...transaction };

    const remittanceInformationMatch = /remittanceinformation:(.*)$/.exec(
      transaction.remittanceInformationUnstructured,
    );

    editedTrans.remittanceInformationUnstructured = remittanceInformationMatch
      ? remittanceInformationMatch[1]
      : transaction.remittanceInformationUnstructured;

    return Fallback.normalizeTransaction(transaction, booked, editedTrans);
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
      balance => 'interimBooked' === balance.balanceType,
    );

    return sortedTransactions.reduce((total, trans) => {
      return total - amountToInteger(trans.transactionAmount.amount);
    }, amountToInteger(currentBalance.balanceAmount.amount));
  },
};
