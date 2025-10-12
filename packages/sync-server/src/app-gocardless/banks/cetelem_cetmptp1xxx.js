import Fallback from './integration-bank.js';

/** @type {import('./bank.interface.js').IBank} */
export default {
  ...Fallback,

  institutionIds: ['CETELEM_CETMPTP1XXX'],

  /**
   * Sign of transaction amount needs to be flipped for Cetelem Black credit cards
   */
  normalizeTransaction(transaction, booked) {
    const editedTrans = { ...transaction };

    transaction.transactionAmount = {
      // Flip transaction amount sign
      amount: (-parseFloat(transaction.transactionAmount.amount)).toString(),
      currency: transaction.transactionAmount.currency,
    };

    return Fallback.normalizeTransaction(transaction, booked, editedTrans);
  },
};
