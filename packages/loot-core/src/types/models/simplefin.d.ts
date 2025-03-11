import { AccountEntity } from './account';
import { BankSyncResponse } from './bank-sync';

export type SimpleFinApiAccounts = {
  errors: string[] | { [accountId: string]: string };
  accounts: SimpleFinApiAccount[];
  sferrors: string[];
  hasError: boolean;
};

export type SimpleFinApiError = {
  error_type: 'ACCOUNT_NEEDS_ATTENTION' | 'ACCOUNT_MISSING';
  error_code: 'ACCOUNT_NEEDS_ATTENTION' | 'ACCOUNT_MISSING';
  reason: string;
};

export type SimpleFinApiAccount = {
  org: SimpleFinApiOrganization;
  id: string;
  name: string;
  currency: string;
  balance: string;
  'available-balance': string;
  'balance-date': number;
  transactions: SimpleFinApiTransaction[];
  holdings: SimpleFinApiHolding[];
};

export type SimpleFinApiOrganization = {
  id: string;
  name: string;
  domain: string;
};

export type SimpleFinApiTransaction = {
  id: string;
  posted: number;
  amount: string;
  description: string;
  payee: string;
  memo: string;
  transacted_at?: number;
  pending?: boolean;
  extra?: any;
};

export type SimpleFinApiHolding = {
  id: string;
  created: number;
  currency: string;
  cost_basis: string;
  description: string;
  market_value: string;
  purchase_price: string;
  shares: string;
  symbol: string;
};

export interface SimpleFinBatchSyncResponse {
  [accountId: AccountEntity['account_id']]: BankSyncResponse;
}

export type SyncServerSimpleFinAccount = {
  account_id: string;
  institution?: string;
  orgDomain?: string;
  orgId?: string;
  name: string;
};
