import Fallback from './integration-bank.js';

/** @type {import('./bank.interface.js').IBank} */
export default {
  ...Fallback,

  institutionIds: [
    'SPARNORD_SPNODK22',
    'LAGERNES_BANK_LAPNDKK1',
    'ANDELSKASSEN_FALLESKASSEN_FAELDKK1',
  ],

  /**
   * Banks on the BEC backend only give information regarding the transaction in additionalInformation
   */
  normalizeTransaction(transaction, booked) {
    const editedTrans = { ...transaction };

    editedTrans.remittanceInformationUnstructured =
      transaction.additionalInformation;

    return Fallback.normalizeTransaction(transaction, booked, editedTrans);
  },
};
