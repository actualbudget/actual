import { IBank } from './bank.interface.js';
import Fallback from './integration-bank.js';
import { extractPayeeNameFromRemittanceInfo } from './util/extract-payeeName-from-remittanceInfo.js';

// eslint-disable-next-line import/no-default-export
export default {
  ...Fallback,

  institutionIds: ['KBC_KREDBEBB'],

  /**
   * For negative amounts, the only payee information we have is returned in
   * remittanceInformationUnstructured.
   */
  normalizeTransaction(transaction, booked) {
    const editedTrans = { ...transaction };

    if (Number(transaction.transactionAmount.amount) > 0) {
      editedTrans.payeeName =
        transaction.debtorName ||
        transaction.remittanceInformationUnstructured ||
        'undefined';
    } else {
      editedTrans.payeeName =
        transaction.creditorName ||
        extractPayeeNameFromRemittanceInfo(
          transaction.remittanceInformationUnstructured,
          ['Betaling met', 'Domiciliëring', 'Overschrijving'],
        );
    }

    return Fallback.normalizeTransaction(transaction, booked, editedTrans);
  },
} satisfies IBank;
