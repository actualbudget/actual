import React, { useMemo } from 'react';
import { DialogTrigger } from 'react-aria-components';
import { Trans } from 'react-i18next';

import { Button } from '@actual-app/components/button';
import { Menu, type MenuItem } from '@actual-app/components/menu';
import { Popover } from '@actual-app/components/popover';
import { Text } from '@actual-app/components/text';
import { theme } from '@actual-app/components/theme';
import { View } from '@actual-app/components/view';

import {
  getInternalBankSyncProviders,
  type InternalBankSyncProvider,
  type ProviderStatusMap,
} from './useProviderStatusMap';

type ProviderListProps = {
  statusMap: ProviderStatusMap;
  canConfigure?: boolean;
  onConfigure: (provider: InternalBankSyncProvider) => void;
  onReset: (provider: InternalBankSyncProvider) => void;
};

export function ProviderList({
  statusMap,
  canConfigure = true,
  onConfigure,
  onReset,
}: ProviderListProps) {
  const providers = useMemo(() => getInternalBankSyncProviders(), []);

  const configuredProviders = useMemo(
    () => providers.filter(p => Boolean(statusMap[p.slug]?.configured)),
    [providers, statusMap],
  );

  const unconfiguredProviders = useMemo(
    () => providers.filter(p => !statusMap[p.slug]?.configured),
    [providers, statusMap],
  );

  const addProviderItems: MenuItem<string>[] = useMemo(
    () =>
      unconfiguredProviders.map(p => ({
        name: p.slug,
        text: p.displayName,
      })),
    [unconfiguredProviders],
  );

  return (
    <View style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {configuredProviders.map(provider => (
        <View
          key={provider.slug}
          style={{
            display: 'flex',
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '10px 0',
            borderBottom: `1px solid ${theme.tableBorder}`,
          }}
        >
          <Text style={{ fontWeight: 600 }}>{provider.displayName}</Text>
          <Button
            variant="bare"
            isDisabled={!canConfigure}
            onPress={() => onReset(provider)}
          >
            <Trans>Reset</Trans>
          </Button>
        </View>
      ))}

      {unconfiguredProviders.length > 0 && (
        <View style={{ alignItems: 'flex-start' }}>
          <DialogTrigger>
            <Button isDisabled={!canConfigure}>
              <Trans>Add Provider</Trans>
            </Button>
            <Popover>
              <Menu
                items={addProviderItems}
                onMenuSelect={itemId => {
                  const provider = providers.find(
                    p => p.slug === String(itemId),
                  );
                  if (provider) {
                    onConfigure(provider);
                  }
                }}
              />
            </Popover>
          </DialogTrigger>
        </View>
      )}
    </View>
  );
}
