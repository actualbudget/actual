import Fallback from './integration-bank.js';

/** @type {import('./bank.interface.js').IBank} */
export default {
  ...Fallback,

  institutionIds: ['REVOLUT_REVOLT21'],

  normalizeTransaction(transaction, booked) {
    const editedTrans = { ...transaction };

    if (
      transaction.remittanceInformationUnstructuredArray[0].startsWith(
        'Bizum payment from: ',
      )
    ) {
      editedTrans.payeeName =
        transaction.remittanceInformationUnstructuredArray[0].replace(
          'Bizum payment from: ',
          '',
        );
      editedTrans.remittanceInformationUnstructured =
        transaction.remittanceInformationUnstructuredArray[1];
    }

    if (
      transaction.remittanceInformationUnstructuredArray[0].startsWith(
        'Bizum payment to: ',
      )
    ) {
      editedTrans.remittanceInformationUnstructured =
        transaction.remittanceInformationUnstructuredArray[1];
    }

    return Fallback.normalizeTransaction(transaction, booked, editedTrans);
  },
};
