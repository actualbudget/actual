import { useAccounts } from '#hooks/useAccounts';

import { useBuiltInBankSyncProviders } from './useBuiltInBankSyncProviders';

export function useBankSyncPage() {
  const { data: accounts = [] } = useAccounts();
  const { providers, syncServerStatus, permissionWarning, isLoading } =
    useBuiltInBankSyncProviders();

  const isOnline = syncServerStatus === 'online';
  const hasSettledProviders = isOnline && !isLoading;
  const openAccounts = accounts.filter(account => !account.closed);
  const linkedAccounts = openAccounts.filter(account => account.bank != null);
  const hasLinkedAccounts = linkedAccounts.length > 0;
  const configuredProviders = hasSettledProviders
    ? providers.filter(provider => provider.isConfigured)
    : [];
  const isSettingUp = hasSettledProviders && configuredProviders.length === 0;

  return {
    providers,
    configuredProviders,
    syncServerStatus,
    permissionWarning,
    visibleAccounts: isOnline ? openAccounts : linkedAccounts,
    hasLinkedAccounts,
    isOnline,
    isLoadingProviders: isOnline && isLoading,
    isSettingUp,
    hasNoAccountsMessage:
      configuredProviders.length > 0 && openAccounts.length === 0,
    hasProvidersMenuItem: configuredProviders.length > 0,
    isLinking: configuredProviders.some(provider => provider.isLoading),
  };
}
