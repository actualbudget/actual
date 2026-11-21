import { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';

import { useResponsive } from '@actual-app/components/hooks/useResponsive';
import { spacing } from '@actual-app/components/tokens';
import { View } from '@actual-app/components/view';
import type { AccountEntity } from '@actual-app/core/types/models';

import { BankSyncPermissionWarning } from '#components/banksync/BankSyncPermissionWarning';
import { BankSyncProviderChooser } from '#components/banksync/BankSyncProviderChooser';
import { BankSyncServerRequired } from '#components/banksync/BankSyncServerRequired';
import { useBuiltInBankSyncProviders } from '#components/banksync/useBuiltInBankSyncProviders';
import { MobileSheet } from '#components/mobile/MobileSheet';
import { MobileSheetSection } from '#components/mobile/MobileSheetSection';
import { useAccount } from '#hooks/useAccount';
import { useModalState } from '#hooks/useModalState';

type LinkAccountModalProps = {
  upgradingAccountId: AccountEntity['id'];
};

export function LinkAccountModal({
  upgradingAccountId,
}: LinkAccountModalProps) {
  const { t } = useTranslation();
  const { isNarrowWidth } = useResponsive();
  const account = useAccount(upgradingAccountId);
  const { providers, syncServerStatus, permissionWarning, isLoading } =
    useBuiltInBankSyncProviders({ upgradingAccountId });

  const configuredProviders = providers.filter(
    provider => provider.isConfigured,
  );
  const isOnline = syncServerStatus === 'online';
  const hasDecidedShortcutRef = useRef(false);
  const hasStartedOnlyProviderRef = useRef(false);
  const wasCoveredRef = useRef(false);
  const { isActive, modalStack, onClose } = useModalState();
  const isChooserOnTop = modalStack.length > 0 && isActive('add-account');
  useEffect(() => {
    if (hasDecidedShortcutRef.current) {
      return;
    }
    if (!isOnline) {
      hasDecidedShortcutRef.current = true;
      return;
    }
    if (isLoading) {
      return;
    }
    hasDecidedShortcutRef.current = true;
    if (configuredProviders.length === 1) {
      hasStartedOnlyProviderRef.current = true;
      void configuredProviders[0].onLink();
    }
  }, [isOnline, isLoading, configuredProviders]);

  useEffect(() => {
    if (!hasStartedOnlyProviderRef.current) {
      return;
    }
    if (!isChooserOnTop) {
      wasCoveredRef.current = true;
      return;
    }
    if (wasCoveredRef.current) {
      onClose();
    }
  }, [isChooserOnTop, onClose]);

  return (
    <MobileSheet
      name="add-account"
      title={
        account
          ? t('Link {{accountName}}', { accountName: account.name })
          : t('Link account')
      }
      hasWideDialogLabel
      isLoading={
        isLoading || configuredProviders.some(provider => provider.isLoading)
      }
    >
      {syncServerStatus !== 'online' ? (
        <BankSyncServerRequired syncServerStatus={syncServerStatus} />
      ) : (
        <View style={{ minWidth: isNarrowWidth ? undefined : 420 }}>
          {permissionWarning && (
            <View style={{ padding: `0 ${spacing.lg}px ${spacing.sm}px` }}>
              <BankSyncPermissionWarning
                permissionWarning={permissionWarning}
              />
            </View>
          )}
          <MobileSheetSection>
            <BankSyncProviderChooser providers={providers} />
          </MobileSheetSection>
        </View>
      )}
    </MobileSheet>
  );
}
