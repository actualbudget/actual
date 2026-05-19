// @ts-strict-ignore
import type { IBank } from './bank.interface';
import Fallback from './integration-bank';

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
} satisfies IBank;
