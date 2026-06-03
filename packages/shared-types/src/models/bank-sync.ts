export const SYNC_PROVIDERS = [
  'goCardless',
  'simpleFin',
  'pluggyai',
  'enableBanking',
] as const;

export type BuiltInBankSyncProvider = (typeof SYNC_PROVIDERS)[number];
export type BankSyncProviders = BuiltInBankSyncProvider | string;
