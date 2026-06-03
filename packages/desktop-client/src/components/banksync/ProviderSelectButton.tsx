import React, { useMemo } from 'react';
import { DialogTrigger } from 'react-aria-components';
import { useTranslation } from 'react-i18next';

import { Button } from '@actual-app/components/button';
import { Menu } from '@actual-app/components/menu';
import type { MenuItem } from '@actual-app/components/menu';
import { Popover } from '@actual-app/components/popover';

import type { BankSyncProvider } from '#hooks/useBankSyncProviders';

import type { ProviderStatusMap } from './useProviderStatusMap';

export function ProviderSelectButton({
  label,
  providers,
  statusMap,
  onSelect,
  isDisabled = false,
}: {
  label: string;
  providers: BankSyncProvider[];
  statusMap: ProviderStatusMap;
  onSelect: (arg: { providerSlug: string }) => void;
  isDisabled?: boolean;
}) {
  const { t } = useTranslation();

  const items = useMemo(() => {
    return providers.map(
      provider =>
        ({
          name: provider.slug,
          text: provider.displayName,
          disabled: !statusMap[provider.slug]?.configured,
          tooltip: !statusMap[provider.slug]?.configured
            ? t('Not configured')
            : undefined,
        }) satisfies MenuItem<string>,
    );
  }, [providers, statusMap, t]);

  return (
    <DialogTrigger>
      <Button isDisabled={isDisabled}>{label}</Button>
      <Popover>
        <Menu
          items={items}
          onMenuSelect={itemId => {
            const providerSlug = String(itemId);
            if (providerSlug) {
              onSelect({ providerSlug });
            }
          }}
        />
      </Popover>
    </DialogTrigger>
  );
}
