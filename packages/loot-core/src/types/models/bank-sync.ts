import type {
  GoCardlessAmount,
  GoCardlessBalance,
  GoCardlessTransaction,
} from './gocardless';

export type BankSyncBalance = GoCardlessBalance;
export type BankSyncAmount = GoCardlessAmount;
export type BankSyncTransaction = GoCardlessTransaction;

export type BankSyncResponse = {
  transactions: {
    all: BankSyncTransaction[];
    booked: BankSyncTransaction[];
    pending: BankSyncTransaction[];
  };
  balances: BankSyncBalance[];
  startingBalance: number;
  error_type: string;
  error_code: string;
};

export { SYNC_PROVIDERS } from '@actual-app/shared-types/models/bank-sync';
export type {
  BankSyncProviders,
  BuiltInBankSyncProvider,
} from '@actual-app/shared-types/models/bank-sync';
