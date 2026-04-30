import { useCallback, useMemo, useState } from 'react';
import { Trans, useTranslation } from 'react-i18next';

import { useResponsive } from '@actual-app/components/hooks/useResponsive';
import { styles } from '@actual-app/components/styles';
import { Text } from '@actual-app/components/text';
import { View } from '@actual-app/components/view';
import type { AccountEntity } from '@actual-app/core/types/models';

import { MOBILE_NAV_HEIGHT } from '#components/mobile/MobileNavTabs';
import { Page } from '#components/Page';
import { useAccounts } from '#hooks/useAccounts';
import { useGlobalPref } from '#hooks/useGlobalPref';
import { pushModal } from '#modals/modalsSlice';
import { useDispatch } from '#redux';

import { AccountsHeader } from './AccountsHeader';
import { AccountsList } from './AccountsList';
import {
  getGroupedBankSyncEntries,
  getSyncSourceReadable,
  groupBankSyncAccounts,
} from './bankSyncUtils';
import { BuiltInProviders } from './BuiltInProviders';
import { useBuiltInBankSyncProviders } from './useBuiltInBankSyncProviders';

export function BankSync() {
  const { t } = useTranslation();
  const [floatingSidebar] = useGlobalPref('floatingSidebar');
  const { data: accounts = [] } = useAccounts();
  const dispatch = useDispatch();
  const { isNarrowWidth } = useResponsive();
  const syncSourceReadable = useMemo(() => getSyncSourceReadable(t), [t]);
  const {
    providers,
    syncServerStatus,
    showPermissionWarning,
    providersNeedingConfiguration,
  } = useBuiltInBankSyncProviders();

  const [hoveredAccount, setHoveredAccount] = useState<
    AccountEntity['id'] | null
  >(null);

  const groupedAccounts = useMemo(
    () => groupBankSyncAccounts(accounts),
    [accounts],
  );
  const groupedAccountEntries = useMemo(
    () => getGroupedBankSyncEntries(groupedAccounts),
    [groupedAccounts],
  );
  const openAccounts = useMemo(
    () => accounts.filter(account => !account.closed),
    [accounts],
  );

  const onAction = async (account: AccountEntity, action: 'link' | 'edit') => {
    switch (action) {
      case 'edit':
        dispatch(
          pushModal({
            modal: {
              name: 'synced-account-edit',
              options: {
                account,
              },
            },
          }),
        );
        break;
      case 'link':
        dispatch(
          pushModal({
            modal: {
              name: 'add-account',
              options: { upgradingAccountId: account.id },
            },
          }),
        );
        break;
      default:
        break;
    }
  };

  const onHover = useCallback((id: AccountEntity['id'] | null) => {
    setHoveredAccount(id);
  }, []);

  return (
    <Page
      header={t('Bank Sync')}
      style={{
        minHeight: 'initial',
        marginInline: floatingSidebar && !isNarrowWidth ? 'auto' : 0,
        paddingBottom: MOBILE_NAV_HEIGHT,
      }}
    >
      <View style={{ marginTop: '1em', gap: 24 }}>
        <BuiltInProviders
          providers={providers}
          syncServerStatus={syncServerStatus}
          showPermissionWarning={showPermissionWarning}
          providersNeedingConfiguration={providersNeedingConfiguration}
        />

        {openAccounts.length === 0 && (
          <Text style={{ fontSize: '1.1rem' }}>
            <Trans>
              To use the bank syncing features, you must first add an account.
            </Trans>
          </Text>
        )}

        {groupedAccountEntries.map(([syncProvider, accounts]) => {
          return (
            <View key={syncProvider} style={{ minHeight: 'initial' }}>
              {groupedAccountEntries.length > 1 && (
                <Text
                  style={{ fontWeight: 500, fontSize: 20, margin: '.5em 0' }}
                >
                  {syncSourceReadable[syncProvider]}
                </Text>
              )}
              <View style={styles.tableContainer}>
                <AccountsHeader unlinked={syncProvider === 'unlinked'} />
                <AccountsList
                  accounts={accounts}
                  hoveredAccount={hoveredAccount}
                  onHover={onHover}
                  onAction={onAction}
                />
              </View>
            </View>
          );
        })}
      </View>
    </Page>
  );
}
