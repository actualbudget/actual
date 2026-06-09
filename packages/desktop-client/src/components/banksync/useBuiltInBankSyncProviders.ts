import { useCallback, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { send } from '@actual-app/core/platform/client/connection';
import type { RemoteFile, SyncedLocalFile } from '@actual-app/core/types/file';
import type {
  AccountEntity,
  BankSyncCredentialSource,
  BankSyncProviders,
  BankSyncProviderStatus,
} from '@actual-app/core/types/models';
import type { SyncServerSimpleFinAccount } from '@actual-app/core/types/models/simplefin';

import { useAuth } from '#auth/AuthProvider';
import { Permissions } from '#auth/types';
import { useMultiuserEnabled } from '#components/ServerContext';
import { authorizeBank as authorizeEnableBanking } from '#enablebanking';
import { authorizeBank } from '#gocardless';
import { useAkahuStatus } from '#hooks/useAkahuStatus';
import { useEnableBankingStatus } from '#hooks/useEnableBankingStatus';
import { useFeatureFlag } from '#hooks/useFeatureFlag';
import { useGoCardlessStatus } from '#hooks/useGoCardlessStatus';
import { useMetadataPref } from '#hooks/useMetadataPref';
import { usePluggyAiStatus } from '#hooks/usePluggyAiStatus';
import { useSimpleFinStatus } from '#hooks/useSimpleFinStatus';
import { useSyncServerStatus } from '#hooks/useSyncServerStatus';
import { pushModal } from '#modals/modalsSlice';
import { addNotification } from '#notifications/notificationsSlice';
import { useDispatch, useSelector } from '#redux';

import { BUILT_IN_BANK_SYNC_PROVIDERS } from './bankSyncUtils';

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
  credentialSource: BankSyncCredentialSource | null;
  canConfigure: boolean;
  isLoading?: boolean;
  onConfigure: ProviderAction;
  onLink: ProviderAction;
  onReset: ProviderAction;
};

type SecretSetResponse = {
  error?: string | { message?: string };
  error_code?: string;
  reason?: string;
};

type UseBuiltInBankSyncProvidersOptions = {
  upgradingAccountId?: AccountEntity['id'];
};

function isProviderConfigured(status: BankSyncProviderStatus | null): boolean {
  return Boolean(status?.source ?? status?.configured);
}

async function ensureSuccessResponse(
  response: SecretSetResponse | undefined,
  fallbackMessage: string,
) {
  if (response?.error_code) {
    throw new Error(response.reason || response.error_code);
  }

  if (response?.error) {
    const errorMessage =
      typeof response.error === 'string'
        ? response.error
        : response.error.message;
    throw new Error(response.reason || errorMessage || fallbackMessage);
  }
}

export function useBuiltInBankSyncProviders({
  upgradingAccountId,
}: UseBuiltInBankSyncProvidersOptions = {}) {
  const { t } = useTranslation();
  const dispatch = useDispatch();
  const syncServerStatus = useSyncServerStatus();
  const [metadataFileId] = useMetadataPref('cloudFileId');
  const budgetFileId = metadataFileId ?? '';
  const { hasPermission } = useAuth();
  const userData = useSelector(state => state.user.data);
  const allFiles = useSelector(state => state.budgetfiles.allFiles || []);
  const remoteFiles = allFiles.filter(
    (file): file is SyncedLocalFile | RemoteFile =>
      file.state === 'remote' ||
      file.state === 'synced' ||
      file.state === 'detached',
  );
  const currentFile = remoteFiles.find(
    file => file.cloudFileId === budgetFileId,
  );
  const multiuserEnabled = useMultiuserEnabled();
  const isAdmin = hasPermission(Permissions.ADMINISTRATOR);
  const isCurrentFileOwner = Boolean(
    userData?.userId &&
    currentFile &&
    (currentFile.owner === userData.userId ||
      currentFile.usersWithAccess.some(
        user => user.owner && user.userId === userData.userId,
      )),
  );
  const canManageProviders = !multiuserEnabled || isAdmin || isCurrentFileOwner;
  const canConfigureProviders = Boolean(budgetFileId) && canManageProviders;
  const canSetGlobalCredentials = !multiuserEnabled || isAdmin;

  const [loadingSimpleFinAccounts, setLoadingSimpleFinAccounts] =
    useState(false);
  const [loadingAkahuAccounts, setLoadingAkahuAccounts] = useState(false);

  const enableBankingEnabled = useFeatureFlag('enableBanking');
  const akahuEnabled = useFeatureFlag('akahuBankSync');
  const { goCardlessStatus, refreshGoCardlessStatus } =
    useGoCardlessStatus(budgetFileId);
  const { simpleFinStatus, refreshSimpleFinStatus } =
    useSimpleFinStatus(budgetFileId);
  const { pluggyAiStatus, refreshPluggyAiStatus } =
    usePluggyAiStatus(budgetFileId);
  const { akahuStatus, refreshAkahuStatus } = useAkahuStatus(
    budgetFileId,
    akahuEnabled,
  );
  const {
    enableBankingStatus,
    refreshEnableBankingStatus,
    isLoading: isEnableBankingLoading,
  } = useEnableBankingStatus(budgetFileId, enableBankingEnabled);

  const onGoCardlessInit = useCallback(() => {
    dispatch(
      pushModal({
        modal: {
          name: 'gocardless-init',
          options: {
            onSuccess: () => {
              void refreshGoCardlessStatus();
            },
            fileId: budgetFileId,
            canSetGlobalCredentials,
            credentialSource: goCardlessStatus?.source ?? null,
          },
        },
      }),
    );
  }, [
    budgetFileId,
    canSetGlobalCredentials,
    dispatch,
    goCardlessStatus,
    refreshGoCardlessStatus,
  ]);

  const onSimpleFinInit = useCallback(() => {
    dispatch(
      pushModal({
        modal: {
          name: 'simplefin-init',
          options: {
            onSuccess: () => {
              void refreshSimpleFinStatus();
            },
            fileId: budgetFileId,
            canSetGlobalCredentials,
            credentialSource: simpleFinStatus?.source ?? null,
          },
        },
      }),
    );
  }, [
    budgetFileId,
    canSetGlobalCredentials,
    dispatch,
    refreshSimpleFinStatus,
    simpleFinStatus,
  ]);

  const onPluggyAiInit = useCallback(() => {
    dispatch(
      pushModal({
        modal: {
          name: 'pluggyai-init',
          options: {
            onSuccess: () => {
              void refreshPluggyAiStatus();
            },
            fileId: budgetFileId,
            canSetGlobalCredentials,
            credentialSource: pluggyAiStatus?.source ?? null,
          },
        },
      }),
    );
  }, [
    budgetFileId,
    canSetGlobalCredentials,
    dispatch,
    pluggyAiStatus,
    refreshPluggyAiStatus,
  ]);

  const onEnableBankingInit = useCallback(() => {
    dispatch(
      pushModal({
        modal: {
          name: 'enablebanking-init',
          options: {
            onSuccess: () => {
              void refreshEnableBankingStatus();
            },
            fileId: budgetFileId,
            canSetGlobalCredentials,
            credentialSource: enableBankingStatus?.source ?? null,
          },
        },
      }),
    );
  }, [
    budgetFileId,
    canSetGlobalCredentials,
    dispatch,
    enableBankingStatus,
    refreshEnableBankingStatus,
  ]);

  const onAkahuInit = useCallback(() => {
    dispatch(
      pushModal({
        modal: {
          name: 'akahu-init',
          options: {
            onSuccess: () => {
              void refreshAkahuStatus();
            },
            fileId: budgetFileId,
            canSetGlobalCredentials,
            credentialSource: akahuStatus?.source ?? null,
          },
        },
      }),
    );
  }, [
    akahuStatus,
    budgetFileId,
    canSetGlobalCredentials,
    dispatch,
    refreshAkahuStatus,
  ]);

  const notifyResetFailure = useCallback(
    (providerName: string, error: unknown) => {
      dispatch(
        addNotification({
          notification: {
            type: 'error',
            title: t('Failed to reset {{provider}}', {
              provider: providerName,
            }),
            message: error instanceof Error ? error.message : String(error),
            timeout: 5000,
          },
        }),
      );
    },
    [dispatch, t],
  );

  const onGoCardlessReset = useCallback(async () => {
    try {
      await ensureSuccessResponse(
        await send('secret-set', {
          name: 'gocardless_secretId',
          value: null,
          fileId: budgetFileId,
        }),
        'Failed to clear GoCardless secret ID',
      );
      await ensureSuccessResponse(
        await send('secret-set', {
          name: 'gocardless_secretKey',
          value: null,
          fileId: budgetFileId,
        }),
        'Failed to clear GoCardless secret key',
      );
      await refreshGoCardlessStatus();
    } catch (error) {
      notifyResetFailure('GoCardless', error);
    }
  }, [budgetFileId, notifyResetFailure, refreshGoCardlessStatus]);

  const onSimpleFinReset = useCallback(async () => {
    try {
      await ensureSuccessResponse(
        await send('secret-set', {
          name: 'simplefin_token',
          value: null,
          fileId: budgetFileId,
        }),
        'Failed to clear SimpleFIN token',
      );
      await ensureSuccessResponse(
        await send('secret-set', {
          name: 'simplefin_accessKey',
          value: null,
          fileId: budgetFileId,
        }),
        'Failed to clear SimpleFIN access key',
      );
      await refreshSimpleFinStatus();
    } catch (error) {
      notifyResetFailure('SimpleFIN', error);
    }
  }, [budgetFileId, notifyResetFailure, refreshSimpleFinStatus]);

  const onPluggyAiReset = useCallback(async () => {
    try {
      await ensureSuccessResponse(
        await send('secret-set', {
          name: 'pluggyai_clientId',
          value: null,
          fileId: budgetFileId,
        }),
        'Failed to clear Pluggy.ai client ID',
      );
      await ensureSuccessResponse(
        await send('secret-set', {
          name: 'pluggyai_clientSecret',
          value: null,
          fileId: budgetFileId,
        }),
        'Failed to clear Pluggy.ai client secret',
      );
      await ensureSuccessResponse(
        await send('secret-set', {
          name: 'pluggyai_itemIds',
          value: null,
          fileId: budgetFileId,
        }),
        'Failed to clear Pluggy.ai item IDs',
      );
      await refreshPluggyAiStatus();
    } catch (error) {
      notifyResetFailure('Pluggy.ai', error);
    }
  }, [budgetFileId, notifyResetFailure, refreshPluggyAiStatus]);

  const onEnableBankingReset = useCallback(async () => {
    try {
      await ensureSuccessResponse(
        await send('secret-set', {
          name: 'enablebanking_applicationId',
          value: null,
          fileId: budgetFileId,
        }),
        'Failed to clear Enable Banking application ID',
      );
      await ensureSuccessResponse(
        await send('secret-set', {
          name: 'enablebanking_secretKey',
          value: null,
          fileId: budgetFileId,
        }),
        'Failed to clear Enable Banking secret key',
      );
      await refreshEnableBankingStatus();
    } catch (error) {
      notifyResetFailure('Enable Banking', error);
    }
  }, [budgetFileId, notifyResetFailure, refreshEnableBankingStatus]);

  const onAkahuReset = useCallback(async () => {
    try {
      await ensureSuccessResponse(
        await send('secret-set', {
          name: 'akahu_userToken',
          value: null,
          fileId: budgetFileId,
        }),
        'Failed to clear Akahu user token',
      );
      await ensureSuccessResponse(
        await send('secret-set', {
          name: 'akahu_appToken',
          value: null,
          fileId: budgetFileId,
        }),
        'Failed to clear Akahu app token',
      );
      await refreshAkahuStatus();
    } catch (error) {
      notifyResetFailure('Akahu', error);
    }
  }, [budgetFileId, notifyResetFailure, refreshAkahuStatus]);

  const onConnectGoCardless = useCallback(() => {
    if (!isProviderConfigured(goCardlessStatus)) {
      onGoCardlessInit();
      return;
    }

    void authorizeBank(dispatch, budgetFileId, upgradingAccountId);
  }, [
    budgetFileId,
    dispatch,
    goCardlessStatus,
    onGoCardlessInit,
    upgradingAccountId,
  ]);

  const onConnectSimpleFin = useCallback(async () => {
    if (!isProviderConfigured(simpleFinStatus)) {
      onSimpleFinInit();
      return;
    }

    if (loadingSimpleFinAccounts) {
      return;
    }

    setLoadingSimpleFinAccounts(true);

    try {
      const results = await send('simplefin-accounts', {
        fileId: budgetFileId,
      });
      if (results.error_code) {
        throw new Error(results.reason);
      }
      if ('error' in results && results.error) {
        throw new Error(results.reason || results.error);
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
              upgradingAccountId,
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
    budgetFileId,
    dispatch,
    simpleFinStatus,
    loadingSimpleFinAccounts,
    onSimpleFinInit,
    upgradingAccountId,
  ]);

  const onConnectEnableBanking = useCallback(async () => {
    if (!isProviderConfigured(enableBankingStatus)) {
      onEnableBankingInit();
      return;
    }

    try {
      await authorizeEnableBanking(dispatch, budgetFileId, upgradingAccountId);
    } catch (error) {
      dispatch(
        addNotification({
          notification: {
            type: 'error',
            title: t('Error when trying to contact Enable Banking'),
            message: error instanceof Error ? error.message : String(error),
            timeout: 5000,
          },
        }),
      );
      onEnableBankingInit();
    }
  }, [
    dispatch,
    budgetFileId,
    enableBankingStatus,
    onEnableBankingInit,
    t,
    upgradingAccountId,
  ]);

  const onConnectPluggyAi = useCallback(async () => {
    if (!isProviderConfigured(pluggyAiStatus)) {
      onPluggyAiInit();
      return;
    }

    try {
      const results = await send('pluggyai-accounts', { fileId: budgetFileId });
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
              upgradingAccountId,
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
  }, [
    budgetFileId,
    dispatch,
    pluggyAiStatus,
    onPluggyAiInit,
    t,
    upgradingAccountId,
  ]);

  const onConnectAkahu = useCallback(async () => {
    if (!isProviderConfigured(akahuStatus)) {
      onAkahuInit();
      return;
    }

    if (loadingAkahuAccounts) {
      return;
    }

    setLoadingAkahuAccounts(true);

    try {
      const results = await send('akahu-accounts', { fileId: budgetFileId });
      if (results.error_code) {
        throw new Error(results.reason);
      }
      if ('error' in results && results.error) {
        throw new Error(results.reason || results.error);
      }

      const newAccounts = [];

      type NormalizedAccount = {
        account_id: string;
        name: string;
        institution: string;
        orgDomain: string;
        orgId: string;
        balance: number;
      };

      for (const oldAccount of results.accounts ?? []) {
        const newAccount: NormalizedAccount = {
          account_id: oldAccount._id,
          name: oldAccount.name,
          institution: oldAccount.connection.name,
          orgDomain: oldAccount.connection.name,
          orgId: oldAccount.connection._id,
          balance: oldAccount.balance.current,
        };

        newAccounts.push(newAccount);
      }

      dispatch(
        pushModal({
          modal: {
            name: 'select-linked-accounts',
            options: {
              externalAccounts: newAccounts,
              syncSource: 'akahu',
              upgradingAccountId,
            },
          },
        }),
      );
    } catch (error) {
      dispatch(
        addNotification({
          notification: {
            type: 'error',
            title: t('Error when trying to contact Akahu'),
            message: error instanceof Error ? error.message : String(error),
            timeout: 5000,
          },
        }),
      );
      onAkahuInit();
    }

    setLoadingAkahuAccounts(false);
  }, [
    dispatch,
    budgetFileId,
    akahuStatus,
    loadingAkahuAccounts,
    onAkahuInit,
    upgradingAccountId,
    t,
  ]);

  const configuredProviders = {
    goCardless: isProviderConfigured(goCardlessStatus),
    simpleFin: isProviderConfigured(simpleFinStatus),
    pluggyai: isProviderConfigured(pluggyAiStatus),
    enableBanking: isProviderConfigured(enableBankingStatus),
    akahu: isProviderConfigured(akahuStatus),
  } satisfies Record<BankSyncProviders, boolean>;

  const credentialSources = useMemo(
    () =>
      ({
        goCardless: goCardlessStatus?.source ?? null,
        simpleFin: simpleFinStatus?.source ?? null,
        pluggyai: pluggyAiStatus?.source ?? null,
        enableBanking: enableBankingStatus?.source ?? null,
        akahu: akahuStatus?.source ?? null,
      }) satisfies Record<BankSyncProviders, BankSyncCredentialSource | null>,
    [
      akahuStatus,
      enableBankingStatus,
      goCardlessStatus,
      pluggyAiStatus,
      simpleFinStatus,
    ],
  );

  const providers = useMemo<BuiltInBankSyncProviderState[]>(() => {
    const canConfigureProvider = (providerId: BankSyncProviders) =>
      canConfigureProviders &&
      (!canSetGlobalCredentials || credentialSources[providerId] !== 'global');

    const baseProviders: BuiltInBankSyncProviderState[] =
      BUILT_IN_BANK_SYNC_PROVIDERS.map(providerId => {
        if (providerId === 'goCardless') {
          return {
            id: providerId,
            displayName: 'GoCardless',
            description: t(
              'Link a European bank account to automatically download transactions.',
            ),
            isConfigured: configuredProviders.goCardless,
            credentialSource: credentialSources.goCardless,
            canConfigure: canConfigureProvider(providerId),
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
            credentialSource: credentialSources.simpleFin,
            canConfigure: canConfigureProvider(providerId),
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
          credentialSource: credentialSources.pluggyai,
          canConfigure: canConfigureProvider(providerId),
          onConfigure: onPluggyAiInit,
          onLink: onConnectPluggyAi,
          onReset: onPluggyAiReset,
        };
      });

    if (akahuEnabled) {
      baseProviders.push({
        id: 'akahu',
        displayName: 'Akahu',
        description: t(
          'Link a New Zealand bank account to automatically download transactions.',
        ),
        isConfigured: configuredProviders.akahu,
        credentialSource: credentialSources.akahu,
        canConfigure: canConfigureProvider('akahu'),
        isLoading: loadingAkahuAccounts,
        onConfigure: onAkahuInit,
        onLink: onConnectAkahu,
        onReset: onAkahuReset,
      });
    }

    if (enableBankingEnabled) {
      baseProviders.push({
        id: 'enableBanking',
        displayName: 'Enable Banking',
        description: t(
          'Link a European bank account via Enable Banking, a free alternative to GoCardless for PSD2-supported banks.',
        ),
        isConfigured: configuredProviders.enableBanking,
        credentialSource: credentialSources.enableBanking,
        canConfigure: canConfigureProvider('enableBanking'),
        isLoading: isEnableBankingLoading,
        onConfigure: onEnableBankingInit,
        onLink: onConnectEnableBanking,
        onReset: onEnableBankingReset,
      });
    }

    return baseProviders;
  }, [
    canConfigureProviders,
    canSetGlobalCredentials,
    configuredProviders.enableBanking,
    configuredProviders.goCardless,
    configuredProviders.pluggyai,
    configuredProviders.simpleFin,
    configuredProviders.akahu,
    credentialSources,
    enableBankingEnabled,
    akahuEnabled,
    isEnableBankingLoading,
    loadingSimpleFinAccounts,
    loadingAkahuAccounts,
    onConnectAkahu,
    onConnectEnableBanking,
    onConnectGoCardless,
    onConnectPluggyAi,
    onConnectSimpleFin,
    onAkahuInit,
    onAkahuReset,
    onEnableBankingInit,
    onEnableBankingReset,
    onGoCardlessInit,
    onGoCardlessReset,
    onPluggyAiInit,
    onPluggyAiReset,
    onSimpleFinInit,
    onSimpleFinReset,
    t,
  ]);

  const providersNeedingConfiguration = providers.filter(
    provider => !provider.isConfigured,
  );

  return {
    providers,
    syncServerStatus,
    canConfigureProviders,
    showPermissionWarning:
      providersNeedingConfiguration.length > 0 && !canManageProviders,
    providersNeedingConfiguration,
  };
}
