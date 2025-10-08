import Fallback from './integration-bank.js';

/** @type {import('./bank.interface.js').IBank} */
export default {
  ...Fallback,

  institutionIds: [
    'ABANCA_CAGLESMM',
    'ABANCA_CAGLPTPL',
    'ABANCA_CORP_CAGLPTPL',
  ],

  // Abanca transactions doesn't get the creditorName/debtorName properly
  normalizeTransaction(transaction, booked) {
    const editedTrans = { ...transaction };

    editedTrans.creditorName = transaction.remittanceInformationStructured;
    editedTrans.debtorName = transaction.remittanceInformationStructured;

    return Fallback.normalizeTransaction(transaction, booked, editedTrans);
  },
};
