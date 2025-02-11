import { extractPayeeNameFromRemittanceInfo } from './util/extract-payeeName-from-remittanceInfo.js';
import Fallback from './integration-bank.js';

/** @type {import('./bank.interface.js').IBank} */
export default {
  ...Fallback,

  institutionIds: ['CBC_CREGBEBB'],

  /**
   * For negative amounts, the only payee information we have is returned in
   * remittanceInformationUnstructured.
   */
  normalizeTransaction(transaction, booked) {
    const editedTrans = { ...transaction };

    if (Number(transaction.transactionAmount.amount) > 0) {
      editedTrans.payeeName =
        transaction.debtorName || transaction.remittanceInformationUnstructured;
    } else {
      editedTrans.payeeName =
        transaction.creditorName ||
        extractPayeeNameFromRemittanceInfo(
          transaction.remittanceInformationUnstructured,
          ['Paiement', 'Domiciliation', 'Transfert', 'Ordre permanent'],
        );
    }

    return Fallback.normalizeTransaction(transaction, booked, editedTrans);
  },
};
