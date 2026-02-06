import { useCallback, useMemo, useState } from 'react';
import { Trans, useTranslation } from 'react-i18next';

import { useResponsive } from '@actual-app/components/hooks/useResponsive';
import { styles } from '@actual-app/components/styles';
import { Text } from '@actual-app/components/text';
import { theme } from '@actual-app/components/theme';
import { View } from '@actual-app/components/view';

import { send } from 'loot-core/platform/client/fetch';
import {
  type AccountEntity,
  type BankSyncProviders,
} from 'loot-core/types/models';

import { AccountsHeader } from './AccountsHeader';
import { AccountsList } from './AccountsList';
import { ProviderList } from './ProviderList';
import { ProviderScopeButton } from './ProviderScopeButton';
import { useProviderStatusMap } from './useProviderStatusMap';

import { useAuth } from '@desktop-client/auth/AuthProvider';
import { Permissions } from '@desktop-client/auth/types';
import { Warning } from '@desktop-client/components/alerts';
import { MOBILE_NAV_HEIGHT } from '@desktop-client/components/mobile/MobileNavTabs';
import { Page } from '@desktop-client/components/Page';
import { useMultiuserEnabled } from '@desktop-client/components/ServerContext';
import { authorizeBank } from '@desktop-client/gocardless';
import { useAccounts } from '@desktop-client/hooks/useAccounts';
import { useGlobalPref } from '@desktop-client/hooks/useGlobalPref';
import { useMetadataPref } from '@desktop-client/hooks/useMetadataPref';
import { pushModal } from '@desktop-client/modals/modalsSlice';
import { addNotification } from '@desktop-client/notifications/notificationsSlice';
import { useDispatch } from '@desktop-client/redux';

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

export function BankSync() {
  const { t } = useTranslation();
  const [floatingSidebar] = useGlobalPref('floatingSidebar');

  const { syncSourceReadable } = useSyncSourceReadable();

  const accounts = useAccounts();
  const dispatch = useDispatch();
  const { isNarrowWidth } = useResponsive();
  const [budgetId] = useMetadataPref('id');
  const { hasPermission } = useAuth();
  const multiuserEnabled = useMultiuserEnabled();
  const canConfigureProviders =
    !multiuserEnabled || hasPermission(Permissions.ADMINISTRATOR);

  const {
    statusMap,
    refetch: refetchProviderStatuses,
    providers,
  } = useProviderStatusMap({ fileId: budgetId ?? undefined });

  const hasConfiguredProviders = useMemo(
    () => providers.some(p => Boolean(statusMap[p.slug]?.configured)),
    [providers, statusMap],
  );

  const openAccounts = useMemo(
    () => accounts.filter(a => !a.closed),
    [accounts],
  );

  const [hoveredAccount, setHoveredAccount] = useState<
    AccountEntity['id'] | null
  >(null);

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

  const onAction = useCallback(
    async (account: AccountEntity, action: 'link' | 'edit') => {
      if (action === 'edit') {
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
      }
    },
    [dispatch],
  );

  const onHover = useCallback((id: AccountEntity['id'] | null) => {
    setHoveredAccount(id);
  }, []);

  const configureProvider = useCallback(
    (provider: { slug: string; displayName: string }) => {
      const fileId = budgetId ?? '';
      if (!fileId) return;
      if (provider.slug === 'goCardless') {
        dispatch(
          pushModal({
            modal: {
              name: 'gocardless-init',
              options: {
                onSuccess: () => refetchProviderStatuses(),
                fileId,
              },
            },
          }),
        );
        return;
      }
      if (provider.slug === 'simpleFin') {
        dispatch(
          pushModal({
            modal: {
              name: 'simplefin-init',
              options: {
                onSuccess: () => refetchProviderStatuses(),
                fileId,
              },
            },
          }),
        );
        return;
      }
      if (provider.slug === 'pluggyai') {
        dispatch(
          pushModal({
            modal: {
              name: 'pluggyai-init',
              options: {
                onSuccess: () => refetchProviderStatuses(),
                fileId,
              },
            },
          }),
        );
      }
    },
    [dispatch, refetchProviderStatuses, budgetId],
  );

  const resetProvider = useCallback(
    (provider: { slug: string; displayName: string }) => {
      const fileId = budgetId ?? '';
      const message = t(
        'Are you sure you want to reset the {{provider}} credentials? You will need to set them up again to use bank sync.',
        { provider: provider.displayName },
      );

      const doReset = async () => {
        if (provider.slug === 'goCardless') {
          await send('secret-set', {
            name: 'gocardless_secretId',
            value: null,
            fileId,
          });
          await send('secret-set', {
            name: 'gocardless_secretKey',
            value: null,
            fileId,
          });
        } else if (provider.slug === 'simpleFin') {
          await send('secret-set', {
            name: 'simplefin_token',
            value: null,
            fileId,
          });
          await send('secret-set', {
            name: 'simplefin_accessKey',
            value: null,
            fileId,
          });
        } else if (provider.slug === 'pluggyai') {
          await send('secret-set', {
            name: 'pluggyai_clientId',
            value: null,
            fileId,
          });
          await send('secret-set', {
            name: 'pluggyai_clientSecret',
            value: null,
            fileId,
          });
          await send('secret-set', {
            name: 'pluggyai_itemIds',
            value: null,
            fileId,
          });
        }
        refetchProviderStatuses();
      };

      dispatch(
        pushModal({
          modal: {
            name: 'confirm-reset-credentials',
            options: { message, onConfirm: doReset },
          },
        }),
      );
    },
    [dispatch, budgetId, refetchProviderStatuses, t],
  );

  const openProviderAccounts = useCallback(
    async ({
      providerSlug,
      upgradingAccountId: upgradingId,
    }: {
      providerSlug: string;
      upgradingAccountId?: string;
    }) => {
      const fileId = budgetId ?? undefined;
      if (!fileId) return;

      if (providerSlug === 'goCardless') {
        authorizeBank(dispatch, fileId);
        return;
      }

      if (providerSlug === 'simpleFin') {
        try {
          const results = await send('simplefin-accounts', { fileId });
          if (results.error_code) {
            throw new Error(results.reason);
          }
          const newAccounts = (results.accounts ?? []).map(
            (oldAccount: {
              id: string;
              name: string;
              org: { name: string; domain: string; id: string };
              balance: number;
            }) => ({
              account_id: oldAccount.id,
              name: oldAccount.name,
              institution: oldAccount.org.name,
              orgDomain: oldAccount.org.domain,
              orgId: oldAccount.org.id,
              balance: oldAccount.balance,
            }),
          );
          dispatch(
            pushModal({
              modal: {
                name: 'select-linked-accounts',
                options: {
                  externalAccounts: newAccounts,
                  syncSource: 'simpleFin',
                  upgradingAccountId: upgradingId,
                },
              },
            }),
          );
        } catch (err) {
          dispatch(
            addNotification({
              notification: {
                type: 'error',
                title: t('Error fetching accounts'),
                message: err instanceof Error ? err.message : String(err),
                timeout: 5000,
              },
            }),
          );
        }
        return;
      }

      if (providerSlug === 'pluggyai') {
        try {
          const results = await send(
            'pluggyai-accounts',
            fileId ? { fileId } : {},
          );
          if (results?.error_code) {
            throw new Error(results.reason);
          }
          if (results && 'error' in results) {
            throw new Error((results as { error: string }).error);
          }
          type PluggyAccount = {
            id: string;
            name: string;
            type: string;
            taxNumber?: string;
            owner?: string;
            balance: number;
            bankData?: {
              automaticallyInvestedBalance: number;
              closingBalance: number;
            };
          };
          const accountsList =
            (results as { accounts?: PluggyAccount[] }).accounts ?? [];
          const newAccounts = accountsList.map((oldAccount: PluggyAccount) => ({
            account_id: oldAccount.id,
            name: `${oldAccount.name.trim()} - ${oldAccount.type === 'BANK' ? oldAccount.taxNumber : oldAccount.owner}`,
            institution: oldAccount.name,
            orgDomain: null,
            orgId: oldAccount.id,
            balance:
              oldAccount.type === 'BANK' && oldAccount.bankData
                ? oldAccount.bankData.automaticallyInvestedBalance +
                  oldAccount.bankData.closingBalance
                : oldAccount.balance,
          }));
          dispatch(
            pushModal({
              modal: {
                name: 'select-linked-accounts',
                options: {
                  externalAccounts: newAccounts,
                  syncSource: 'pluggyai',
                  upgradingAccountId: upgradingId,
                },
              },
            }),
          );
        } catch (err) {
          dispatch(
            addNotification({
              notification: {
                type: 'error',
                title: t('Error when trying to contact Pluggy.ai'),
                message: err instanceof Error ? err.message : String(err),
                timeout: 5000,
              },
            }),
          );
        }
      }
    },
    [dispatch, budgetId, t],
  );

  return (
    <Page
      header={t('Bank Sync')}
      style={{
        minHeight: 'initial',
        marginInline: floatingSidebar && !isNarrowWidth ? 'auto' : 0,
        paddingBottom: MOBILE_NAV_HEIGHT,
      }}
    >
      <View style={{ marginTop: '1em' }}>
        <View style={{ gap: 12, marginBottom: 24 }}>
          <Text style={{ fontWeight: 600, fontSize: 18 }}>
            <Trans>Providers</Trans>
          </Text>
          <ProviderList
            statusMap={statusMap}
            canConfigure={canConfigureProviders}
            onConfigure={configureProvider}
            onReset={resetProvider}
          />
          {!hasConfiguredProviders && (
            <Text style={{ color: theme.pageTextSubdued, fontStyle: 'italic' }}>
              <Trans>No providers enabled</Trans>
            </Text>
          )}
          {!canConfigureProviders && (
            <Warning>
              <Trans>
                You don&apos;t have the required permissions to configure bank
                sync providers. Please contact an Admin to configure them.
              </Trans>
            </Warning>
          )}
        </View>

        <View style={{ marginBottom: 18, alignItems: 'flex-start' }}>
          <ProviderScopeButton
            label={t('Add bank sync account')}
            statusMap={statusMap}
            isDisabled={!hasConfiguredProviders}
            onSelect={({ providerSlug }) =>
              openProviderAccounts({ providerSlug })
            }
          />
        </View>

        {openAccounts.length === 0 ? (
          <Text style={{ color: theme.pageTextSubdued, fontStyle: 'italic' }}>
            <Trans>No bank accounts to link to a provider</Trans>
          </Text>
        ) : (
          Object.entries(groupedAccounts).map(([syncProvider, accountsList]) => {
          return (
            <View key={syncProvider} style={{ minHeight: 'initial' }}>
              {Object.keys(groupedAccounts).length > 1 && (
                <Text
                  style={{ fontWeight: 500, fontSize: 20, margin: '.5em 0' }}
                >
                  {syncSourceReadable[syncProvider as SyncProviders]}
                </Text>
              )}
              <View style={styles.tableContainer}>
                <AccountsHeader unlinked={syncProvider === 'unlinked'} />
                <AccountsList
                  accounts={accountsList}
                  hoveredAccount={hoveredAccount}
                  onHover={onHover}
                  onAction={onAction}
                  renderLinkButton={
                    hasConfiguredProviders
                      ? account => (
                          <ProviderScopeButton
                            label={t('Link account')}
                            statusMap={statusMap}
                            isDisabled={false}
                            onSelect={({ providerSlug }) =>
                              openProviderAccounts({
                                providerSlug,
                                upgradingAccountId: account.id,
                              })
                            }
                          />
                        )
                      : undefined
                  }
                />
              </View>
            </View>
          );
        })
        )}
      </View>
    </Page>
  );
}
