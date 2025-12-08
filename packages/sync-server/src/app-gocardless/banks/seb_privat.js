import { amountToInteger } from '../utils';

import Fallback from './integration-bank';

/** @type {import('./bank.interface').IBank} */
export default {
  ...Fallback,

  institutionIds: ['SEB_ESSESESS_PRIVATE'],

  normalizeTransaction(transaction, booked) {
    const editedTrans = { ...transaction };

    // Creditor name is stored in additionInformation for SEB
    editedTrans.creditorName = transaction.additionalInformation;

    return Fallback.normalizeTransaction(transaction, booked, editedTrans);
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
