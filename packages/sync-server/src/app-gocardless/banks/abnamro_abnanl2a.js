import Fallback from './integration-bank.js';

import { amountToInteger } from '../utils.js';
import { formatPayeeName } from '../../util/payee-name.js';

/** @type {import('./bank.interface.js').IBank} */
export default {
  ...Fallback,

  institutionIds: ['ABNAMRO_ABNANL2A'],

  normalizeTransaction(transaction, _booked) {
    // There is no remittanceInformationUnstructured, so we'll make it
    transaction.remittanceInformationUnstructured =
      transaction.remittanceInformationUnstructuredArray.join(', ');

    // Remove clutter to extract the payee from remittanceInformationUnstructured ...
    // ... when not otherwise provided.
    const payeeName = transaction.remittanceInformationUnstructuredArray
      .map((el) => el.match(/^(?:.*\*)?(.+),PAS\d+$/))
      .find((match) => match)?.[1];
    transaction.debtorName = transaction.debtorName || payeeName;
    transaction.creditorName = transaction.creditorName || payeeName;

    return {
      ...transaction,
      payeeName: formatPayeeName(transaction),
      date: transaction.valueDateTime.slice(0, 10),
    };
  },

  sortTransactions(transactions = []) {
    return transactions.sort(
      (a, b) => +new Date(b.valueDateTime) - +new Date(a.valueDateTime),
    );
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
