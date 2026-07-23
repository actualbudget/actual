import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { send } from '@actual-app/core/platform/client/connection';
import type {
  AccountEntity,
  BankSyncCredentialSource,
  BankSyncProviders,
} from '@actual-app/core/types/models';
import type { SyncServerSimpleFinAccount } from '@actual-app/core/types/models/simplefin';

import { authorizeBank as authorizeEnableBanking } from '#enablebanking';
import { authorizeBank } from '#gocardless';
import { useAkahuStatus } from '#hooks/useAkahuStatus';
import { useCurrentAccess } from '#hooks/useCurrentAccess';
import { useEnableBankingStatus } from '#hooks/useEnableBankingStatus';
import { useFeatureFlag } from '#hooks/useFeatureFlag';
import { useGoCardlessStatus } from '#hooks/useGoCardlessStatus';
import { usePluggyAiStatus } from '#hooks/usePluggyAiStatus';
import { useSimpleFinStatus } from '#hooks/useSimpleFinStatus';
import { useSyncServerStatus } from '#hooks/useSyncServerStatus';
import { pushModal } from '#modals/modalsSlice';
import { addNotification } from '#notifications/notificationsSlice';
import { useDispatch } from '#redux';

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
  credentialSource: BankSyncCredentialSource;
  supportsPerBudgetFile: boolean;
  canConfigure: boolean;
  isLoading?: boolean;
  onConfigure: ProviderAction;
  onLink: ProviderAction;
  onReset: ProviderAction;
};

type SecretSetResponse = {
  error?: string;
  error_code?: string;
  reason?: string;
};

type UseBuiltInBankSyncProvidersOptions = {
  upgradingAccountId?: AccountEntity['id'];
};

export function getPermissionWarning(
  syncServerStatus: 'offline' | 'no-server' | 'online',
  isAdmin: boolean,
  isFileOwner: boolean,
): 'general' | 'file-owner' | null {
  if (syncServerStatus !== 'online') {
    return null;
  }

  if (isAdmin) {
    return null;
  }

  return isFileOwner ? 'file-owner' : 'general';
}

async function ensureSuccessResponse(
  response: SecretSetResponse,
  fallbackMessage: string,
) {
  if (response?.error_code) {
    throw new Error(response.reason || response.error_code);
  }

  if (response?.error) {
    throw new Error(response.reason || response.error || fallbackMessage);
  }
}

export function useBuiltInBankSyncProviders({
  upgradingAccountId,
}: UseBuiltInBankSyncProvidersOptions = {}) {
  const { t } = useTranslation();
  const dispatch = useDispatch();
  const syncServerStatus = useSyncServerStatus();
  const { cloudFileId, isAdmin, isFileOwner } = useCurrentAccess();
  const canConfigureProviders = isAdmin;

  const [isGoCardlessSetupComplete, setIsGoCardlessSetupComplete] = useState<
    boolean | null
  >(null);
  const [isSimpleFinSetupComplete, setIsSimpleFinSetupComplete] = useState<
    boolean | null
  >(null);
  const [isEnableBankingSetupComplete, setIsEnableBankingSetupComplete] =
    useState<boolean | null>(null);
  const [isAkahuSetupComplete, setIsAkahuSetupComplete] = useState<
    boolean | null
  >(null);
  const [loadingSimpleFinAccounts, setLoadingSimpleFinAccounts] =
    useState(false);
  const [loadingAkahuAccounts, setLoadingAkahuAccounts] = useState(false);

  const enableBankingEnabled = useFeatureFlag('enableBanking');
  const akahuEnabled = useFeatureFlag('akahuBankSync');
  const { configuredGoCardless } = useGoCardlessStatus();
  const { configuredSimpleFin } = useSimpleFinStatus();
  const { pluggyAiStatus, setPluggyAiStatus } = usePluggyAiStatus();
  const { configuredAkahu } = useAkahuStatus(akahuEnabled);
  const { configuredEnableBanking, isLoading: isEnableBankingLoading } =
    useEnableBankingStatus(enableBankingEnabled);

  useEffect(() => {
    setIsGoCardlessSetupComplete(configuredGoCardless);
  }, [configuredGoCardless]);

  useEffect(() => {
    setIsSimpleFinSetupComplete(configuredSimpleFin);
  }, [configuredSimpleFin]);

  useEffect(() => {
    setIsEnableBankingSetupComplete(configuredEnableBanking);
  }, [configuredEnableBanking]);

  useEffect(() => {
    setIsAkahuSetupComplete(configuredAkahu);
  }, [configuredAkahu]);

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
            onSuccess: perBudgetFile => {
              setPluggyAiStatus({
                configured: true,
                source: perBudgetFile ? 'per-budget-file' : 'global',
              });
            },
            credentialSource: pluggyAiStatus.source ?? 'global',
          },
        },
      }),
    );
  }, [dispatch, pluggyAiStatus.source, setPluggyAiStatus]);

  const onEnableBankingInit = useCallback(() => {
    dispatch(
      pushModal({
        modal: {
          name: 'enablebanking-init',
          options: {
            onSuccess: () => setIsEnableBankingSetupComplete(true),
          },
        },
      }),
    );
  }, [dispatch]);

  const onAkahuInit = useCallback(() => {
    dispatch(
      pushModal({
        modal: {
          name: 'akahu-init',
          options: {
            onSuccess: () => setIsAkahuSetupComplete(true),
          },
        },
      }),
    );
  }, [dispatch]);

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
        }),
        'Failed to clear GoCardless secret ID',
      );
      await ensureSuccessResponse(
        await send('secret-set', {
          name: 'gocardless_secretKey',
          value: null,
        }),
        'Failed to clear GoCardless secret key',
      );
      setIsGoCardlessSetupComplete(false);
    } catch (error) {
      notifyResetFailure('GoCardless', error);
    }
  }, [notifyResetFailure]);

  const onSimpleFinReset = useCallback(async () => {
    try {
      await ensureSuccessResponse(
        await send('secret-set', {
          name: 'simplefin_token',
          value: null,
        }),
        'Failed to clear SimpleFIN token',
      );
      await ensureSuccessResponse(
        await send('secret-set', {
          name: 'simplefin_accessKey',
          value: null,
        }),
        'Failed to clear SimpleFIN access key',
      );
      setIsSimpleFinSetupComplete(false);
    } catch (error) {
      notifyResetFailure('SimpleFIN', error);
    }
  }, [notifyResetFailure]);

  const onPluggyAiReset = useCallback(async () => {
    try {
      const fileId =
        pluggyAiStatus.source === 'per-budget-file' ? cloudFileId : null;
      if (pluggyAiStatus.source === 'per-budget-file' && !fileId) {
        throw new Error(t('Budget file ID is required.'));
      }

      await ensureSuccessResponse(
        await send('secret-set', {
          name: 'pluggyai_clientId',
          value: null,
          fileId,
        }),
        'Failed to clear Pluggy.ai client ID',
      );
      await ensureSuccessResponse(
        await send('secret-set', {
          name: 'pluggyai_clientSecret',
          value: null,
          fileId,
        }),
        'Failed to clear Pluggy.ai client secret',
      );
      await ensureSuccessResponse(
        await send('secret-set', {
          name: 'pluggyai_itemIds',
          value: null,
          fileId,
        }),
        'Failed to clear Pluggy.ai item IDs',
      );
      setPluggyAiStatus(await send('pluggyai-status'));
    } catch (error) {
      notifyResetFailure('Pluggy.ai', error);
    }
  }, [
    cloudFileId,
    notifyResetFailure,
    pluggyAiStatus.source,
    setPluggyAiStatus,
    t,
  ]);

  const onEnableBankingReset = useCallback(async () => {
    try {
      await ensureSuccessResponse(
        await send('secret-set', {
          name: 'enablebanking_applicationId',
          value: null,
        }),
        'Failed to clear Enable Banking application ID',
      );
      await ensureSuccessResponse(
        await send('secret-set', {
          name: 'enablebanking_secretKey',
          value: null,
        }),
        'Failed to clear Enable Banking secret key',
      );
      setIsEnableBankingSetupComplete(false);
    } catch (error) {
      notifyResetFailure('Enable Banking', error);
    }
  }, [notifyResetFailure]);

  const onAkahuReset = useCallback(async () => {
    try {
      await ensureSuccessResponse(
        await send('secret-set', {
          name: 'akahu_userToken',
          value: null,
        }),
        'Failed to clear Akahu user token',
      );
      await ensureSuccessResponse(
        await send('secret-set', {
          name: 'akahu_appToken',
          value: null,
        }),
        'Failed to clear Akahu app token',
      );
      setIsAkahuSetupComplete(false);
    } catch (error) {
      console.log(error);
      notifyResetFailure('Akahu', error);
    }
  }, [notifyResetFailure]);

  const onConnectGoCardless = useCallback(() => {
    if (!isGoCardlessSetupComplete) {
      onGoCardlessInit();
      return;
    }

    void authorizeBank(dispatch, upgradingAccountId);
  }, [
    dispatch,
    isGoCardlessSetupComplete,
    onGoCardlessInit,
    upgradingAccountId,
  ]);

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
    dispatch,
    isSimpleFinSetupComplete,
    loadingSimpleFinAccounts,
    onSimpleFinInit,
    upgradingAccountId,
  ]);

  const onConnectEnableBanking = useCallback(async () => {
    if (!isEnableBankingSetupComplete) {
      onEnableBankingInit();
      return;
    }

    try {
      await authorizeEnableBanking(dispatch, upgradingAccountId);
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
    isEnableBankingSetupComplete,
    onEnableBankingInit,
    t,
    upgradingAccountId,
  ]);

  const onConnectPluggyAi = useCallback(async () => {
    if (!pluggyAiStatus.configured) {
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
    dispatch,
    onPluggyAiInit,
    pluggyAiStatus.configured,
    t,
    upgradingAccountId,
  ]);

  const onConnectAkahu = useCallback(async () => {
    if (!isAkahuSetupComplete) {
      onAkahuInit();
      return;
    }

    if (loadingAkahuAccounts) {
      return;
    }

    setLoadingAkahuAccounts(true);

    try {
      const results = await send('akahu-accounts');
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
    isAkahuSetupComplete,
    loadingAkahuAccounts,
    onAkahuInit,
    upgradingAccountId,
    t,
  ]);

  const configuredProviders = {
    goCardless: Boolean(isGoCardlessSetupComplete),
    simpleFin: Boolean(isSimpleFinSetupComplete),
    pluggyai: Boolean(pluggyAiStatus.configured),
    enableBanking: Boolean(isEnableBankingSetupComplete),
    akahu: Boolean(isAkahuSetupComplete),
  } satisfies Record<BankSyncProviders, boolean>;

  const providers = useMemo<BuiltInBankSyncProviderState[]>(() => {
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
            credentialSource: 'global',
            supportsPerBudgetFile: false,
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
            credentialSource: 'global',
            supportsPerBudgetFile: false,
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
          credentialSource: pluggyAiStatus.source ?? 'global',
          supportsPerBudgetFile: true,
          canConfigure:
            syncServerStatus === 'online' &&
            (isAdmin || (isFileOwner && pluggyAiStatus.source !== 'global')),
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
        credentialSource: 'global',
        supportsPerBudgetFile: false,
        canConfigure: canConfigureProviders,
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
        credentialSource: 'global',
        supportsPerBudgetFile: false,
        canConfigure: canConfigureProviders,
        isLoading: isEnableBankingLoading,
        onConfigure: onEnableBankingInit,
        onLink: onConnectEnableBanking,
        onReset: onEnableBankingReset,
      });
    }

    return baseProviders;
  }, [
    canConfigureProviders,
    isAdmin,
    isFileOwner,
    configuredProviders.enableBanking,
    configuredProviders.goCardless,
    configuredProviders.pluggyai,
    configuredProviders.simpleFin,
    configuredProviders.akahu,
    pluggyAiStatus,
    syncServerStatus,
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

  const permissionWarning = getPermissionWarning(
    syncServerStatus,
    isAdmin,
    isFileOwner,
  );

  return {
    providers,
    syncServerStatus,
    permissionWarning,
  };
}
