import Fallback from './integration-bank.js';

/** @type {import('./bank.interface.js').IBank} */
export default {
  ...Fallback,

  institutionIds: ['DIREKT_HELADEF1822'],

  normalizeTransaction(transaction, booked) {
    transaction.remittanceInformationUnstructured =
      transaction.remittanceInformationUnstructured ??
      transaction.remittanceInformationStructured;

    return Fallback.normalizeTransaction(transaction, booked);
  },
};
