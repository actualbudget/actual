import { GoCardlessAmount, GoCardlessBalance } from './gocardless';

export type BankSyncBalance = GoCardlessBalance;
export type BankSyncAmount = GoCardlessAmount;
export type BankSyncTransaction = {
  sortOrder: number;
  date: string;
  payeeName: string;
  notes: string;
  transactedDate?: string;
  transactionAmount: {
    amount: string;
    currency: string;
  };
  transactionId: string;
  postedDate?: string;
  booked: boolean;
  remittanceInformationUnstructuredArrayString?: string;
  remittanceInformationStructuredArrayString?: string;
};

export type BankSyncHolding = {
  holdingId: string;
  symbol: string;
  description: string;
  created: string;
  currency: string;
  shares: string;
  purchasedUnitPrice: string;
  purchasedTotalPrice: string;
  currentUnitPrice: string;
  currentTotalPrice: string;
};

export type BankSyncResponse = {
  transactions: {
    all: BankSyncTransaction[];
    booked: BankSyncTransaction[];
    pending: BankSyncTransaction[];
  };
  holdings?: BankSyncHolding[];
  balances: BankSyncBalance[];
  startingBalance: number;
  error_type: string;
  error_code: string;
};

export type BankSyncProviders = 'goCardless' | 'simpleFin' | 'pluggyai';
