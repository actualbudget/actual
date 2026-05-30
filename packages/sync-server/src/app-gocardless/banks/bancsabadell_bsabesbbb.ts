import Fallback from './integration-bank';
import type { IBank } from './bank.interface';

export default {
  ...Fallback,

  institutionIds: ['BANCSABADELL_BSABESBB'],

  // Sabadell transactions don't get the creditorName/debtorName properly
  normalizeTransaction(transaction, booked) {
    const editedTrans = { ...transaction };

    const amount = transaction.transactionAmount.amount;

    // The amount is negative for outgoing transactions, positive for incoming transactions.
    const isCreditorPayee = Number.parseFloat(amount) < 0;

    const payeeName = (transaction.remittanceInformationUnstructuredArray ?? [])
      .join(' ')
      .trim();

    // The payee name is the creditor name for outgoing transactions and the debtor name for incoming transactions.
    editedTrans.creditorName = isCreditorPayee ? payeeName : undefined;
    editedTrans.debtorName = isCreditorPayee ? undefined : payeeName;

    return Fallback.normalizeTransaction(transaction, booked, editedTrans);
  },
} satisfies IBank;
