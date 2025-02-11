import Fallback from './integration-bank.js';

import { formatPayeeName } from '../../util/payee-name.js';

/** @type {import('./bank.interface.js').IBank} */
export default {
  ...Fallback,

  institutionIds: ['BELFIUS_GKCCBEBB'],

  // The problem is that we have transaction with duplicated transaction ids.
  // This is not expected and the nordigen api has a work-around for some backs
  // They will set an internalTransactionId which is unique
  normalizeTransaction(transaction, _booked) {
    return {
      ...transaction,
      transactionId: transaction.internalTransactionId,
      payeeName: formatPayeeName(transaction),
      date: transaction.bookingDate || transaction.valueDate,
    };
  },
};
