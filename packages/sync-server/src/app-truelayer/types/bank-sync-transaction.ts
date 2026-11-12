import type { BankSyncAmount } from './bank-sync-amount';

export type BankSyncTransaction = {
  transactionId: string;
  date: string;
  bookingDate: string;
  transactionAmount: BankSyncAmount;
  payeeName: string;
  notes?: string;
  remittanceInformationUnstructured?: string;
  booked: boolean;
};
