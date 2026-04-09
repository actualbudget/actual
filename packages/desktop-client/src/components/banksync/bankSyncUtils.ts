import type { AccountEntity, BankSyncProviders } from 'loot-core/types/models';

export type SyncProviders = BankSyncProviders | 'unlinked';

export const BUILT_IN_BANK_SYNC_PROVIDERS = [
  'goCardless',
  'simpleFin',
  'pluggyai',
] as const satisfies BankSyncProviders[];

export function getSyncSourceReadable(
  translate: (key: string) => string,
): Record<SyncProviders, string> {
  return {
    goCardless: 'GoCardless',
    simpleFin: 'SimpleFIN',
    pluggyai: 'Pluggy.ai',
    unlinked: translate('Unlinked'),
  };
}

export function groupBankSyncAccounts(accounts: AccountEntity[]) {
  const unsorted = accounts
    .filter(account => !account.closed)
    .reduce(
      (acc, account) => {
        const syncSource = account.account_sync_source ?? 'unlinked';
        acc[syncSource] = acc[syncSource] || [];
        acc[syncSource].push(account);
        return acc;
      },
      {} as Record<SyncProviders, AccountEntity[]>,
    );

  const sortedKeys = Object.keys(unsorted).sort((keyA, keyB) => {
    if (keyA === 'unlinked') return 1;
    if (keyB === 'unlinked') return -1;
    return keyA.localeCompare(keyB);
  });

  return sortedKeys.reduce(
    (sorted, key) => {
      sorted[key as SyncProviders] = unsorted[key as SyncProviders];
      return sorted;
    },
    {} as Record<SyncProviders, AccountEntity[]>,
  );
}
