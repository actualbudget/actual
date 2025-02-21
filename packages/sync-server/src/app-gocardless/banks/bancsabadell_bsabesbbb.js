import Fallback from './integration-bank.js';

/** @type {import('./bank.interface.js').IBank} */
export default {
  ...Fallback,

  institutionIds: ['BANCSABADELL_BSABESBB'],

  // Sabadell transactions don't get the creditorName/debtorName properly
  normalizeTransaction(transaction, booked) {
    const editedTrans = { ...transaction };

    const amount = transaction.transactionAmount.amount;

    // The amount is negative for outgoing transactions, positive for incoming transactions.
    const isCreditorPayee = Number.parseFloat(amount) < 0;

    const payeeName = transaction.remittanceInformationUnstructuredArray
      .join(' ')
      .trim();

    // The payee name is the creditor name for outgoing transactions and the debtor name for incoming transactions.
    const creditorName = isCreditorPayee ? payeeName : null;
    const debtorName = isCreditorPayee ? null : payeeName;

    editedTrans.creditorName = creditorName;
    editedTrans.debtorName = debtorName;

    return Fallback.normalizeTransaction(transaction, booked, editedTrans);
  },
};
