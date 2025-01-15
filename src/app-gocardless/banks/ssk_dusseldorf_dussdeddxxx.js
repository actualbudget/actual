import Fallback from './integration-bank.js';

/** @type {import('./bank.interface.js').IBank} */
export default {
  ...Fallback,

  institutionIds: ['SSK_DUSSELDORF_DUSSDEDDXXX'],

  normalizeTransaction(transaction, _booked) {
    // Prioritize unstructured information, falling back to structured formats
    let remittanceInformationUnstructured =
      transaction.remittanceInformationUnstructured ??
      transaction.remittanceInformationStructured ??
      transaction.remittanceInformationStructuredArray?.join(' ');

    if (transaction.additionalInformation)
      remittanceInformationUnstructured =
        (remittanceInformationUnstructured ?? '') +
        ' ' +
        transaction.additionalInformation;

    const usefulCreditorName =
      transaction.ultimateCreditor ||
      transaction.creditorName ||
      transaction.debtorName;

    transaction.creditorName = usefulCreditorName;
    transaction.remittanceInformationUnstructured =
      remittanceInformationUnstructured;

    return Fallback.normalizeTransaction(transaction, _booked);
  },
};
