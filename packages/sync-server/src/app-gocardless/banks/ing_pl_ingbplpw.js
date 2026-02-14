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
      const currentBalanceDecimals = getCurrency(
        oldestTransaction.balanceAfterTransaction.balanceAmount.currency || '',
      ).decimalPlaces;
      const oldestKnownBalance = amountToInteger(
        Number(
          oldestTransaction.balanceAfterTransaction.balanceAmount.amount || 0,
        ),
        currentBalanceDecimals,
      );
      const oldestTransactionAmount = amountToInteger(
        Number(oldestTransaction.transactionAmount.amount || 0),
        currentBalanceDecimals,
      );

      return oldestKnownBalance - oldestTransactionAmount;
    } else {
      const interimBalance = balances.find(
        balance => 'interimBooked' === balance.balanceType,
      );
      const balance = interimBalance?.balanceAmount;
      const currentBalanceDecimals = getCurrency(
        balance?.currency || '',
      ).decimalPlaces;
      return amountToInteger(
        Number(balance?.amount || 0),
        currentBalanceDecimals,
      );
    }
  },
};
