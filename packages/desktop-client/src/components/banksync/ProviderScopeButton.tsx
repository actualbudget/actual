import React, { useMemo } from 'react';
import { DialogTrigger } from 'react-aria-components';
import { useTranslation } from 'react-i18next';

import { Button } from '@actual-app/components/button';
import { Menu, type MenuItem } from '@actual-app/components/menu';
import { Popover } from '@actual-app/components/popover';

import {
  getInternalBankSyncProviders,
  type InternalBankSyncProvider,
  type ProviderStatusMap,
} from './useProviderStatusMap';

export function ProviderScopeButton({
  label,
  statusMap,
  onSelect,
  isDisabled = false,
}: {
  label: string;
  statusMap: ProviderStatusMap;
  onSelect: (arg: {
    providerSlug: string;
    provider: InternalBankSyncProvider;
  }) => void;
  isDisabled?: boolean;
}) {
  const { t } = useTranslation();
  const providers = useMemo(() => getInternalBankSyncProviders(), []);

  const items = useMemo(() => {
    const configured = providers.filter(p => statusMap[p.slug]?.configured);
    if (configured.length === 0) {
      return [
        {
          name: 'none',
          text: t('No providers configured'),
          disabled: true,
        },
      ] as MenuItem<string>[];
    }
    return configured.map(p => ({
      name: p.slug,
      text: p.displayName,
    })) as MenuItem<string>[];
  }, [providers, statusMap, t]);

  return (
    <DialogTrigger>
      <Button isDisabled={isDisabled}>{label}</Button>
      <Popover>
        <Menu
          items={items}
          onMenuSelect={itemId => {
            const providerSlug = String(itemId);
            if (providerSlug === 'none') return;
            const provider = providers.find(p => p.slug === providerSlug);
            if (provider) {
              onSelect({ providerSlug, provider });
            }
          }}
        />
      </Popover>
    </DialogTrigger>
  );
}
