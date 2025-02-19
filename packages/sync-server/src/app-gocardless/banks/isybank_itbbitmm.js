import Fallback from './integration-bank.js';

/** @type {import('./bank.interface.js').IBank} */
export default {
  ...Fallback,

  institutionIds: ['ISYBANK_ITBBITMM'],

  // It has been reported that valueDate is more accurate than booking date
  // when it is provided
  normalizeTransaction(transaction, booked) {
    const editedTrans = { ...transaction };

    editedTrans.date = transaction.valueDate ?? transaction.bookingDate;

    return Fallback.normalizeTransaction(transaction, booked, editedTrans);
  },
};
