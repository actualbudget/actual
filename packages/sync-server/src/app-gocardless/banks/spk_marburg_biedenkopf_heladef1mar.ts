// @ts-strict-ignore
import type { IBank } from './bank.interface';
import Fallback from './integration-bank';

export default {
  ...Fallback,

  institutionIds: ['SPK_MARBURG_BIEDENKOPF_HELADEF1MAR'],

  normalizeTransaction(transaction, booked) {
    const editedTrans = { ...transaction };

    let remittanceInformationUnstructured;

    if (transaction.remittanceInformationUnstructured) {
      remittanceInformationUnstructured =
        transaction.remittanceInformationUnstructured;
    } else if (transaction.remittanceInformationStructured) {
      remittanceInformationUnstructured =
        transaction.remittanceInformationStructured;
    } else if (transaction.remittanceInformationStructuredArray?.length > 0) {
      remittanceInformationUnstructured =
        transaction.remittanceInformationStructuredArray?.join(' ');
    }

    editedTrans.remittanceInformationUnstructured =
      remittanceInformationUnstructured;

    return Fallback.normalizeTransaction(transaction, booked, editedTrans);
  },
} satisfies IBank;
