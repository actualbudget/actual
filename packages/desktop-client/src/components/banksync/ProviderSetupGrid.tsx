import React from 'react';
import { useTranslation } from 'react-i18next';

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
  canConfigure = true,
}: {
  providers: BankSyncProvider[];
  statusMap: ProviderStatusMap;
  onConfigure: (arg: { provider: BankSyncProvider }) => void;
  canConfigure?: boolean;
}) {
  const { t } = useTranslation();

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
      {/* Header row */}
      <View
        style={{
          display: 'grid',
          gridTemplateColumns: '2fr 1fr',
          gap: 10,
          alignItems: 'center',
          padding: '8px 10px',
          backgroundColor: theme.tableHeaderBackground,
          color: theme.tableHeaderText,
        }}
      >
        <Text style={{ fontWeight: 500 }}>{t('Provider')}</Text>
        <Text style={{ fontWeight: 500 }}>{t('Status')}</Text>
      </View>

      {/* Content rows */}
      <View style={{ backgroundColor: theme.tableBackground }}>
        {providers.map((provider, index) => {
          const configured = Boolean(statusMap[provider.slug]?.configured);
          const isLast = index === providers.length - 1;

          return (
            <View
              key={provider.slug}
              style={{
                display: 'grid',
                gridTemplateColumns: '2fr 1fr',
                gap: 10,
                alignItems: 'center',
                padding: '10px',
                borderBottom: isLast ? 'none' : `1px solid ${theme.tableBorder}`,
              }}
            >
              <View style={{ gap: 4 }}>
                <Text style={{ fontWeight: 600 }}>{provider.displayName}</Text>
                {provider.description ? (
                  <Text style={{ fontSize: 12, color: theme.pageTextSubdued }}>
                    {provider.description}
                  </Text>
                ) : null}
              </View>

              <View
                style={{ flexDirection: 'row', gap: 10, alignItems: 'center' }}
              >
                <Text>{configured ? t('Configured') : t('Not configured')}</Text>
                <Button
                  isDisabled={!canConfigure}
                  onPress={() => onConfigure({ provider })}
                >
                  {configured ? t('Edit') : t('Set up')}
                </Button>
              </View>
            </View>
          );
        })}
      </View>
    </View>
  );
}
