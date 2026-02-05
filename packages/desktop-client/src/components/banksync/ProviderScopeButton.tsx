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

export type BankSyncScope = 'global' | 'file';

function makeKey(providerSlug: string, scope: BankSyncScope) {
  return `${providerSlug}|${scope}`;
}

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
    scope: BankSyncScope;
    provider: InternalBankSyncProvider;
  }) => void;
  isDisabled?: boolean;
}) {
  const { t } = useTranslation();
  const providers = useMemo(() => getInternalBankSyncProviders(), []);

  const items = useMemo(() => {
    const menuItems: MenuItem<string>[] = [];

    providers.forEach(provider => {
      const statuses = statusMap[provider.slug];
      const globalConfigured = Boolean(statuses?.global?.configured);
      const fileConfigured = Boolean(
        provider.supportsScope && statuses?.file?.configured,
      );
      const hasAnyConfigured = globalConfigured || fileConfigured;

      if (!hasAnyConfigured) {
        return;
      }

      menuItems.push({
        type: Menu.label,
        name: provider.displayName,
        text: provider.displayName,
      });

      if (globalConfigured) {
        menuItems.push({
          name: makeKey(provider.slug, 'global'),
          text: t('Global'),
        });
      }

      if (fileConfigured) {
        menuItems.push({
          name: makeKey(provider.slug, 'file'),
          text: t('Scoped'),
        });
      }

      menuItems.push(Menu.line);
    });

    // Trim trailing divider
    if (menuItems[menuItems.length - 1] === Menu.line) {
      menuItems.pop();
    }

    if (menuItems.length === 0) {
      menuItems.push({
        name: 'none',
        text: t('No providers configured'),
        disabled: true,
      });
    }

    return menuItems;
  }, [providers, statusMap, t]);

  return (
    <DialogTrigger>
      <Button isDisabled={isDisabled}>{label}</Button>
      <Popover>
        <Menu
          items={items}
          onMenuSelect={itemId => {
            const [providerSlug, scope] = String(itemId).split('|') as [
              string,
              BankSyncScope,
            ];
            if (providerSlug && (scope === 'global' || scope === 'file')) {
              const provider = providers.find(p => p.slug === providerSlug);
              if (provider) {
                onSelect({ providerSlug, scope, provider });
              }
            }
          }}
        />
      </Popover>
    </DialogTrigger>
  );
}
