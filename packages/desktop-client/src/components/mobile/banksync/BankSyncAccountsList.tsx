import { Trans } from 'react-i18next';

import { Text } from '@actual-app/components/text';
import { theme } from '@actual-app/components/theme';
import { View } from '@actual-app/components/view';
import type { AccountEntity } from '@actual-app/core/types/models';

import type {
  GroupedBankSyncAccounts,
  SyncProviders,
} from '#components/banksync/bankSyncUtils';
import { getGroupedBankSyncEntries } from '#components/banksync/bankSyncUtils';
import { MOBILE_NAV_HEIGHT } from '#components/mobile/MobileNavTabs';

import { BankSyncAccountsListItem } from './BankSyncAccountsListItem';

type BankSyncAccountsListProps = {
  groupedAccounts: GroupedBankSyncAccounts;
  syncSourceReadable: Record<SyncProviders, string>;
  onAction: (account: AccountEntity, action: 'link' | 'edit') => void;
};

export function BankSyncAccountsList({
  groupedAccounts,
  syncSourceReadable,
  onAction,
}: BankSyncAccountsListProps) {
  const groupedAccountEntries = getGroupedBankSyncEntries(groupedAccounts);
  const allAccounts = groupedAccountEntries.flatMap(([, accounts]) => accounts);

  if (allAccounts.length === 0) {
    return (
      <View
        style={{
          flex: 1,
          alignItems: 'center',
          justifyContent: 'center',
          paddingHorizontal: 20,
        }}
      >
        <Text
          style={{
            fontSize: 16,
            color: theme.pageTextSubdued,
            textAlign: 'center',
          }}
        >
          <Trans>No accounts found matching your search.</Trans>
        </Text>
      </View>
    );
  }

  const shouldShowProviderHeaders = groupedAccountEntries.length > 1;

  return (
    <div
      style={{ flex: 1, overflow: 'auto', paddingBottom: MOBILE_NAV_HEIGHT }}
    >
      {groupedAccountEntries.map(([provider, accounts]) => (
        <div key={provider}>
          {shouldShowProviderHeaders && (
            <div
              style={{
                backgroundColor: theme.mobilePageBackground,
                padding: '12px 16px',
                borderBottom: `1px solid ${theme.tableBorder}`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                minHeight: 40,
              }}
            >
              <Text
                style={{
                  fontSize: 14,
                  fontWeight: 600,
                  color: theme.pageTextLight,
                  textTransform: 'uppercase',
                  letterSpacing: 0.5,
                }}
              >
                {syncSourceReadable[provider]}
              </Text>
            </div>
          )}
          {accounts.map(account => (
            <BankSyncAccountsListItem
              key={account.id}
              account={account}
              onAction={onAction}
              isLinked={!!account.account_sync_source}
            />
          ))}
        </div>
      ))}
    </div>
  );
}
