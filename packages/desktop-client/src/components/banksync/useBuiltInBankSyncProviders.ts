import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { send } from 'loot-core/platform/client/connection';
import type { BankSyncProviders } from 'loot-core/types/models';
import type { SyncServerSimpleFinAccount } from 'loot-core/types/models/simplefin';

import { BUILT_IN_BANK_SYNC_PROVIDERS } from './bankSyncUtils';

import { useAuth } from '@desktop-client/auth/AuthProvider';
import { Permissions } from '@desktop-client/auth/types';
import { useMultiuserEnabled } from '@desktop-client/components/ServerContext';
import { authorizeBank } from '@desktop-client/gocardless';
import { useGoCardlessStatus } from '@desktop-client/hooks/useGoCardlessStatus';
import { usePluggyAiStatus } from '@desktop-client/hooks/usePluggyAiStatus';
import { useSimpleFinStatus } from '@desktop-client/hooks/useSimpleFinStatus';
import { useSyncServerStatus } from '@desktop-client/hooks/useSyncServerStatus';
import { pushModal } from '@desktop-client/modals/modalsSlice';
import { addNotification } from '@desktop-client/notifications/notificationsSlice';
import { useDispatch } from '@desktop-client/redux';

type ProviderAction = () => void | Promise<void>;

type SimpleFinAccount = {
  id: string;
  name: string;
  balance: number;
  org: {
    name: string;
    domain: string;
    id: string;
  };
};

type PluggyAiAccount = {
  id: string;
  name: string;
  type: 'BANK' | string;
  taxNumber: string;
  owner: string;
  balance: number;
  bankData: {
    automaticallyInvestedBalance: number;
    closingBalance: number;
  };
};

export type BuiltInBankSyncProviderState = {
  id: BankSyncProviders;
  displayName: string;
  description: string;
  isConfigured: boolean;
  canConfigure: boolean;
  isLoading?: boolean;
  onConfigure: ProviderAction;
  onLink: ProviderAction;
  onReset: ProviderAction;
};

export function useBuiltInBankSyncProviders() {
  const { t } = useTranslation();
  const dispatch = useDispatch();
  const syncServerStatus = useSyncServerStatus();
  const { hasPermission } = useAuth();
  const multiuserEnabled = useMultiuserEnabled();
  const canConfigureProviders =
    !multiuserEnabled || hasPermission(Permissions.ADMINISTRATOR);

  const [isGoCardlessSetupComplete, setIsGoCardlessSetupComplete] = useState<
    boolean | null
  >(null);
  const [isSimpleFinSetupComplete, setIsSimpleFinSetupComplete] = useState<
    boolean | null
  >(null);
  const [isPluggyAiSetupComplete, setIsPluggyAiSetupComplete] = useState<
    boolean | null
  >(null);
  const [loadingSimpleFinAccounts, setLoadingSimpleFinAccounts] =
    useState(false);

  const { configuredGoCardless } = useGoCardlessStatus();
  const { configuredSimpleFin } = useSimpleFinStatus();
  const { configuredPluggyAi } = usePluggyAiStatus();

  useEffect(() => {
    setIsGoCardlessSetupComplete(configuredGoCardless);
  }, [configuredGoCardless]);

  useEffect(() => {
    setIsSimpleFinSetupComplete(configuredSimpleFin);
  }, [configuredSimpleFin]);

  useEffect(() => {
    setIsPluggyAiSetupComplete(configuredPluggyAi);
  }, [configuredPluggyAi]);

  const onGoCardlessInit = useCallback(() => {
    dispatch(
      pushModal({
        modal: {
          name: 'gocardless-init',
          options: {
            onSuccess: () => setIsGoCardlessSetupComplete(true),
          },
        },
      }),
    );
  }, [dispatch]);

  const onSimpleFinInit = useCallback(() => {
    dispatch(
      pushModal({
        modal: {
          name: 'simplefin-init',
          options: {
            onSuccess: () => setIsSimpleFinSetupComplete(true),
          },
        },
      }),
    );
  }, [dispatch]);

  const onPluggyAiInit = useCallback(() => {
    dispatch(
      pushModal({
        modal: {
          name: 'pluggyai-init',
          options: {
            onSuccess: () => setIsPluggyAiSetupComplete(true),
          },
        },
      }),
    );
  }, [dispatch]);

  const onGoCardlessReset = useCallback(() => {
    void send('secret-set', {
      name: 'gocardless_secretId',
      value: null,
    }).then(() => {
      void send('secret-set', {
        name: 'gocardless_secretKey',
        value: null,
      }).then(() => {
        setIsGoCardlessSetupComplete(false);
      });
    });
  }, []);

  const onSimpleFinReset = useCallback(() => {
    void send('secret-set', {
      name: 'simplefin_token',
      value: null,
    }).then(() => {
      void send('secret-set', {
        name: 'simplefin_accessKey',
        value: null,
      }).then(() => {
        setIsSimpleFinSetupComplete(false);
      });
    });
  }, []);

  const onPluggyAiReset = useCallback(() => {
    void send('secret-set', {
      name: 'pluggyai_clientId',
      value: null,
    }).then(() => {
      void send('secret-set', {
        name: 'pluggyai_clientSecret',
        value: null,
      }).then(() => {
        void send('secret-set', {
          name: 'pluggyai_itemIds',
          value: null,
        }).then(() => {
          setIsPluggyAiSetupComplete(false);
        });
      });
    });
  }, []);

  const onConnectGoCardless = useCallback(() => {
    if (!isGoCardlessSetupComplete) {
      onGoCardlessInit();
      return;
    }

    void authorizeBank(dispatch);
  }, [dispatch, isGoCardlessSetupComplete, onGoCardlessInit]);

  const onConnectSimpleFin = useCallback(async () => {
    if (!isSimpleFinSetupComplete) {
      onSimpleFinInit();
      return;
    }

    if (loadingSimpleFinAccounts) {
      return;
    }

    setLoadingSimpleFinAccounts(true);

    try {
      const results = await send('simplefin-accounts');
      if (results.error_code) {
        throw new Error(results.reason);
      }

      const externalAccounts: SyncServerSimpleFinAccount[] = (
        (results.accounts ?? []) as SimpleFinAccount[]
      ).map(oldAccount => ({
        account_id: oldAccount.id,
        name: oldAccount.name,
        institution: oldAccount.org.name,
        orgDomain: oldAccount.org.domain,
        orgId: oldAccount.org.id,
        balance: oldAccount.balance,
      }));

      dispatch(
        pushModal({
          modal: {
            name: 'select-linked-accounts',
            options: {
              externalAccounts,
              syncSource: 'simpleFin',
            },
          },
        }),
      );
    } catch {
      onSimpleFinInit();
    } finally {
      setLoadingSimpleFinAccounts(false);
    }
  }, [
    dispatch,
    isSimpleFinSetupComplete,
    loadingSimpleFinAccounts,
    onSimpleFinInit,
  ]);

  const onConnectPluggyAi = useCallback(async () => {
    if (!isPluggyAiSetupComplete) {
      onPluggyAiInit();
      return;
    }

    try {
      const results = await send('pluggyai-accounts');
      if (results.error_code) {
        throw new Error(results.reason);
      }
      if ('error' in results) {
        throw new Error(results.error);
      }

      const externalAccounts = (results.accounts as PluggyAiAccount[]).map(
        oldAccount => ({
          account_id: oldAccount.id,
          name: `${oldAccount.name.trim()} - ${
            oldAccount.type === 'BANK' ? oldAccount.taxNumber : oldAccount.owner
          }`,
          institution: oldAccount.name,
          orgDomain: null,
          orgId: oldAccount.id,
          balance:
            oldAccount.type === 'BANK'
              ? oldAccount.bankData.automaticallyInvestedBalance +
                oldAccount.bankData.closingBalance
              : oldAccount.balance,
        }),
      );

      dispatch(
        pushModal({
          modal: {
            name: 'select-linked-accounts',
            options: {
              externalAccounts,
              syncSource: 'pluggyai',
            },
          },
        }),
      );
    } catch (error) {
      dispatch(
        addNotification({
          notification: {
            type: 'error',
            title: t('Error when trying to contact Pluggy.ai'),
            message: error instanceof Error ? error.message : String(error),
            timeout: 5000,
          },
        }),
      );
      onPluggyAiInit();
    }
  }, [dispatch, isPluggyAiSetupComplete, onPluggyAiInit, t]);

  const configuredProviders = {
    goCardless: Boolean(isGoCardlessSetupComplete),
    simpleFin: Boolean(isSimpleFinSetupComplete),
    pluggyai: Boolean(isPluggyAiSetupComplete),
  } satisfies Record<BankSyncProviders, boolean>;

  const providers = useMemo<BuiltInBankSyncProviderState[]>(
    () =>
      BUILT_IN_BANK_SYNC_PROVIDERS.map(providerId => {
        if (providerId === 'goCardless') {
          return {
            id: providerId,
            displayName: 'GoCardless',
            description: t(
              'Link a European bank account to automatically download transactions.',
            ),
            isConfigured: configuredProviders.goCardless,
            canConfigure: canConfigureProviders,
            onConfigure: onGoCardlessInit,
            onLink: onConnectGoCardless,
            onReset: onGoCardlessReset,
          };
        }

        if (providerId === 'simpleFin') {
          return {
            id: providerId,
            displayName: 'SimpleFIN',
            description: t(
              'Link a North American bank account to automatically download transactions.',
            ),
            isConfigured: configuredProviders.simpleFin,
            canConfigure: canConfigureProviders,
            isLoading: loadingSimpleFinAccounts,
            onConfigure: onSimpleFinInit,
            onLink: onConnectSimpleFin,
            onReset: onSimpleFinReset,
          };
        }

        return {
          id: providerId,
          displayName: 'Pluggy.ai',
          description: t(
            'Link a Brazilian bank account to automatically download transactions.',
          ),
          isConfigured: configuredProviders.pluggyai,
          canConfigure: canConfigureProviders,
          onConfigure: onPluggyAiInit,
          onLink: onConnectPluggyAi,
          onReset: onPluggyAiReset,
        };
      }),
    [
      canConfigureProviders,
      configuredProviders.goCardless,
      configuredProviders.pluggyai,
      configuredProviders.simpleFin,
      loadingSimpleFinAccounts,
      onConnectGoCardless,
      onConnectPluggyAi,
      onConnectSimpleFin,
      onGoCardlessInit,
      onGoCardlessReset,
      onPluggyAiInit,
      onPluggyAiReset,
      onSimpleFinInit,
      onSimpleFinReset,
      t,
    ],
  );

  const providersNeedingConfiguration = providers.filter(
    provider => !provider.isConfigured,
  );

  return {
    providers,
    syncServerStatus,
    canConfigureProviders,
    showPermissionWarning:
      providersNeedingConfiguration.length > 0 && !canConfigureProviders,
    providersNeedingConfiguration,
  };
}
