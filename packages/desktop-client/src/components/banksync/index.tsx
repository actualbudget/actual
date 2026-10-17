import { useCallback, useMemo, useState } from 'react';
import { Trans, useTranslation } from 'react-i18next';

import { styles } from '@actual-app/components/styles';
import { Text } from '@actual-app/components/text';
import { View } from '@actual-app/components/view';
import type { AccountEntity } from '@actual-app/core/types/models';

import { MOBILE_NAV_HEIGHT } from '#components/mobile/MobileNavTabs';
import { useAccounts } from '#hooks/useAccounts';
import { pushModal } from '#modals/modalsSlice';
import { useDispatch } from '#redux';

import { AccountsHeader } from './AccountsHeader';
import { AccountsList } from './AccountsList';
import { AutomaticSyncSettings } from './AutomaticSyncSettings';
import {
  getGroupedBankSyncEntries,
  getSyncSourceReadable,
  groupBankSyncAccounts,
} from './bankSyncUtils';
import { BuiltInProviders } from './BuiltInProviders';
import { useBuiltInBankSyncProviders } from './useBuiltInBankSyncProviders';

export function BankSync() {
  const { t } = useTranslation();
  const { data: accounts = [] } = useAccounts();
  const dispatch = useDispatch();
  const syncSourceReadable = useMemo(() => getSyncSourceReadable(t), [t]);
  const { providers, syncServerStatus, permissionWarning } =
    useBuiltInBankSyncProviders();

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
  const hasLinkedAccounts = openAccounts.some(account => !!account.bank);

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
    <View style={{ flexShrink: 0, gap: 24, paddingBottom: MOBILE_NAV_HEIGHT }}>
      <BuiltInProviders
        providers={providers}
        syncServerStatus={syncServerStatus}
        permissionWarning={permissionWarning}
      />

      {hasLinkedAccounts && <AutomaticSyncSettings />}

      {openAccounts.length === 0 && (
        <Text style={{ fontSize: '1.1rem' }}>
          <Trans>
            No accounts yet. Once a provider is set up, use{' '}
            <strong>Link bank account</strong> to connect your bank and create
            your accounts automatically. You can also add accounts manually and
            connect them here later.
          </Trans>
        </Text>
      )}

      {groupedAccountEntries.map(([syncProvider, accounts]) => {
        return (
          <View key={syncProvider} style={{ minHeight: 'initial' }}>
            {groupedAccountEntries.length > 1 && (
              <Text style={{ fontWeight: 500, fontSize: 20, margin: '.5em 0' }}>
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
  );
}
