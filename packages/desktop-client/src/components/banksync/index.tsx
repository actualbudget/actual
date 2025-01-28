import { useMemo, useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';

import { pushModal } from 'loot-core/src/client/actions/modals';
import {
  type BankSyncProviders,
  type AccountEntity,
} from 'loot-core/types/models';

import { useAccounts } from '../../hooks/useAccounts';
import { useGlobalPref } from '../../hooks/useGlobalPref';
import { useDispatch } from '../../redux';
import { Text } from '../common/Text';
import { View } from '../common/View';
import { MOBILE_NAV_HEIGHT } from '../mobile/MobileNavTabs';
import { Page } from '../Page';
import { useResponsive } from '../responsive/ResponsiveProvider';

import { AccountsHeader } from './AccountsHeader';
import { AccountsList } from './AccountsList';

type SyncProviders = BankSyncProviders | 'unlinked';

const useSyncSourceReadable = () => {
  const { t } = useTranslation();

  const syncSourceReadable: Record<SyncProviders, string> = {
    goCardless: 'GoCardless',
    simpleFin: 'SimpleFIN',
    unlinked: t('Unlinked'),
  };

  return { syncSourceReadable };
};

export function BankSync() {
  const { t } = useTranslation();
  const [floatingSidebar] = useGlobalPref('floatingSidebar');

  const { syncSourceReadable } = useSyncSourceReadable();

  const accounts = useAccounts();
  const dispatch = useDispatch();
  const { isNarrowWidth } = useResponsive();

  const [hoveredAccount, setHoveredAccount] = useState<AccountEntity['id']>('');

  const groupedAccounts = useMemo(() => {
    const unsorted = accounts
      .filter(a => !a.closed)
      .reduce(
        (acc, a) => {
          const syncSource = a.account_sync_source ?? 'unlinked';
          acc[syncSource] = acc[syncSource] || [];
          acc[syncSource].push(a);
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
  }, [accounts]);

  const onAction = async (account: AccountEntity, action: 'link' | 'edit') => {
    switch (action) {
      case 'edit':
        dispatch(
          pushModal('synced-account-edit', {
            account,
          }),
        );
        break;
      case 'link':
        dispatch(pushModal('add-account', { upgradingAccountId: account.id }));
        break;
      default:
        break;
    }
  };

  const onHover = useCallback((id: AccountEntity['id']) => {
    setHoveredAccount(id);
  }, []);

  return (
    <Page
      header={t('Bank Sync')}
      style={{
        marginInline: floatingSidebar && !isNarrowWidth ? 'auto' : 0,
        paddingBottom: MOBILE_NAV_HEIGHT,
      }}
    >
      <View style={{ marginTop: '1em' }}>
        {Object.entries(groupedAccounts).map(([syncProvider, accounts]) => {
          return (
            <View key={syncProvider}>
              {Object.keys(groupedAccounts).length > 1 && (
                <Text
                  style={{ fontWeight: 500, fontSize: 20, margin: '.5em 0' }}
                >
                  {syncSourceReadable[syncProvider as SyncProviders]}
                </Text>
              )}
              <AccountsHeader unlinked={syncProvider === 'unlinked'} />
              <AccountsList
                accounts={accounts}
                hoveredAccount={hoveredAccount}
                onHover={onHover}
                onAction={onAction}
              />
            </View>
          );
        })}
      </View>
    </Page>
  );
}
