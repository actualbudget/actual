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
  startingBalance: string; // Decimal major units.
  /** Currency of startingBalance, or null when unknown or mixed. */
  startingBalanceCurrency?: string | null;
  error_type: string;
  error_code: string;
};

export const SYNC_PROVIDERS = [
  'goCardless',
  'simpleFin',
  'pluggyai',
  'enableBanking',
  'akahu',
] as const;

export type BankSyncProviders = (typeof SYNC_PROVIDERS)[number];
export type BankSyncCredentialSource = 'per-budget-file' | 'global';
export type BankSyncProviderStatus = {
  configured?: boolean;
  source?: BankSyncCredentialSource;
  error?: string;
};
