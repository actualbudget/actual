import Fallback from './integration-bank.js';
import { formatPayeeName } from '../../util/payee-name.js';

/** @type {import('./bank.interface.js').IBank} */
export default {
  ...Fallback,

  institutionIds: ['COMMERZBANK_COBADEFF'],

  normalizeTransaction(transaction, _booked) {
    // remittanceInformationUnstructured is limited to 140 chars thus ...
    // ... missing information form remittanceInformationUnstructuredArray ...
    // ... so we recreate it.
    transaction.remittanceInformationUnstructured =
      transaction.remittanceInformationUnstructuredArray.join(' ');

    // The limitations of remittanceInformationUnstructuredArray ...
    // ... can result in split keywords. We fix these. Other ...
    // ... splits will need to be fixed by user with rules.
    const keywords = [
      'End-to-End-Ref.:',
      'Mandatsref:',
      'Gläubiger-ID:',
      'SEPA-BASISLASTSCHRIFT',
      'Kartenzahlung',
      'Dauerauftrag',
    ];
    keywords.forEach((keyword) => {
      transaction.remittanceInformationUnstructured =
        transaction.remittanceInformationUnstructured.replace(
          // There can be spaces in keywords
          RegExp(keyword.split('').join('\\s*'), 'gi'),
          ', ' + keyword + ' ',
        );
    });

    // Clean up remittanceInformation, deduplicate payee (removing slashes ...
    // ... that are added to the remittanceInformation field), and ...
    // ... remove clutter like "End-to-End-Ref.: NOTPROVIDED"
    const payee = transaction.creditorName || transaction.debtorName || '';
    transaction.remittanceInformationUnstructured =
      transaction.remittanceInformationUnstructured
        .replace(/\s*(,)?\s+/g, '$1 ')
        .replace(RegExp(payee.split(' ').join('(/*| )'), 'gi'), ' ')
        .replace(', End-to-End-Ref.: NOTPROVIDED', '')
        .trim();

    return {
      ...transaction,
      payeeName: formatPayeeName(transaction),
      date: transaction.bookingDate,
    };
  },
};
