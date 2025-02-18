import Fallback from './integration-bank.js';

/** @type {import('./bank.interface.js').IBank} */
export default {
  ...Fallback,

  institutionIds: ['SPK_MARBURG_BIEDENKOPF_HELADEF1MAR'],

  normalizeTransaction(transaction, booked) {
    const editedTrans = { ...transaction };

    let remittanceInformationUnstructured;

    if (transaction.remittanceInformationUnstructured) {
      remittanceInformationUnstructured =
        transaction.remittanceInformationUnstructured;
    } else if (transaction.remittanceInformationStructured) {
      remittanceInformationUnstructured =
        transaction.remittanceInformationStructured;
    } else if (transaction.remittanceInformationStructuredArray?.length > 0) {
      remittanceInformationUnstructured =
        transaction.remittanceInformationStructuredArray?.join(' ');
    }

    editedTrans.remittanceInformationUnstructured =
      remittanceInformationUnstructured;

    return Fallback.normalizeTransaction(transaction, booked, editedTrans);
  },
};
