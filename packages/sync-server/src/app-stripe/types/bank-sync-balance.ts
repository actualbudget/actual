import type { BankSyncBalanceAmount } from './bank-sync-balance-amount';

export type BankSyncBalance = {
  balanceAmount: BankSyncBalanceAmount;
  balanceType: string;
};
