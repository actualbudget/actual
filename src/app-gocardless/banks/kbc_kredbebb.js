import Fallback from './integration-bank.js';

/**
 * The remittance information contains creditorName, payments method, dates, etc.
 * This function makes sure to only extract the creditorName based on the different indicators like "Betaling met".
 * f.e. Proxy Poel BE Gent Betaling met Apple Pay via Maestro 23-08-2024 om 14.03 uur XXXX XXXX XXXX XXXX -> Proxy Poel BE Gent
 */
function extractPayeeName(remittanceInformationUnstructured) {
  const indices = [
    remittanceInformationUnstructured.lastIndexOf(' Betaling met'),
    remittanceInformationUnstructured.lastIndexOf(' Domiciliëring'),
    remittanceInformationUnstructured.lastIndexOf(' Overschrijving'),
  ];

  const indexForRemoval = Math.max(...indices);

  return indexForRemoval > -1
    ? remittanceInformationUnstructured.substring(0, indexForRemoval)
    : remittanceInformationUnstructured;
}

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
          transaction.remittanceInformationUnstructured,
        date: transaction.bookingDate || transaction.valueDate,
      };
    }

    return {
      ...transaction,
      payeeName:
        transaction.creditorName ||
        extractPayeeName(transaction.remittanceInformationUnstructured),
      date: transaction.bookingDate || transaction.valueDate,
    };
  },
};
