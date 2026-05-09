import type {
  AccountEntity,
  BankSyncProviders,
} from '@actual-app/core/types/models';

export type SyncProviders = BankSyncProviders | 'unlinked';
export type GroupedBankSyncAccounts = Partial<
  Record<SyncProviders, AccountEntity[]>
>;

export const BUILT_IN_BANK_SYNC_PROVIDERS = [
  'goCardless',
  'simpleFin',
  'pluggyai',
] as const satisfies BankSyncProviders[];

const SYNC_PROVIDER_KEYS = [
  ...BUILT_IN_BANK_SYNC_PROVIDERS,
  'enableBanking',
  'unlinked',
] as const satisfies readonly SyncProviders[];

const syncProviderKeysSet = new Set<string>(SYNC_PROVIDER_KEYS);

function isSyncProvider(value: string): value is SyncProviders {
  return syncProviderKeysSet.has(value);
}

export function getSyncSourceReadable(
  translate: (key: string) => string,
): Record<SyncProviders, string> {
  return {
    goCardless: 'GoCardless',
    simpleFin: 'SimpleFIN',
    pluggyai: 'Pluggy.ai',
    enableBanking: 'Enable Banking',
    unlinked: translate('Unlinked'),
  };
}

export function groupBankSyncAccounts(
  accounts: AccountEntity[],
): GroupedBankSyncAccounts {
  const groupedAccounts: GroupedBankSyncAccounts = {};

  for (const account of accounts) {
    if (account.closed) {
      continue;
    }

    const syncSource = account.account_sync_source ?? 'unlinked';
    const existingAccounts = groupedAccounts[syncSource];

    if (existingAccounts) {
      existingAccounts.push(account);
    } else {
      groupedAccounts[syncSource] = [account];
    }
  }

  const sortedEntries = Object.entries(groupedAccounts)
    .filter(
      (entry): entry is [SyncProviders, AccountEntity[]] =>
        isSyncProvider(entry[0]) && entry[1] != null,
    )
    .sort(([keyA], [keyB]) => {
      if (keyA === 'unlinked') return 1;
      if (keyB === 'unlinked') return -1;
      return keyA.localeCompare(keyB);
    });

  const sortedAccounts: GroupedBankSyncAccounts = {};
  for (const [syncSource, providerAccounts] of sortedEntries) {
    sortedAccounts[syncSource] = providerAccounts;
  }

  return sortedAccounts;
}

export function getGroupedBankSyncEntries(
  groupedAccounts: GroupedBankSyncAccounts,
): Array<[SyncProviders, AccountEntity[]]> {
  return Object.entries(groupedAccounts).filter(
    (entry): entry is [SyncProviders, AccountEntity[]] =>
      isSyncProvider(entry[0]) && entry[1] != null,
  );
}
