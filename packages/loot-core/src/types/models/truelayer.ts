import { type AccountEntity } from './account';
import { type BankSyncResponse } from './bank-sync';

export type TrueLayerAccount = {
  account_id: string;
  account_type: string;
  display_name: string;
  currency: string;
  account_number?: {
    iban?: string;
    number?: string;
    sort_code?: string;
  };
  provider?: {
    provider_id: string;
    display_name: string;
  };
};

export type TrueLayerBalance = {
  current: number;
  available?: number;
  currency: string;
  update_timestamp: string;
};

export type TrueLayerTransaction = {
  transaction_id: string;
  timestamp: string;
  description: string;
  amount: number;
  currency: string;
  transaction_type: string;
  transaction_category: string;
  merchant_name?: string;
  running_balance?: {
    amount: number;
    currency: string;
  };
};

export type TrueLayerBatchSyncResponse = {
  [accountId: NonNullable<AccountEntity['account_id']>]: BankSyncResponse;
};

export type SyncServerTrueLayerAccount = {
  balance: number;
  account_id: string;
  institution?: string;
  name: string;
  type?: string;
  official_name?: string;
  mask?: string;
};

export type TrueLayerAuthSession = {
  authId: string;
  link: string;
};
