import Fallback from './integration-bank.js';

import { formatPayeeName } from '../../util/payee-name.js';

/** @type {import('./bank.interface.js').IBank} */
export default {
  ...Fallback,

  institutionIds: [
    'ABANCA_CAGLESMM',
    'ABANCA_CAGLPTPL',
    'ABANCA_CORP_CAGLPTPL',
  ],

  // Abanca transactions doesn't get the creditorName/debtorName properly
  normalizeTransaction(transaction, _booked) {
    transaction.creditorName = transaction.remittanceInformationStructured;
    transaction.debtorName = transaction.remittanceInformationStructured;

    return {
      ...transaction,
      payeeName: formatPayeeName(transaction),
      date: transaction.bookingDate || transaction.valueDate,
    };
  },
};
