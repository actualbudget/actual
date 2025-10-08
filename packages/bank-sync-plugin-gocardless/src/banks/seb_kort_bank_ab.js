import { amountToInteger } from '../utils.js';

import Fallback from './integration-bank.js';

/** @type {import('./bank.interface.js').IBank} */
export default {
  ...Fallback,

  institutionIds: [
    'SEB_KORT_AB_NO_SKHSFI21',
    'SEB_KORT_AB_SE_SKHSFI21',
    'SEB_CARD_ESSESESS',
    'NORDIC_CHOICE_CLUB_NO_SKHSFI21',
    'NORDIC_CHOICE_CLUB_SE_SKHSFI21',
    'EUROCARD_SE_SKHSFI21',
    'EUROCARD_DK_SKHSFI21',
    'EUROCARD_FI_SKHSFI21',
    'EUROCARD_NO_SKHSFI21',
    'GLOBECARD_DK_SKHSFI21',
    'GLOBECARD_NO_SKHSFI21',
    'OPEL_MASTERCARD_SKHSFI21',
    'SAAB_MASTERCARD_SKHSFI21',
    'SAS_MASTERCARD_NO_SKHSFI21',
    'SAS_MASTERCARD_SE_SKHSFI21',
    'SAS_MASTERCARD_FI_SKHSFI21',
    'SAS_MASTERCARD_DK_SKHSFI21',
    'SJ_PRIO_MASTERCARD_SKHSFI21',
    'CIRCLE_K_MASTERCARD_NO_SKHSFI21',
    'CIRCLE_K_MASTERCARD_SE_SKHSFI21',
    'CIRCLE_K_MASTERCARD_DK_SKHSFI21',
    'WALLET_SKHSFI21',
    'INGO_MASTERCARD_SKHSFI21',
    'SCANDIC_SKHSFI21',
  ],

  /**
   * Sign of transaction amount needs to be flipped for SEB credit cards
   */
  normalizeTransaction(transaction, booked) {
    const editedTrans = { ...transaction };

    // Creditor name is stored in additionInformation for SEB
    editedTrans.creditorName = transaction.additionalInformation;
    transaction.transactionAmount = {
      // Flip transaction amount sign
      amount: (-parseFloat(transaction.transactionAmount.amount)).toString(),
      currency: transaction.transactionAmount.currency,
    };

    return Fallback.normalizeTransaction(transaction, booked, editedTrans);
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
      balance => 'expected' === balance.balanceType,
    );

    const nonInvoiced = balances.find(
      balance => 'nonInvoiced' === balance.balanceType,
    );

    return sortedTransactions.reduce(
      (total, trans) => {
        return total - amountToInteger(trans.transactionAmount.amount);
      },
      -amountToInteger(currentBalance.balanceAmount.amount) +
        amountToInteger(nonInvoiced.balanceAmount.amount),
    );
  },
};
