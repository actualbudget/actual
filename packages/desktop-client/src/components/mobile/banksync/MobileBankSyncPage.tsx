import { useCallback, useMemo, useState } from 'react';
import { Trans, useTranslation } from 'react-i18next';

import { styles } from '@actual-app/components/styles';
import { Text } from '@actual-app/components/text';
import { theme } from '@actual-app/components/theme';
import { View } from '@actual-app/components/view';
import type { AccountEntity } from '@actual-app/core/types/models';

import {
  getGroupedBankSyncEntries,
  getSyncSourceReadable,
  groupBankSyncAccounts,
} from '#components/banksync/bankSyncUtils';
import type { GroupedBankSyncAccounts } from '#components/banksync/bankSyncUtils';
import { BuiltInProviders } from '#components/banksync/BuiltInProviders';
import { useBuiltInBankSyncProviders } from '#components/banksync/useBuiltInBankSyncProviders';
import { Search } from '#components/common/Search';
import { MobilePageHeader, Page } from '#components/Page';
import { useAccounts } from '#hooks/useAccounts';
import { useLocalPref } from '#hooks/useLocalPref';
import { useNavigate } from '#hooks/useNavigate';
import { pushModal } from '#modals/modalsSlice';
import { useDispatch } from '#redux';

import { BankSyncAccountsList } from './BankSyncAccountsList';

export function MobileBankSyncPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { data: accounts = [] } = useAccounts();
  const [filter, setFilter] = useState('');
  const [providersCollapsed = true, setProvidersCollapsed] = useLocalPref(
    'mobile.bankSyncProvidersCollapsed',
  );
  const syncSourceReadable = useMemo(() => getSyncSourceReadable(t), [t]);
  const { providers, syncServerStatus, permissionWarning } =
    useBuiltInBankSyncProviders();

  const openAccounts = useMemo(
    () => accounts.filter(a => !a.closed),
    [accounts],
  );

  const groupedAccounts = useMemo(
    () => groupBankSyncAccounts(openAccounts),
    [openAccounts],
  );

  const filteredGroupedAccounts = useMemo(() => {
    if (!filter) return groupedAccounts;

    const filterLower = filter.toLowerCase();
    const filtered: GroupedBankSyncAccounts = {};

    getGroupedBankSyncEntries(groupedAccounts).forEach(
      ([provider, accounts]) => {
        const filteredAccounts = accounts.filter(
          account =>
            account.name.toLowerCase().includes(filterLower) ||
            account.bankName?.toLowerCase().includes(filterLower),
        );
        if (filteredAccounts.length > 0) {
          filtered[provider] = filteredAccounts;
        }
      },
    );

    return filtered;
  }, [groupedAccounts, filter]);

  const onAction = useCallback(
    (account: AccountEntity, action: 'link' | 'edit') => {
      switch (action) {
        case 'edit':
          void navigate(`/bank-sync/account/${account.id}/edit`);
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
      <View style={{ padding: 15, flexShrink: 0 }}>
        <BuiltInProviders
          providers={providers}
          syncServerStatus={syncServerStatus}
          permissionWarning={permissionWarning}
          isCollapsed={providersCollapsed}
          onToggleCollapse={() => setProvidersCollapsed(!providersCollapsed)}
        />
      </View>
      {openAccounts.length > 0 && (
        <View
          style={{
            flexShrink: 0,
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
              Linked accounts will appear here. Use a provider above to link
              your bank, or create an account from the Accounts tab and connect
              it here later.
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
