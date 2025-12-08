import Fallback from './integration-bank';

/** @type {import('./bank.interface').IBank} */
export default {
  ...Fallback,

  institutionIds: ['SPK_WORMS_ALZEY_RIED_MALADE51WOR'],

  normalizeTransaction(transaction, booked) {
    const editedTrans = { ...transaction };

    editedTrans.remittanceInformationUnstructured =
      transaction.remittanceInformationUnstructured ??
      transaction.remittanceInformationStructured ??
      transaction.remittanceInformationStructuredArray?.join(' ');

    return Fallback.normalizeTransaction(transaction, booked, editedTrans);
  },
};
