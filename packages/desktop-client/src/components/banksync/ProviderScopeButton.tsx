import React, { useMemo } from 'react';
import { Dialog, DialogTrigger } from 'react-aria-components';
import { useTranslation } from 'react-i18next';

import { Button } from '@actual-app/components/button';
import { SvgAdd } from '@actual-app/components/icons/v1';
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
  variant = 'normal',
}: {
  label: string;
  statusMap: ProviderStatusMap;
  onSelect: (arg: {
    providerSlug: string;
    provider: InternalBankSyncProvider;
  }) => void;
  isDisabled?: boolean;
  variant?: 'normal' | 'bare';
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
      <Button
        variant={variant}
        isDisabled={isDisabled}
        style={variant === 'bare' ? { padding: 0 } : undefined}
      >
        {variant === 'bare' && (
          <SvgAdd width={10} height={10} style={{ marginRight: 3 }} />
        )}
        {label}
      </Button>
      <Popover>
        <Dialog>
          {({ close }) => (
            <Menu
              items={items}
              onMenuSelect={itemId => {
                const providerSlug = String(itemId);
                if (providerSlug === 'none') return;
                const provider = providers.find(p => p.slug === providerSlug);
                if (provider) {
                  onSelect({ providerSlug, provider });
                  close();
                }
              }}
            />
          )}
        </Dialog>
      </Popover>
    </DialogTrigger>
  );
}
