import Fallback from './integration-bank';
import type { IBank } from './bank.interface';

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
} satisfies IBank;
