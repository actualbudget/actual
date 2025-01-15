import Fallback from './integration-bank.js';

import { amountToInteger } from '../utils.js';
import { formatPayeeName } from '../../util/payee-name.js';

/** @type {import('./bank.interface.js').IBank} */
export default {
  ...Fallback,

  institutionIds: ['NBG_ETHNGRAAXXX'],

  /**
   * Fixes for the pending transactions:
   * - Corrects amount to negative (nbg erroneously omits the minus sign in pending transactions)
   * - Removes prefix 'ΑΓΟΡΑ' from remittance information to align with the booked transaction (necessary for fuzzy matching to work)
   */
  normalizeTransaction(transaction, _booked) {
    if (
      !transaction.transactionId &&
      transaction.remittanceInformationUnstructured.startsWith('ΑΓΟΡΑ ')
    ) {
      transaction = {
        ...transaction,
        transactionAmount: {
          amount: '-' + transaction.transactionAmount.amount,
          currency: transaction.transactionAmount.currency,
        },
        remittanceInformationUnstructured:
          transaction.remittanceInformationUnstructured.substring(6),
      };
    }

    return {
      ...transaction,
      payeeName: formatPayeeName(transaction),
      date: transaction.bookingDate || transaction.valueDate,
    };
  },

  /**
   *  For NBG_ETHNGRAAXXX we don't know what balance was
   *  after each transaction so we have to calculate it by getting
   *  current balance from the account and subtract all the transactions
   *
   *  As a current balance we use `interimBooked` balance type because
   *  it includes transaction placed during current day
   */
  calculateStartingBalance(sortedTransactions = [], balances = []) {
    const currentBalance = balances.find(
      (balance) => 'interimAvailable' === balance.balanceType,
    );

    return sortedTransactions.reduce((total, trans) => {
      return total - amountToInteger(trans.transactionAmount.amount);
    }, amountToInteger(currentBalance.balanceAmount.amount));
  },
};
