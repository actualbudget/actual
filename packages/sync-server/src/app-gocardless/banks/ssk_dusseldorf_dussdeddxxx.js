import Fallback from './integration-bank.js';

/** @type {import('./bank.interface.js').IBank} */
export default {
  ...Fallback,

  institutionIds: ['SSK_DUSSELDORF_DUSSDEDDXXX'],

  normalizeTransaction(transaction, _booked) {
    // If the transaction is not booked yet by the bank, don't import it.
    // Reason being that the transaction doesn't have the information yet
    // to make the payee and notes field be of any use. It's filled with
    // a placeholder text and wouldn't be corrected on the next sync.
    if (!_booked) {
      console.debug(
        'Skipping unbooked transaction:',
        transaction.transactionId,
      );
      return null;
    }

    // Prioritize unstructured information, falling back to structured formats
    let remittanceInformationUnstructured =
      transaction.remittanceInformationUnstructured ??
      transaction.remittanceInformationStructured ??
      transaction.remittanceInformationStructuredArray?.join(' ');

    if (transaction.additionalInformation)
      remittanceInformationUnstructured = [
        remittanceInformationUnstructured,
        transaction.additionalInformation,
      ]
        .filter(Boolean)
        .join(' ');

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
