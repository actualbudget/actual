import Fallback from './integration-bank.js';

import { formatPayeeName } from '../../util/payee-name.js';

/** @type {import('./bank.interface.js').IBank} */
export default {
  ...Fallback,

  institutionIds: ['SPK_WORMS_ALZEY_RIED_MALADE51WOR'],

  normalizeTransaction(transaction, _booked) {
    const date = transaction.bookingDate || transaction.valueDate;
    if (!date) {
      return null;
    }

    transaction.remittanceInformationUnstructured =
      transaction.remittanceInformationUnstructured ??
      transaction.remittanceInformationStructured ??
      transaction.remittanceInformationStructuredArray?.join(' ');
    return {
      ...transaction,
      payeeName: formatPayeeName(transaction),
      date: transaction.bookingDate || transaction.valueDate,
    };
  },
};
