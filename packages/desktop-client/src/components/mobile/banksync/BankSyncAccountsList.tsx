import { useId } from 'react';
import { GridList } from 'react-aria-components';
import { Trans, useTranslation } from 'react-i18next';

import { styles } from '@actual-app/components/styles';
import { Text } from '@actual-app/components/text';
import { theme } from '@actual-app/components/theme';
import { spacing } from '@actual-app/components/tokens';
import { View } from '@actual-app/components/view';
import type { AccountEntity } from '@actual-app/core/types/models';

import type {
  GroupedBankSyncAccounts,
  SyncProviders,
} from '#components/banksync/bankSyncUtils';
import { getGroupedBankSyncEntries } from '#components/banksync/bankSyncUtils';

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

  if (groupedAccountEntries.length === 0) {
    return (
      <View
        style={{
          flexShrink: 0,
          alignItems: 'center',
          padding: `${spacing.xl}px ${spacing.lg}px`,
        }}
      >
        <Text
          style={{
            fontSize: 16,
            color: theme.pageTextLight,
            textAlign: 'center',
          }}
        >
          <Trans>No accounts found matching your search.</Trans>
        </Text>
      </View>
    );
  }

  const hasProviderHeaders = groupedAccountEntries.length > 1;

  return (
    <>
      {groupedAccountEntries.map(([provider, accounts]) => (
        <BankSyncAccountsGroup
          key={provider}
          title={hasProviderHeaders ? syncSourceReadable[provider] : null}
          accounts={accounts}
          onAction={onAction}
        />
      ))}
    </>
  );
}

type BankSyncAccountsGroupProps = {
  title: string | null;
  accounts: AccountEntity[];
  onAction: (account: AccountEntity, action: 'link' | 'edit') => void;
};

function BankSyncAccountsGroup({
  title,
  accounts,
  onAction,
}: BankSyncAccountsGroupProps) {
  const { t } = useTranslation();
  const titleId = useId();

  return (
    <View style={{ flexShrink: 0 }}>
      {title != null && (
        <View
          style={{
            padding: `${spacing.md}px ${spacing.lg}px ${spacing.sm}px`,
            borderBottom: `1px solid ${theme.tableBorder}`,
          }}
        >
          <h2
            id={titleId}
            style={{
              ...styles.smallText,
              margin: 0,
              fontWeight: 600,
              color: theme.pageTextLight,
            }}
          >
            {title}
          </h2>
        </View>
      )}
      <GridList
        aria-label={title == null ? t('Accounts') : undefined}
        aria-labelledby={title == null ? undefined : titleId}
        items={accounts}
      >
        {account => (
          <BankSyncAccountsListItem
            value={account}
            onAction={() =>
              onAction(
                account,
                account.account_sync_source != null ? 'edit' : 'link',
              )
            }
          />
        )}
      </GridList>
    </View>
  );
}
