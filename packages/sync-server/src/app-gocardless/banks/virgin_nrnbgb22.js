import Fallback from './integration-bank.js';

/** @type {import('./bank.interface.js').IBank} */
export default {
  ...Fallback,

  institutionIds: ['VIRGIN_NRNBGB22'],

  normalizeTransaction(transaction, booked) {
    const transferPrefixes = ['MOB', 'FPS'];
    const methodRegex = /^(Card|WLT)\s\d+/;

    const parts = transaction.remittanceInformationUnstructured.split(', ');

    if (transferPrefixes.includes(parts[0])) {
      // Transfer remittance information begins with either "MOB" or "FPS"
      // the second field contains the payee and the third contains the
      // reference

      transaction.creditorName = parts[1];
      transaction.debtorName = parts[1];
      transaction.remittanceInformationUnstructured = parts[2];
    } else if (parts[0].match(methodRegex)) {
      // The payee is prefixed with the payment method, eg "Card 11, {payee}"

      transaction.creditorName = parts[1];
      transaction.debtorName = parts[1];
    } else {
      // Simple payee name

      transaction.creditorName = transaction.remittanceInformationUnstructured;
      transaction.debtorName = transaction.remittanceInformationUnstructured;
    }

    return Fallback.normalizeTransaction(transaction, booked);
  },
};
