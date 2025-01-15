import { extractPayeeNameFromRemittanceInfo } from './util/extract-payeeName-from-remittanceInfo.js';
import Fallback from './integration-bank.js';

/** @type {import('./bank.interface.js').IBank} */
export default {
  ...Fallback,

  institutionIds: ['KBC_KREDBEBB'],

  /**
   * For negative amounts, the only payee information we have is returned in
   * remittanceInformationUnstructured.
   */
  normalizeTransaction(transaction, _booked) {
    if (Number(transaction.transactionAmount.amount) > 0) {
      return {
        ...transaction,
        payeeName:
          transaction.debtorName ||
          transaction.remittanceInformationUnstructured ||
          'undefined',
        date: transaction.bookingDate || transaction.valueDate,
      };
    }

    return {
      ...transaction,
      payeeName:
        transaction.creditorName ||
        extractPayeeNameFromRemittanceInfo(
          transaction.remittanceInformationUnstructured,
          ['Betaling met', 'Domiciliëring', 'Overschrijving'],
        ),
      date: transaction.bookingDate || transaction.valueDate,
    };
  },
};
