import Fallback from './integration-bank';
import type { IBank } from './bank.interface';

export default {
  ...Fallback,

  institutionIds: ['REVOLUT_REVOLT21'],

  normalizeTransaction(transaction, booked) {
    const editedTrans = { ...transaction };

    const infoArray = transaction.remittanceInformationUnstructuredArray ?? [];

    if (infoArray[0]?.startsWith('Bizum payment from: ')) {
      editedTrans.payeeName = infoArray[0].replace('Bizum payment from: ', '');
      editedTrans.remittanceInformationUnstructured = infoArray[1];
    }

    if (infoArray[0]?.startsWith('Bizum payment to: ')) {
      editedTrans.remittanceInformationUnstructured = infoArray[1];
    }

    return Fallback.normalizeTransaction(transaction, booked, editedTrans);
  },
} satisfies IBank;
