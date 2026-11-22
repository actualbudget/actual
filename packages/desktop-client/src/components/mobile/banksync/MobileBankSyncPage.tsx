import { useState } from 'react';
import { Trans, useTranslation } from 'react-i18next';

import { Button } from '@actual-app/components/button';
import { AnimatedLoading } from '@actual-app/components/icons/AnimatedLoading';
import {
  SvgAdd,
  SvgDotsHorizontalTriple,
} from '@actual-app/components/icons/v1';
import { styles } from '@actual-app/components/styles';
import { Text } from '@actual-app/components/text';
import { theme } from '@actual-app/components/theme';
import { spacing } from '@actual-app/components/tokens';
import { View } from '@actual-app/components/view';
import type { AccountEntity } from '@actual-app/core/types/models';

import { BankSyncServerRequired } from '#components/banksync/BankSyncServerRequired';
import {
  getGroupedBankSyncEntries,
  getSyncSourceReadable,
  groupBankSyncAccounts,
} from '#components/banksync/bankSyncUtils';
import type { GroupedBankSyncAccounts } from '#components/banksync/bankSyncUtils';
import { useBankSyncPage } from '#components/banksync/useBankSyncPage';
import { Search } from '#components/common/Search';
import { MOBILE_NAV_HEIGHT } from '#components/mobile/MobileNavTabs';
import { MobilePageHeader, Page } from '#components/Page';
import { SettingsBackButton } from '#components/settings/SettingsBackButton';
import { useNavigate } from '#hooks/useNavigate';
import { pushModal } from '#modals/modalsSlice';
import { useDispatch } from '#redux';

import { BankSyncAccountsList } from './BankSyncAccountsList';
import { BankSyncProviderRows } from './BankSyncProviderRows';

export function MobileBankSyncPage() {
  const [refreshKey, setRefreshKey] = useState(0);
  const [filter, setFilter] = useState('');

  return (
    <MobileBankSyncPageContent
      key={refreshKey}
      filter={filter}
      onFilterChange={setFilter}
      onProvidersChange={() => setRefreshKey(key => key + 1)}
    />
  );
}

type MobileBankSyncPageContentProps = {
  filter: string;
  onFilterChange: (filter: string) => void;
  onProvidersChange: () => void;
};

function MobileBankSyncPageContent({
  filter,
  onFilterChange,
  onProvidersChange,
}: MobileBankSyncPageContentProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const syncSourceReadable = getSyncSourceReadable(t);
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
    isLinking,
  } = useBankSyncPage();

  const groupedAccounts = groupBankSyncAccounts(visibleAccounts);
  const filterLower = filter.toLowerCase();
  const filteredGroupedAccounts: GroupedBankSyncAccounts = {};
  for (const [provider, accounts] of getGroupedBankSyncEntries(
    groupedAccounts,
  )) {
    const filteredAccounts = accounts.filter(
      account =>
        account.name.toLowerCase().includes(filterLower) ||
        account.bankName?.toLowerCase().includes(filterLower),
    );
    if (filteredAccounts.length > 0) {
      filteredGroupedAccounts[provider] = filteredAccounts;
    }
  }

  const onAction = (account: AccountEntity, action: 'link' | 'edit') => {
    if (action === 'edit') {
      void navigate(`/bank-sync/account/${account.id}/edit`);
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

  const onLinkBankAccount = () => {
    if (configuredProviders.length === 1) {
      void configuredProviders[0].onLink();
      return;
    }

    dispatch(
      pushModal({
        modal: {
          name: 'bank-sync-link-provider',
          options: {
            linkProviders: configuredProviders.map(
              ({ id, displayName, onLink }) => ({ id, displayName, onLink }),
            ),
          },
        },
      }),
    );
  };

  const onOpenMenu = () => {
    dispatch(
      pushModal({
        modal: {
          name: 'bank-sync-menu',
          options: {
            hasProvidersItem: hasProvidersMenuItem,
            hasAutomaticSyncItem: hasLinkedAccounts,
            onProvidersChange,
          },
        },
      }),
    );
  };

  const canLink = configuredProviders.length > 0;
  const hasMenu = hasProvidersMenuItem || hasLinkedAccounts;

  return (
    <Page
      header={
        <MobilePageHeader
          title={t('Bank Sync')}
          leftContent={<SettingsBackButton />}
          rightContent={
            <>
              {(canLink || isLoadingProviders) && (
                <Button
                  variant="bare"
                  aria-label={t('Link bank account')}
                  isDisabled={isLinking || isLoadingProviders}
                  style={{ margin: hasMenu ? '10px 0 10px 10px' : 10 }}
                  onPress={onLinkBankAccount}
                >
                  {isLinking || isLoadingProviders ? (
                    <AnimatedLoading width={20} height={20} />
                  ) : (
                    <SvgAdd width={20} height={20} />
                  )}
                </Button>
              )}
              {hasMenu && (
                <Button
                  variant="bare"
                  aria-label={t('Bank sync menu')}
                  style={{ margin: 10 }}
                  onPress={onOpenMenu}
                >
                  <SvgDotsHorizontalTriple width={20} height={20} />
                </Button>
              )}
            </>
          }
        />
      }
      padding={0}
    >
      <View
        style={{
          flex: 1,
          minHeight: 0,
          overflowY: 'auto',
          paddingBottom: MOBILE_NAV_HEIGHT,
        }}
      >
        {syncServerStatus !== 'online' && (
          <BankSyncServerRequired syncServerStatus={syncServerStatus} />
        )}

        {isSettingUp && (
          <View style={{ flexShrink: 0 }}>
            <Text
              style={{
                ...styles.mediumText,
                color: theme.pageText,
                padding: spacing.lg,
              }}
            >
              <Trans>Set up a provider to start linking bank accounts.</Trans>
            </Text>
            <View
              style={{
                backgroundColor: theme.tableBackground,
                borderBottom: `1px solid ${theme.tooltipBorder}`,
              }}
            >
              <BankSyncProviderRows
                providers={providers}
                permissionWarning={permissionWarning}
              />
            </View>
          </View>
        )}

        {hasNoAccountsMessage && (
          <View
            style={{
              flexShrink: 0,
              alignItems: 'center',
              gap: spacing.lg,
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
              <Trans>
                No accounts yet. Link a bank account to create your accounts, or
                add accounts from the Accounts tab and link them here later.
              </Trans>
            </Text>
            <Button
              variant="primary"
              isDisabled={isLinking}
              style={{
                ...styles.mediumText,
                minHeight: styles.mobileMinHeight,
                paddingInline: spacing.xl,
              }}
              onPress={onLinkBankAccount}
            >
              <Trans>Link bank account</Trans>
            </Button>
          </View>
        )}

        {visibleAccounts.length > 0 && (
          <>
            <View
              style={{
                flexShrink: 0,
                position: 'sticky',
                top: 0,
                zIndex: 1,
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
                onChange={onFilterChange}
                width="100%"
                height={styles.mobileMinHeight}
                style={{
                  backgroundColor: theme.tableBackground,
                  borderColor: theme.formInputBorder,
                }}
              />
            </View>
            <BankSyncAccountsList
              groupedAccounts={filteredGroupedAccounts}
              syncSourceReadable={syncSourceReadable}
              onAction={onAction}
            />
          </>
        )}
      </View>
    </Page>
  );
}
