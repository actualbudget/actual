import { useRef, useState } from 'react';
import { Trans } from 'react-i18next';

import { ButtonWithLoading } from '@actual-app/components/button';
import { Menu } from '@actual-app/components/menu';
import { Popover } from '@actual-app/components/popover';

import type { BuiltInBankSyncProviderState } from './useBuiltInBankSyncProviders';

type LinkBankAccountButtonProps = {
  providers: BuiltInBankSyncProviderState[];
  isLoadingProviders?: boolean;
};

export function LinkBankAccountButton({
  providers,
  isLoadingProviders = false,
}: LinkBankAccountButtonProps) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement | null>(null);

  const configuredProviders = providers.filter(
    provider => provider.isConfigured,
  );

  if (isLoadingProviders) {
    return (
      <ButtonWithLoading variant="primary" isDisabled isLoading>
        <Trans>Link bank account</Trans>
      </ButtonWithLoading>
    );
  }

  if (configuredProviders.length === 0) {
    return null;
  }

  const onPress = () => {
    if (configuredProviders.length === 1) {
      void configuredProviders[0].onLink();
      return;
    }
    setIsMenuOpen(true);
  };

  return (
    <>
      <ButtonWithLoading
        ref={triggerRef}
        variant="primary"
        isLoading={configuredProviders.some(provider => provider.isLoading)}
        onPress={onPress}
      >
        <Trans>Link bank account</Trans>
      </ButtonWithLoading>
      <Popover
        triggerRef={triggerRef}
        isOpen={isMenuOpen}
        isNonModal
        placement="bottom start"
        onOpenChange={setIsMenuOpen}
      >
        <Menu
          items={configuredProviders.map(provider => ({
            name: provider.id,
            text: provider.displayName,
          }))}
          onMenuSelect={id => {
            setIsMenuOpen(false);
            void configuredProviders
              .find(provider => provider.id === id)
              ?.onLink();
          }}
        />
      </Popover>
    </>
  );
}
