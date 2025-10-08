import Fallback from './integration-bank.js';

/** @type {import('./bank.interface.js').IBank} */
export default {
  ...Fallback,

  institutionIds: ['BANKINTER_BKBKESMM'],

  normalizeTransaction(transaction, booked) {
    const editedTrans = { ...transaction };

    editedTrans.remittanceInformationUnstructured =
      transaction.remittanceInformationUnstructured
        .replaceAll(/\/Txt\/(\w\|)?/gi, '')
        .replaceAll(';', ' ');

    editedTrans.debtorName = transaction.debtorName?.replaceAll(';', ' ');
    editedTrans.creditorName =
      transaction.creditorName?.replaceAll(';', ' ') ??
      editedTrans.remittanceInformationUnstructured;

    return Fallback.normalizeTransaction(transaction, booked, editedTrans);
  },
};
