export type AccountEntity = {
  id: string;
  name: string;
  offbudget: boolean;
  closed: boolean;
  sort_order: number;
  tombstone: boolean;
} & (_SyncFields<true> | _SyncFields<false>);

type _SyncFields<T> = {
  account_id: T extends true ? string : null;
  bank: T extends true ? string : null;
  mask: T extends true ? string : null; // end of bank account number
  official_name: T extends true ? string : null;
  balance_current: T extends true ? number : null;
  balance_available: T extends true ? number : null;
  balance_limit: T extends true ? number : null;
  account_sync_source: T extends true ? AccountSyncSource : null;
};

export type AccountSyncSource = 'simpleFin' | 'goCardless';
