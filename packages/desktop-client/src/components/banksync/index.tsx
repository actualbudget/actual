import { useState } from 'react';
import { Trans, useTranslation } from 'react-i18next';

import type { MenuItemObject } from '@actual-app/components/menu';
import { styles } from '@actual-app/components/styles';
import { Text } from '@actual-app/components/text';
import { theme } from '@actual-app/components/theme';
import { spacing } from '@actual-app/components/tokens';
import { View } from '@actual-app/components/view';
import type { AccountEntity } from '@actual-app/core/types/models';

import { EmptyMessage } from '#components/common/EmptyMessage';
import { Link } from '#components/common/Link';
import { ManagePage } from '#components/common/ManagePage';
import { PageMenuButton } from '#components/common/PageMenuButton';
import { useSyncedPref } from '#hooks/useSyncedPref';
import { pushModal } from '#modals/modalsSlice';
import { useDispatch } from '#redux';

import { AccountsHeader } from './AccountsHeader';
import { AccountsList } from './AccountsList';
import {
  LINKED_ACCOUNTS_GRID_COLUMNS,
  UNLINKED_ACCOUNTS_GRID_COLUMNS,
} from './accountsTableLayout';
import { BankSyncServerRequired } from './BankSyncServerRequired';
import {
  getAutomaticSyncMenuText,
  getGroupedBankSyncEntries,
  getSyncSourceReadable,
  groupBankSyncAccounts,
} from './bankSyncUtils';
import { BuiltInProviders } from './BuiltInProviders';
import { LinkBankAccountButton } from './LinkBankAccountButton';
import { useBankSyncPage } from './useBankSyncPage';

type BankSyncMenuItem = 'providers' | 'automatic-sync';

export function BankSync() {
  const [refreshKey, setRefreshKey] = useState(0);

  return (
    <BankSyncContent
      key={refreshKey}
      onProvidersChange={() => setRefreshKey(key => key + 1)}
    />
  );
}

type BankSyncContentProps = {
  onProvidersChange: () => void;
};

function BankSyncContent({ onProvidersChange }: BankSyncContentProps) {
  const { t } = useTranslation();
  const dispatch = useDispatch();
  const syncSourceReadable = getSyncSourceReadable(t);
  const [interval] = useSyncedPref('bank-sync-interval');
  const {
    providers,
    configuredProviders,
    syncServerStatus,
    permissionWarning,
    visibleAccounts,
    hasLinkedAccounts,
    isLoadingProviders,
    isSettingUp,
    hasNoAccountsMessage,
    hasProvidersMenuItem,
  } = useBankSyncPage();

  const [hoveredAccount, setHoveredAccount] = useState<
    AccountEntity['id'] | null
  >(null);

  const groupedAccountEntries = getGroupedBankSyncEntries(
    groupBankSyncAccounts(visibleAccounts),
  );

  const onAction = (account: AccountEntity, action: 'link' | 'edit') => {
    if (action === 'edit') {
      dispatch(
        pushModal({
          modal: { name: 'synced-account-edit', options: { account } },
        }),
      );
      return;
    }

    dispatch(
      pushModal({
        modal: {
          name: 'add-account',
          options: { upgradingAccountId: account.id },
        },
      }),
    );
  };

  const menuItems: Array<MenuItemObject<BankSyncMenuItem>> = [];
  if (hasProvidersMenuItem) {
    menuItems.push({ name: 'providers', text: t('Providers') });
  }
  if (hasLinkedAccounts) {
    menuItems.push({
      name: 'automatic-sync',
      text: getAutomaticSyncMenuText(interval, t),
    });
  }

  const onMenuSelect = (name: BankSyncMenuItem) => {
    if (name === 'providers') {
      dispatch(
        pushModal({
          modal: {
            name: 'bank-sync-providers',
            options: { onProvidersChange },
          },
        }),
      );
      return;
    }

    dispatch(pushModal({ modal: { name: 'bank-sync-automatic-sync' } }));
  };

  return (
    <ManagePage
      description={
        <Trans>
          Bank sync downloads transactions from your bank into your accounts
          through a provider that you set up.{' '}
          <Link
            variant="external"
            to="https://actualbudget.org/docs/advanced/bank-sync"
            linkColor="muted"
          >
            Learn more
          </Link>
        </Trans>
      }
      actions={
        (isLoadingProviders || configuredProviders.length > 0) && (
          <LinkBankAccountButton
            providers={configuredProviders}
            isLoadingProviders={isLoadingProviders}
          />
        )
      }
      menu={
        menuItems.length > 0 && (
          <PageMenuButton<BankSyncMenuItem>
            items={menuItems}
            onMenuSelect={onMenuSelect}
          />
        )
      }
    >
      <View
        style={{
          flex: 1,
          minHeight: 0,
          overflowY: 'auto',
          gap: spacing.xl,
          paddingBottom: spacing.xl,
        }}
      >
        {syncServerStatus !== 'online' && (
          <BankSyncServerRequired syncServerStatus={syncServerStatus} />
        )}

        {isSettingUp && (
          <View style={{ flexShrink: 0, gap: spacing.md }}>
            <Text style={{ ...styles.smallText, color: theme.pageText }}>
              <Trans>Set up a provider to start linking bank accounts.</Trans>
            </Text>
            <BuiltInProviders
              providers={providers}
              syncServerStatus={syncServerStatus}
              permissionWarning={permissionWarning}
            />
          </View>
        )}

        {hasNoAccountsMessage && (
          <EmptyMessage>
            <Text style={{ color: theme.pageTextLight, textAlign: 'center' }}>
              <Trans>
                No accounts yet. Use <strong>Link bank account</strong> to
                connect your bank and create your accounts. You can also add
                accounts manually and link them here later.
              </Trans>
            </Text>
          </EmptyMessage>
        )}

        {groupedAccountEntries.map(([syncProvider, accounts]) => (
          <View key={syncProvider} style={{ flexShrink: 0 }}>
            {groupedAccountEntries.length > 1 && (
              <h2
                style={{
                  ...styles.mediumText,
                  margin: 0,
                  fontWeight: 600,
                  marginBottom: spacing.sm,
                }}
              >
                {syncSourceReadable[syncProvider]}
              </h2>
            )}
            <View
              style={{
                ...styles.tableContainer,
                display: 'grid',
                gridTemplateColumns:
                  syncProvider === 'unlinked'
                    ? UNLINKED_ACCOUNTS_GRID_COLUMNS
                    : LINKED_ACCOUNTS_GRID_COLUMNS,
              }}
            >
              <AccountsHeader unlinked={syncProvider === 'unlinked'} />
              <AccountsList
                accounts={accounts}
                hoveredAccount={hoveredAccount}
                onHover={setHoveredAccount}
                onAction={onAction}
              />
            </View>
          </View>
        ))}
      </View>
    </ManagePage>
  );
}
