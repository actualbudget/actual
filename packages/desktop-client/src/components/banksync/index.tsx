import { useCallback, useMemo, useState } from 'react';
import { Trans, useTranslation } from 'react-i18next';

import { useResponsive } from '@actual-app/components/hooks/useResponsive';
import { styles } from '@actual-app/components/styles';
import { Text } from '@actual-app/components/text';
import { View } from '@actual-app/components/view';
import { send } from '@actual-app/core/platform/client/connection';
import type { AccountEntity } from '@actual-app/core/types/models';

import { useAuth } from '#auth/AuthProvider';
import { Permissions } from '#auth/types';
import { Warning } from '#components/alerts';
import { MOBILE_NAV_HEIGHT } from '#components/mobile/MobileNavTabs';
import { Page } from '#components/Page';
import { useMultiuserEnabled } from '#components/ServerContext';
import { useAccounts } from '#hooks/useAccounts';
import { useBankSyncProviders } from '#hooks/useBankSyncProviders';
import { useGlobalPref } from '#hooks/useGlobalPref';
import { useMetadataPref } from '#hooks/useMetadataPref';
import { popModal, pushModal } from '#modals/modalsSlice';
import { addNotification } from '#notifications/notificationsSlice';
import { useActualPlugins } from '#plugin/ActualPluginsProvider';
import { useDispatch } from '#redux';

import { AccountsHeader } from './AccountsHeader';
import { AccountsList } from './AccountsList';
import {
  getGroupedBankSyncEntries,
  getSyncSourceReadable,
  groupBankSyncAccounts,
} from './bankSyncUtils';
import { BuiltInProviders } from './BuiltInProviders';
import { ProviderSelectButton } from './ProviderSelectButton';
import { ProviderSetupGrid } from './ProviderSetupGrid';
import { useBuiltInBankSyncProviders } from './useBuiltInBankSyncProviders';
import { useProviderStatusMap } from './useProviderStatusMap';

export function BankSync() {
  const { t } = useTranslation();
  const [floatingSidebar] = useGlobalPref('floatingSidebar');
  const { data: accounts = [] } = useAccounts();
  const dispatch = useDispatch();
  const { isNarrowWidth } = useResponsive();
  const syncSourceReadable = useMemo(() => getSyncSourceReadable(t), [t]);
  const [cloudFileId] = useMetadataPref('cloudFileId');
  const fileId = cloudFileId ?? undefined;
  const { hasPermission } = useAuth();
  const multiuserEnabled = useMultiuserEnabled();
  const canManageProviders =
    !multiuserEnabled || hasPermission(Permissions.ADMINISTRATOR);
  const canConfigurePluginProviders = Boolean(fileId) && canManageProviders;

  const {
    providers,
    syncServerStatus,
    showPermissionWarning,
    providersNeedingConfiguration,
  } = useBuiltInBankSyncProviders();
  const { providers: pluginProviders } = useBankSyncProviders();
  const { bankSyncProviderLinks, bankSyncProviderSetups } = useActualPlugins();
  const { statusMap, refetch: refetchProviderStatuses } = useProviderStatusMap({
    providers: pluginProviders,
    fileId,
  });

  const openAccounts = useMemo(
    () => accounts.filter(account => !account.closed),
    [accounts],
  );

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

  async function configurePluginProvider({
    providerSlug,
    providerDisplayName,
  }: {
    providerSlug: string;
    providerDisplayName: string;
  }) {
    if (!fileId) {
      return;
    }

    const pluginSetup = bankSyncProviderSetups.get(providerSlug);
    if (pluginSetup) {
      dispatch(
        pushModal({
          modal: {
            name: 'plugin-modal',
            options: {
              modalProps: pluginSetup.modalProps,
              parameter: container => {
                console.debug('[bank-sync] rendering plugin setup modal', {
                  providerSlug,
                  providerDisplayName,
                  container,
                });

                return pluginSetup.renderSetup(
                  {
                    providerSlug,
                    providerDisplayName,
                    fileId,
                    callProvider: ({ path, method = 'POST', body }) =>
                      send('bank-sync-plugin-call', {
                        providerSlug,
                        path,
                        method,
                        body,
                        fileId,
                      }),
                    setSecret: ({ key, value }) =>
                      send('bank-sync-plugin-secret-set', {
                        providerSlug,
                        key,
                        value,
                        fileId,
                      }),
                    onSuccess: () => {
                      dispatch(popModal());
                      refetchProviderStatuses();
                    },
                    onError: error => {
                      dispatch(
                        addNotification({
                          notification: {
                            type: 'error',
                            title: t('Failed to configure provider'),
                            message:
                              error instanceof Error
                                ? error.message
                                : String(error),
                            timeout: 5000,
                          },
                        }),
                      );
                    },
                    close: () => dispatch(popModal()),
                  },
                  container,
                );
              },
            },
          },
        }),
      );
      return;
    }

    dispatch(
      pushModal({
        modal: {
          name: 'bank-sync-init',
          options: {
            providerSlug,
            providerDisplayName,
            onSuccess: async (credentials: Record<string, string>) => {
              try {
                const result = await send('bank-sync-plugin-call', {
                  providerSlug,
                  path: 'status',
                  method: 'POST',
                  body: credentials,
                  fileId,
                });

                if (
                  (result as any)?.status === 'error' ||
                  'error' in (result as any)
                ) {
                  await send('bank-sync-accounts', {
                    providerSlug,
                    credentials,
                    fileId,
                  });
                }

                refetchProviderStatuses();
              } catch (err) {
                dispatch(
                  addNotification({
                    notification: {
                      type: 'error',
                      title: t('Failed to configure provider'),
                      message: err instanceof Error ? err.message : String(err),
                      timeout: 5000,
                    },
                  }),
                );
              }
            },
          },
        },
      }),
    );
  }

  async function openPluginAccounts({
    providerSlug,
    providerDisplayName,
    upgradingAccountId,
  }: {
    providerSlug: string;
    providerDisplayName?: string;
    upgradingAccountId?: AccountEntity['id'];
  }) {
    if (!fileId) {
      return;
    }

    const pluginLink = bankSyncProviderLinks.get(providerSlug);
    if (pluginLink) {
      dispatch(
        pushModal({
          modal: {
            name: 'plugin-modal',
            options: {
              modalProps: pluginLink.modalProps,
              parameter: container => {
                return pluginLink.renderLink(
                  {
                    providerSlug,
                    providerDisplayName: providerDisplayName ?? providerSlug,
                    fileId,
                    upgradingAccountId,
                    callProvider: ({ path, method = 'POST', body }) =>
                      send('bank-sync-plugin-call', {
                        providerSlug,
                        path,
                        method,
                        body,
                        fileId,
                      }),
                    openExternalUrl: url => window.Actual.openURLInBrowser(url),
                    selectExternalAccounts: ({ externalAccounts, bankId }) => {
                      dispatch(popModal());
                      dispatch(
                        pushModal({
                          modal: {
                            name: 'select-linked-accounts',
                            options: {
                              externalAccounts,
                              syncSource: 'plugin' as const,
                              providerSlug,
                              bankId,
                              upgradingAccountId,
                            },
                          },
                        }),
                      );
                    },
                    onSuccess: () => {
                      dispatch(popModal());
                      refetchProviderStatuses();
                    },
                    onError: error => {
                      dispatch(
                        addNotification({
                          notification: {
                            type: 'error',
                            title: t('Error fetching accounts'),
                            message:
                              error instanceof Error
                                ? error.message
                                : String(error),
                            timeout: 5000,
                          },
                        }),
                      );
                    },
                    close: () => dispatch(popModal()),
                  },
                  container,
                );
              },
            },
          },
        }),
      );
      return;
    }

    try {
      const result = (await send('bank-sync-accounts', {
        providerSlug,
        fileId,
      })) as any;

      if (result?.error_code) {
        throw new Error(result.reason || result.error_code);
      }

      dispatch(
        pushModal({
          modal: {
            name: 'select-linked-accounts',
            options: {
              externalAccounts: result.accounts || [],
              syncSource: 'plugin' as const,
              providerSlug,
              upgradingAccountId,
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
  }

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

        {pluginProviders.length > 0 && (
          <View style={{ gap: 12 }}>
            <Text style={{ fontSize: 20, fontWeight: 600 }}>
              <Trans>Plugin providers</Trans>
            </Text>
            <ProviderSetupGrid
              providers={pluginProviders}
              statusMap={statusMap}
              canConfigure={canConfigurePluginProviders}
              onConfigure={({ provider }) =>
                configurePluginProvider({
                  providerSlug: provider.slug,
                  providerDisplayName: provider.displayName,
                })
              }
              onLink={({ provider }) =>
                openPluginAccounts({
                  providerSlug: provider.slug,
                  providerDisplayName: provider.displayName,
                })
              }
            />
            {!canManageProviders && (
              <Warning>
                <Trans>
                  You don&apos;t have the required permissions to configure bank
                  sync providers. Please contact an Admin to configure them.
                </Trans>
              </Warning>
            )}
          </View>
        )}

        {openAccounts.length === 0 && (
          <Text style={{ fontSize: '1.1rem' }}>
            <Trans>
              To use the bank syncing features, you must first add an account.
            </Trans>
          </Text>
        )}

        {groupedAccountEntries.map(([syncProvider, accounts]) => {
          const providerDisplayName =
            pluginProviders.find(p => p.slug === syncProvider)?.displayName ??
            syncSourceReadable[syncProvider] ??
            syncProvider;

          return (
            <View key={syncProvider} style={{ minHeight: 'initial' }}>
              {groupedAccountEntries.length > 1 && (
                <Text
                  style={{ fontWeight: 500, fontSize: 20, margin: '.5em 0' }}
                >
                  {providerDisplayName}
                </Text>
              )}
              <View style={styles.tableContainer}>
                <AccountsHeader unlinked={syncProvider === 'unlinked'} />
                <AccountsList
                  accounts={accounts}
                  hoveredAccount={hoveredAccount}
                  onHover={onHover}
                  onAction={onAction}
                  renderLinkButton={account =>
                    pluginProviders.length > 0 ? (
                      <ProviderSelectButton
                        label={t('Link plugin account')}
                        providers={pluginProviders}
                        statusMap={statusMap}
                        isDisabled={!fileId}
                        onSelect={({ providerSlug }) =>
                          openPluginAccounts({
                            providerSlug,
                            providerDisplayName:
                              pluginProviders.find(p => p.slug === providerSlug)
                                ?.displayName,
                            upgradingAccountId: account.id,
                          })
                        }
                      />
                    ) : null
                  }
                />
              </View>
            </View>
          );
        })}
      </View>
    </Page>
  );
}
