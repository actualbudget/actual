import type {
  AccountEntity,
  BankSyncProviders,
} from '@actual-app/core/types/models';
import { format as formatDate } from 'date-fns';
import type { Locale } from 'date-fns';
import type { TFunction } from 'i18next';

import { minutesToParts } from './bankSyncInterval';
import type { BuiltInBankSyncProviderState } from './useBuiltInBankSyncProviders';

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
  'akahu',
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
    akahu: 'Akahu',
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

export function formatLastSyncDateTime(
  lastSync: AccountEntity['last_sync'],
  locale: Locale,
): string {
  return formatDate(
    new Date(parseInt(lastSync ?? '0', 10)),
    'MMM d, yyyy, HH:mm:ss',
    { locale },
  );
}

export function getProviderStatusText(
  provider: Pick<
    BuiltInBankSyncProviderState,
    'isConfigured' | 'credentialSource' | 'region'
  >,
  t: TFunction,
): string {
  if (!provider.isConfigured) {
    return provider.region;
  }
  if (provider.credentialSource === 'global') {
    return t('Configured for all budgets');
  }
  if (provider.credentialSource != null) {
    return t('Configured for this budget only');
  }
  return t('Configured');
}

export function getAutomaticSyncMenuText(
  interval: string | undefined,
  t: TFunction,
): string {
  const minutes = parseInt(interval || '0', 10);
  if (!Number.isFinite(minutes) || minutes <= 0) {
    return t('Automatic syncing: never');
  }

  const { value: count, unit } = minutesToParts(minutes);
  if (unit === 'minute') {
    return t('Automatic syncing: every {{count}} minutes', {
      count,
      defaultValue_one: 'Automatic syncing: every minute',
      defaultValue_other: 'Automatic syncing: every {{count}} minutes',
    });
  }
  if (unit === 'hour') {
    return t('Automatic syncing: every {{count}} hours', {
      count,
      defaultValue_one: 'Automatic syncing: every hour',
      defaultValue_other: 'Automatic syncing: every {{count}} hours',
    });
  }
  if (unit === 'day') {
    return t('Automatic syncing: every {{count}} days', {
      count,
      defaultValue_one: 'Automatic syncing: every day',
      defaultValue_other: 'Automatic syncing: every {{count}} days',
    });
  }
  return t('Automatic syncing: every {{count}} weeks', {
    count,
    defaultValue_one: 'Automatic syncing: every week',
    defaultValue_other: 'Automatic syncing: every {{count}} weeks',
  });
}
