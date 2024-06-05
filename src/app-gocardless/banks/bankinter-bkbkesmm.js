import Fallback from './integration-bank.js';

import { printIban } from '../utils.js';

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
    return {
      ...transaction,
      debtorName: transaction.debtorName?.replaceAll(';', ' '),
      creditorName: transaction.creditorName?.replaceAll(';', ' '),
      remittanceInformationUnstructured:
        transaction.remittanceInformationUnstructured
          .replaceAll(/\/Txt\/(\w\|)?/gi, '')
          .replaceAll(';', ' '),
      date: transaction.bookingDate || transaction.valueDate,
    };
  },
};
