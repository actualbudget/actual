import { amountToInteger } from '../utils.js';

import Fallback from './integration-bank.js';

/** @type {import('./bank.interface.js').IBank} */
export default {
  ...Fallback,

  institutionIds: ['MBANK_RETAIL_BREXPLPW'],

  /**
   * When requesting transaction details for MBANK_RETAIL_BREXPLPW
   * using gocardless API, it seems that bookingDate and valueDate are swapped.
   * valueDate will always come before bookingDate, so as a simple fix,
   * I have overwritten integration-bank.normalizeTransaction() here,
   * swapped dates back (by giving valueDate higher priority) and
   * called parent method with edited transaction as argument
   */
  normalizeTransaction(transaction, booked) {
    const editedTrans = { ...transaction };

    const date =
      transaction.valueDate ||
      transaction.valueDateTime ||
      transaction.bookingDate ||
      transaction.bookingDateTime;

    editedTrans.date = date;

    return Fallback.normalizeTransaction(transaction, booked, editedTrans);
  },

  sortTransactions(transactions = []) {
    return transactions.sort(
      (a, b) => Number(b.transactionId) - Number(a.transactionId),
    );
  },

  /**
   *  For MBANK_RETAIL_BREXPLPW we don't know what balance was
   *  after each transaction so we have to calculate it by getting
   *  current balance from the account and subtract all the transactions
   *
   *  As a current balance we use `interimBooked` balance type because
   *  it includes transaction placed during current day
   */
  calculateStartingBalance(sortedTransactions = [], balances = []) {
    const currentBalance = balances.find(
      balance => 'interimBooked' === balance.balanceType,
    );

    return sortedTransactions.reduce((total, trans) => {
      return total - amountToInteger(trans.transactionAmount.amount);
    }, amountToInteger(currentBalance.balanceAmount.amount));
  },
};
