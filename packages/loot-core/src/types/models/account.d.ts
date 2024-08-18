export type AccountEntity = {
  id: string;
  name: string;
  offbudget: 0 | 1;
  closed: 0 | 1;
  sort_order: number;
  tombstone: 0 | 1;
  account_group_id?: string;
  display_name?: string;
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
