import type { BankSyncProviders } from './bank-sync';

export type BankInfo = {
  id: string;
  name: string | null;
  icon: string | null;
  website: string | null;
};

export type AccountEntity = {
  id: string;
  name: string;
  offbudget: 0 | 1;
  closed: 0 | 1;
  sort_order: number;
  last_reconciled: string | null;
  tombstone: 0 | 1;

  // Sync fields
  account_id: string | null;
  bank: BankInfo | null;
  mask: string | null; // end of bank account number
  official_name: string | null;
  balance_current: number | null;
  balance_available: number | null;
  balance_limit: number | null;
  account_sync_source: AccountSyncSource | null;
  last_sync: string | null;
  bank_sync_status: BankSyncStatus | null;
  website: string | null;
  icon: string | null;
};

export type AccountSyncSource = BankSyncProviders;

export type BankSyncStatus =
  | 'ok'
  | 'pending'
  | 'sync-requested'
  | 'failed'
  | 'reauth-required'
  | 'attention-required';
