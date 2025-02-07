import Fallback from './integration-bank.js';

import { amountToInteger } from '../utils.js';
import { formatPayeeName } from '../../util/payee-name.js';

/** @type {import('./bank.interface.js').IBank} */
export default {
  ...Fallback,

  institutionIds: ['AMERICAN_EXPRESS_AESUDEF1'],

  normalizeAccount(account) {
    return {
      ...Fallback.normalizeAccount(account),
      // The `iban` field for these American Express cards is actually a masked
      // version of the PAN.  No IBAN is provided.
      mask: account.iban.slice(-5),
      iban: null,
      name: [account.details, `(${account.iban.slice(-5)})`].join(' '),
      official_name: account.details,
    };
  },

  normalizeTransaction(transaction, _booked) {
    return {
      ...transaction,
      payeeName: formatPayeeName(transaction),
      date: transaction.bookingDate,
    };
  },

  /**
   *  For AMERICAN_EXPRESS_AESUDEF1 we don't know what balance was
   *  after each transaction so we have to calculate it by getting
   *  current balance from the account and subtract all the transactions
   *
   *  As a current balance we use the non-standard `information` balance type
   *  which is the only one provided for American Express.
   */
  calculateStartingBalance(sortedTransactions = [], balances = []) {
    const currentBalance = balances.find(
      (balance) => 'information' === balance.balanceType.toString(),
    );

    return sortedTransactions.reduce((total, trans) => {
      return total - amountToInteger(trans.transactionAmount.amount);
    }, amountToInteger(currentBalance.balanceAmount.amount));
  },
};
