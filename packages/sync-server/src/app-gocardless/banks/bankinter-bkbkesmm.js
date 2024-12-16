import Fallback from './integration-bank.js';

import { printIban } from '../utils.js';
import { formatPayeeName } from '../../util/payee-name.js';

/** @type {import('./bank.interface.js').IBank} */
export default {
  ...Fallback,

  institutionIds: ['BANKINTER_BKBKESMM'],

  accessValidForDays: 90,

  normalizeAccount(account) {
    return {
      account_id: account.id,
      institution: account.institution,
      mask: account.iban.slice(-4),
      iban: account.iban,
      name: [account.name, printIban(account)].join(' '),
      official_name: account.product,
      type: 'checking',
    };
  },

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
