import React from 'react';
import { Trans } from 'react-i18next';

import { Button } from '@actual-app/components/button';
import { Text } from '@actual-app/components/text';
import { theme } from '@actual-app/components/theme';
import { View } from '@actual-app/components/view';

import {
  getInternalBankSyncProviders,
  type InternalBankSyncProvider,
  type ProviderStatusMap,
} from './useProviderStatusMap';

type Scope = 'global' | 'file';

type ProviderSetupGridProps = {
  statusMap: ProviderStatusMap;
  onConfigure: (arg: {
    provider: InternalBankSyncProvider;
    scope: Scope;
  }) => void;
  onReset: (arg: { provider: InternalBankSyncProvider; scope: Scope }) => void;
  canConfigure?: boolean;
};

export function ProviderSetupGrid({
  statusMap,
  onConfigure,
  onReset,
  canConfigure = true,
}: ProviderSetupGridProps) {
  const providers = getInternalBankSyncProviders();

  if (providers.length === 0) {
    return null;
  }

  return (
    <View
      style={{
        borderRadius: 6,
        overflow: 'hidden',
      }}
    >
      <View
        style={{
          display: 'grid',
          gridTemplateColumns: '2fr 1fr 1fr',
          gap: 10,
          alignItems: 'center',
          padding: '8px 10px',
          backgroundColor: theme.tableHeaderBackground,
          color: theme.tableHeaderText,
        }}
      >
        <Text style={{ fontWeight: 500 }}>
          <Trans>Provider</Trans>
        </Text>
        <Text style={{ fontWeight: 500 }}>
          <Trans>Global</Trans>
        </Text>
        <Text style={{ fontWeight: 500 }}>
          <Trans>Scoped</Trans>
        </Text>
      </View>

      <View style={{ backgroundColor: theme.tableBackground }}>
        {providers.map((provider, index) => {
          const statuses = statusMap[provider.slug];
          const globalConfigured = Boolean(statuses?.global?.configured);
          const fileConfigured = Boolean(statuses?.file?.configured);
          const isLast = index === providers.length - 1;

          return (
            <View
              key={provider.slug}
              style={{
                display: 'grid',
                gridTemplateColumns: '2fr 1fr 1fr',
                gap: 10,
                alignItems: 'center',
                padding: '10px',
                borderBottom: isLast
                  ? 'none'
                  : `1px solid ${theme.tableBorder}`,
              }}
            >
              <View style={{ gap: 4 }}>
                <Text style={{ fontWeight: 600 }}>{provider.displayName}</Text>
              </View>

              <View
                style={{
                  flexDirection: 'row',
                  gap: 10,
                  alignItems: 'center',
                }}
              >
                {globalConfigured ? (
                  <Button
                    variant="bare"
                    isDisabled={!canConfigure}
                    onPress={() => onReset({ provider, scope: 'global' })}
                  >
                    <Trans>Reset</Trans>
                  </Button>
                ) : (
                  <Button
                    variant="bare"
                    isDisabled={!canConfigure}
                    onPress={() => onConfigure({ provider, scope: 'global' })}
                  >
                    <Trans>Set up</Trans>
                  </Button>
                )}
              </View>

              <View
                style={{
                  flexDirection: 'row',
                  gap: 10,
                  alignItems: 'center',
                }}
              >
                {provider.supportsScope ? (
                  fileConfigured ? (
                    <Button
                      variant="bare"
                      isDisabled={!canConfigure}
                      onPress={() => onReset({ provider, scope: 'file' })}
                    >
                      <Trans>Reset</Trans>
                    </Button>
                  ) : (
                    <Button
                      variant="bare"
                      isDisabled={!canConfigure}
                      onPress={() => onConfigure({ provider, scope: 'file' })}
                    >
                      <Trans>Set up</Trans>
                    </Button>
                  )
                ) : (
                  <Text style={{ color: theme.pageTextSubdued }}>—</Text>
                )}
              </View>
            </View>
          );
        })}
      </View>
    </View>
  );
}
