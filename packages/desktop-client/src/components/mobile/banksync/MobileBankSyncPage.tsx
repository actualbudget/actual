import { useMemo, useState, useCallback } from 'react';
import { Trans, useTranslation } from 'react-i18next';

import { Button } from '@actual-app/components/button';
import { styles } from '@actual-app/components/styles';
import { Text } from '@actual-app/components/text';
import { theme } from '@actual-app/components/theme';
import { View } from '@actual-app/components/view';

import {
  type BankSyncProviders,
  type AccountEntity,
} from 'loot-core/types/models';

import { BankSyncAccountsList } from './BankSyncAccountsList';

import { syncAccounts } from '@desktop-client/accounts/accountsSlice';
import { Search } from '@desktop-client/components/common/Search';
import { MobilePageHeader, Page } from '@desktop-client/components/Page';
import { useAccounts } from '@desktop-client/hooks/useAccounts';
import { useNavigate } from '@desktop-client/hooks/useNavigate';
import { pushModal } from '@desktop-client/modals/modalsSlice';
import { useDispatch, useSelector } from '@desktop-client/redux';

type SyncProviders = BankSyncProviders | 'unlinked';

const useSyncSourceReadable = () => {
  const { t } = useTranslation();

  const syncSourceReadable: Record<SyncProviders, string> = {
    goCardless: 'GoCardless',
    simpleFin: 'SimpleFIN',
    pluggyai: 'Pluggy.ai',
    unlinked: t('Unlinked'),
  };

  return { syncSourceReadable };
};

export function MobileBankSyncPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { syncSourceReadable } = useSyncSourceReadable();
  const accounts = useAccounts();
  const [filter, setFilter] = useState('');

  // Get sync queue state
  const { syncQueue, isProcessingQueue } = useSelector(state => state.account);

  const openAccounts = useMemo(
    () => accounts.filter(a => !a.closed),
    [accounts],
  );

  // Get linked accounts (accounts that can be synced)
  const linkedAccounts = useMemo(() => {
    return openAccounts.filter(a => a.account_sync_source);
  }, [openAccounts]);

  const handleSyncAll = useCallback(() => {
    if (linkedAccounts.length > 0) {
      dispatch(syncAccounts({})); // No id = sync all accounts
    }
  }, [dispatch, linkedAccounts.length]);

  const groupedAccounts = useMemo(() => {
    const unsorted = openAccounts.reduce(
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
  }, [openAccounts]);

  const filteredGroupedAccounts = useMemo(() => {
    if (!filter) return groupedAccounts;

    const filterLower = filter.toLowerCase();
    const filtered: Record<SyncProviders, AccountEntity[]> = {} as Record<
      SyncProviders,
      AccountEntity[]
    >;

    Object.entries(groupedAccounts).forEach(([provider, accounts]) => {
      const filteredAccounts = accounts.filter(
        account =>
          account.name.toLowerCase().includes(filterLower) ||
          account.bankName?.toLowerCase().includes(filterLower),
      );
      if (filteredAccounts.length > 0) {
        filtered[provider as SyncProviders] = filteredAccounts;
      }
    });

    return filtered;
  }, [groupedAccounts, filter]);

  const onAction = useCallback(
    (account: AccountEntity, action: 'link' | 'edit') => {
      switch (action) {
        case 'edit':
          navigate(`/bank-sync/account/${account.id}/edit`);
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
    },
    [navigate, dispatch],
  );

  const onSearchChange = useCallback((value: string) => {
    setFilter(value);
  }, []);

  return (
    <Page header={<MobilePageHeader title={t('Bank Sync')} />} padding={0}>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          backgroundColor: theme.mobilePageBackground,
          padding: 10,
          width: '100%',
          borderBottomWidth: 2,
          borderBottomStyle: 'solid',
          borderBottomColor: theme.tableBorder,
        }}
      >
        <Search
          placeholder={t('Filter accounts…')}
          value={filter}
          onChange={onSearchChange}
          width="100%"
          height={styles.mobileMinHeight}
          style={{
            backgroundColor: theme.tableBackground,
            borderColor: theme.formInputBorder,
          }}
        />
      </View>

      {/* Mobile Sync All Button */}
      {linkedAccounts.length > 0 && (
        <View
          style={{
            backgroundColor: theme.mobilePageBackground,
            padding: 15,
            borderBottomWidth: 1,
            borderBottomStyle: 'solid',
            borderBottomColor: theme.tableBorder,
          }}
        >
          <Button
            variant="bare"
            onPress={handleSyncAll}
            isDisabled={isProcessingQueue}
            style={{
              color: isProcessingQueue ? theme.pageTextSubdued : theme.pageText,
              textDecoration: 'underline',
              textDecorationColor: isProcessingQueue
                ? theme.pageTextSubdued
                : theme.pageText,
              padding: 0,
              minHeight: 'auto',
              marginBottom: 8,
            }}
          >
            {isProcessingQueue ? t('Syncing...') : t('Sync All Accounts')}
          </Button>
          <Text
            style={{
              color: theme.pageTextSubdued,
              fontSize: 14,
            }}
          >
            {isProcessingQueue ? (
              syncQueue.some(req => req.id === 'ALL_ACCOUNTS') ? (
                <Trans count={linkedAccounts.length}>
                  Processing {{ count: linkedAccounts.length }} linked accounts
                </Trans>
              ) : (
                <Trans count={syncQueue.length}>
                  Processing {{ count: syncQueue.length }} account
                </Trans>
              )
            ) : (
              <Trans count={linkedAccounts.length}>
                {{ count: linkedAccounts.length }} linked accounts
              </Trans>
            )}
          </Text>
        </View>
      )}

      {openAccounts.length === 0 ? (
        <View
          style={{
            flex: 1,
            alignItems: 'center',
            justifyContent: 'center',
            paddingHorizontal: 20,
            paddingTop: 40,
          }}
        >
          <Text
            style={{
              fontSize: 16,
              color: theme.pageTextSubdued,
              textAlign: 'center',
            }}
          >
            <Trans>
              To use the bank syncing features, you must first add an account.
            </Trans>
          </Text>
        </View>
      ) : (
        <BankSyncAccountsList
          groupedAccounts={filteredGroupedAccounts}
          syncSourceReadable={syncSourceReadable}
          onAction={onAction}
        />
      )}
    </Page>
  );
}
