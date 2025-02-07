import Fallback from './integration-bank.js';

import { amountToInteger } from '../utils.js';
import { formatPayeeName } from '../../util/payee-name.js';

/** @type {import('./bank.interface.js').IBank} */
export default {
  ...Fallback,

  institutionIds: [
    'SEB_KORT_AB_NO_SKHSFI21',
    'SEB_KORT_AB_SE_SKHSFI21',
    'SEB_CARD_ESSESESS',
  ],

  /**
   * Sign of transaction amount needs to be flipped for SEB credit cards
   */
  normalizeTransaction(transaction, _booked) {
    // Creditor name is stored in additionInformation for SEB
    transaction.creditorName = transaction.additionalInformation;
    transaction.transactionAmount = {
      // Flip transaction amount sign
      amount: (-parseFloat(transaction.transactionAmount.amount)).toString(),
      currency: transaction.transactionAmount.currency,
    };

    return {
      ...transaction,
      payeeName: formatPayeeName(transaction),
      date: transaction.valueDate,
    };
  },

  /**
   *  For SEB_KORT_AB_NO_SKHSFI21 and SEB_KORT_AB_SE_SKHSFI21 we don't know what balance was
   *  after each transaction so we have to calculate it by getting
   *  current balance from the account and subtract all the transactions
   *
   *  As a current balance we use `expected` and `nonInvoiced` balance types because it
   *  corresponds to the current running balance, whereas `interimAvailable`
   *  holds the remaining credit limit.
   */
  calculateStartingBalance(sortedTransactions = [], balances = []) {
    const currentBalance = balances.find(
      (balance) => 'expected' === balance.balanceType,
    );

    const nonInvoiced = balances.find(
      (balance) => 'nonInvoiced' === balance.balanceType,
    );

    return sortedTransactions.reduce((total, trans) => {
      return total - amountToInteger(trans.transactionAmount.amount);
    }, -amountToInteger(currentBalance.balanceAmount.amount) + amountToInteger(nonInvoiced.balanceAmount.amount));
  },
};
