import Fallback from './integration-bank.js';

import { formatPayeeName } from '../../util/payee-name.js';

/** @type {import('./bank.interface.js').IBank} */
export default {
  ...Fallback,

  institutionIds: ['BANKINTER_BKBKESMM'],

  accessValidForDays: 180,

  normalizeTransaction(transaction, _booked) {
    transaction.remittanceInformationUnstructured =
      transaction.remittanceInformationUnstructured
        .replaceAll(/\/Txt\/(\w\|)?/gi, '')
        .replaceAll(';', ' ');

    transaction.debtorName = transaction.debtorName?.replaceAll(';', ' ');
    transaction.creditorName =
      transaction.creditorName?.replaceAll(';', ' ') ??
      transaction.remittanceInformationUnstructured;

    return {
      ...transaction,
      payeeName: formatPayeeName(transaction),
      date: transaction.bookingDate || transaction.valueDate,
    };
  },
};
