import Fallback from './integration-bank';

/** @type {import('./bank.interface').IBank} */
export default {
  ...Fallback,

  institutionIds: ['DIREKT_HELADEF1822'],

  normalizeTransaction(transaction, booked) {
    const editedTrans = { ...transaction };

    editedTrans.remittanceInformationUnstructured =
      transaction.remittanceInformationUnstructured ??
      transaction.remittanceInformationStructured;

    return Fallback.normalizeTransaction(transaction, booked, editedTrans);
  },
};
