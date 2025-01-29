import Fallback from './integration-bank.js';

/** @type {import('./bank.interface.js').IBank} */
export default {
  ...Fallback,

  institutionIds: ['BELFIUS_GKCCBEBB'],

  // The problem is that we have transaction with duplicated transaction ids.
  // This is not expected and the nordigen api has a work-around for some backs
  // They will set an internalTransactionId which is unique
  normalizeTransaction(transaction, booked) {
    transaction.transactionId = transaction.internalTransactionId;

    return Fallback.normalizeTransaction(transaction, booked);
  },
};
