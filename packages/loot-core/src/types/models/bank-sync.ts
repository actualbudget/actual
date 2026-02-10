import type {
  GoCardlessAmount,
  GoCardlessBalance,
  GoCardlessTransaction,
} from './gocardless';
import {
  type SophtronAmount,
  type SophtronBalance,
  type SophtronTransaction,
} from './sophtron';

export type BankSyncBalance = GoCardlessBalance | SophtronBalance;
export type BankSyncAmount = GoCardlessAmount | SophtronAmount;
export type BankSyncTransaction = GoCardlessTransaction | SophtronTransaction;

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

export type BankSyncProviders =
  | 'goCardless'
  | 'simpleFin'
  | 'pluggyai'
  | 'sophtron';
