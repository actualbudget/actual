import React from 'react';
import { Trans } from 'react-i18next';

import { Button } from '@actual-app/components/button';
import { Text } from '@actual-app/components/text';
import { theme } from '@actual-app/components/theme';
import { View } from '@actual-app/components/view';

import { type ProviderStatusMap } from './useProviderStatusMap';

import { type BankSyncProvider } from '#hooks/useBankSyncProviders';

export function ProviderSetupGrid({
  providers,
  statusMap,
  onConfigure,
  onLink,
  canConfigure = true,
}: {
  providers: BankSyncProvider[];
  statusMap: ProviderStatusMap;
  onConfigure: (arg: { provider: BankSyncProvider }) => void;
  onLink: (arg: { provider: BankSyncProvider }) => void;
  canConfigure?: boolean;
}) {
  if (providers.length === 0) {
    return null;
  }

  return (
    <View
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 320px))',
        justifyContent: 'start',
        gap: 12,
      }}
    >
      {providers.map(provider => {
        const configured = Boolean(statusMap[provider.slug]?.configured);

        return (
          <View
            key={provider.slug}
            data-testid={`bank-sync-plugin-provider-${provider.slug}`}
            style={{
              border: `1px solid ${theme.tableBorder}`,
              borderRadius: 8,
              padding: 16,
              backgroundColor: theme.tableBackground,
              gap: 16,
              minHeight: 150,
            }}
          >
            <View style={{ gap: 6, flex: 1 }}>
              <Text style={{ fontSize: 17, fontWeight: 600 }}>
                {provider.displayName}
              </Text>
              <Text
                style={{
                  color: configured
                    ? theme.noticeTextDark
                    : theme.pageTextSubdued,
                  fontSize: 13,
                  fontWeight: 500,
                }}
              >
                {configured ? (
                  <Trans>Configured</Trans>
                ) : (
                  <Trans>Not configured</Trans>
                )}
              </Text>
              {provider.description ? (
                <Text style={{ fontSize: 13, color: theme.pageTextSubdued }}>
                  {provider.description}
                </Text>
              ) : null}
            </View>

            <View
              style={{
                flexDirection: 'row',
                justifyContent: 'flex-end',
                alignItems: 'center',
                gap: 8,
                flexWrap: 'wrap',
              }}
            >
              <Button
                variant="bare"
                type="button"
                isDisabled={!canConfigure}
                onPress={() => onConfigure({ provider })}
              >
                {configured ? <Trans>Edit setup</Trans> : <Trans>Set up</Trans>}
              </Button>
              <Button
                variant="primary"
                type="button"
                isDisabled={!configured}
                onPress={() => onLink({ provider })}
              >
                <Trans>Link bank account</Trans>
              </Button>
            </View>
          </View>
        );
      })}
    </View>
  );
}
