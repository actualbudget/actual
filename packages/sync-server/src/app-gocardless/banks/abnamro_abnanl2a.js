import { getCurrency } from 'loot-core/shared/currencies';
import { amountToInteger } from 'loot-core/shared/util';

import Fallback from './integration-bank';

function hasBalanceAfterTransaction(transaction) {
  return (
    transaction.balanceAfterTransaction?.balanceAmount?.amount != null &&
    transaction.balanceAfterTransaction?.balanceAmount?.currency != null
  );
}

/** @type {import('./bank.interface').IBank} */
export default {
  ...Fallback,

  institutionIds: ['ABNAMRO_ABNANL2A'],

  normalizeTransaction(transaction, booked) {
    const editedTrans = { ...transaction };

    // There is no remittanceInformationUnstructured, so we'll make it
    editedTrans.remittanceInformationUnstructured =
      transaction.remittanceInformationUnstructuredArray?.join(', ');

    // Remove clutter to extract the payee from remittanceInformationUnstructured ...
    // ... when not otherwise provided.
    const payeeName = transaction.remittanceInformationUnstructuredArray
      ?.map(el => el.match(/^(?:.*\*)?(.+),PAS\d+$/))
      .find(match => match)?.[1];

    editedTrans.debtorName = transaction.debtorName || payeeName;
    editedTrans.creditorName = transaction.creditorName || payeeName;

    editedTrans.date = transaction.valueDateTime?.slice(0, 10);

    return Fallback.normalizeTransaction(transaction, booked, editedTrans);
  },

  sortTransactions(transactions = []) {
    return transactions.sort((a, b) => {
      const leftDate =
        a.valueDateTime || a.valueDate || a.bookingDateTime || a.bookingDate;
      const rightDate =
        b.valueDateTime || b.valueDate || b.bookingDateTime || b.bookingDate;
      return +new Date(rightDate || 0) - +new Date(leftDate || 0);
    });
  },

  calculateStartingBalance(sortedTransactions = [], balances = []) {
    if (
      sortedTransactions.length &&
      hasBalanceAfterTransaction(sortedTransactions[0])
    ) {
      const oldestTransaction =
        sortedTransactions[sortedTransactions.length - 1];

      if (!hasBalanceAfterTransaction(oldestTransaction)) {
        return 0;
      }

      const oldestKnownBalance = amountToInteger(
        parseFloat(
          oldestTransaction.balanceAfterTransaction.balanceAmount.amount,
        ),
        getCurrency(
          oldestTransaction.balanceAfterTransaction.balanceAmount.currency ||
            '',
        ).decimalPlaces,
      );
      const oldestTransactionAmount = amountToInteger(
        parseFloat(oldestTransaction.transactionAmount.amount),
        getCurrency(oldestTransaction.transactionAmount.currency || '')
          .decimalPlaces,
      );

      return oldestKnownBalance - oldestTransactionAmount;
    }

    const balance = balances.find(
      balanceEntry => 'interimBooked' === balanceEntry.balanceType,
    )?.balanceAmount;

    return amountToInteger(
      parseFloat(balance?.amount || '0'),
      getCurrency(balance?.currency || '').decimalPlaces,
    );
  },
};
