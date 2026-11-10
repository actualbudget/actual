import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { useResponsive } from '@actual-app/components/hooks/useResponsive';
import { styles } from '@actual-app/components/styles';
import { spacing } from '@actual-app/components/tokens';
import { View } from '@actual-app/components/view';

import { BuiltInProviders } from '#components/banksync/BuiltInProviders';
import { useBuiltInBankSyncProviders } from '#components/banksync/useBuiltInBankSyncProviders';
import { BankSyncProviderRows } from '#components/mobile/banksync/BankSyncProviderRows';
import { MobileSheet } from '#components/mobile/MobileSheet';
import { MobileSheetConfirm } from '#components/mobile/MobileSheetConfirm';
import { MobileSheetSection } from '#components/mobile/MobileSheetSection';
import type { Modal as ModalType } from '#modals/modalsSlice';

type BankSyncProvidersModalProps = Extract<
  ModalType,
  { name: 'bank-sync-providers' }
>['options'];

export function BankSyncProvidersModal({
  onProvidersChange,
}: BankSyncProvidersModalProps) {
  const { t } = useTranslation();
  const { isNarrowWidth } = useResponsive();
  const [selectedProviderId, setSelectedProviderId] = useState<string | null>(
    null,
  );
  const [resettingProviderId, setResettingProviderId] = useState<string | null>(
    null,
  );
  const { providers, syncServerStatus, permissionWarning } =
    useBuiltInBankSyncProviders();
  const configuredKey = providers
    .filter(provider => provider.isConfigured)
    .map(provider => provider.id)
    .join(',');
  const latestConfiguredKeyRef = useRef(configuredKey);
  const baselineConfiguredKeyRef = useRef<string | null>(null);
  const pendingResetsRef = useRef(0);
  const isMountedRef = useRef(true);

  useEffect(() => {
    latestConfiguredKeyRef.current = configuredKey;
  }, [configuredKey]);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      const baseline = baselineConfiguredKeyRef.current;
      if (
        pendingResetsRef.current === 0 &&
        baseline != null &&
        baseline !== latestConfiguredKeyRef.current
      ) {
        onProvidersChange?.();
      }
    };
  }, [onProvidersChange]);

  const resetProvider = async (id: string) => {
    const provider = providers.find(candidate => candidate.id === id);
    if (!provider) {
      return;
    }
    baselineConfiguredKeyRef.current ??= configuredKey;
    pendingResetsRef.current += 1;
    try {
      await provider.onReset();
    } finally {
      pendingResetsRef.current -= 1;
      if (!isMountedRef.current && pendingResetsRef.current === 0) {
        onProvidersChange?.();
      }
    }
  };

  const trackedProviders = providers.map(provider => ({
    ...provider,
    onConfigure: () => {
      baselineConfiguredKeyRef.current ??= configuredKey;
      return provider.onConfigure();
    },
    onReset: () => setResettingProviderId(provider.id),
  }));

  const resettingProvider = providers.find(
    provider => provider.id === resettingProviderId && provider.isConfigured,
  );
  const selectedProvider = trackedProviders.find(
    provider => provider.id === selectedProviderId && provider.isConfigured,
  );

  const view = resettingProvider ? 'reset' : (selectedProvider?.id ?? 'list');
  const contentRef = useRef<HTMLDivElement>(null);
  const previousViewRef = useRef(view);
  useEffect(() => {
    if (previousViewRef.current !== view) {
      previousViewRef.current = view;
      contentRef.current
        ?.querySelector<HTMLElement>('button:not([disabled])')
        ?.focus();
    }
  }, [view]);

  const resetMessage = resettingProvider
    ? t('Reset {{provider}} credentials?', {
        provider: resettingProvider.displayName,
      })
    : '';
  let resetDetail = '';
  if (resettingProvider?.credentialSource === 'per-budget-file') {
    resetDetail = t(
      'This removes the credentials saved for this budget only. Accounts linked through {{provider}} in this budget stop syncing until it is set up again.',
      { provider: resettingProvider.displayName },
    );
  } else if (resettingProvider) {
    resetDetail = t(
      'This removes the credentials for all budgets on this server. Accounts linked through {{provider}} stop syncing until it is set up again.',
      { provider: resettingProvider.displayName },
    );
  }
  const resetAnnouncement = resettingProvider
    ? `${resetMessage} ${resetDetail}`
    : '';

  let content;
  if (resettingProvider) {
    content = (
      <View style={{ maxWidth: isNarrowWidth ? undefined : 480 }}>
        <MobileSheetConfirm
          message={resetMessage}
          detail={resetDetail}
          confirmLabel={t('Reset credentials')}
          isDestructive
          onCancel={() => setResettingProviderId(null)}
          onConfirm={() => {
            setResettingProviderId(null);
            setSelectedProviderId(null);
            void resetProvider(resettingProvider.id);
          }}
        />
      </View>
    );
  } else if (isNarrowWidth && syncServerStatus === 'online') {
    content = selectedProvider ? (
      <BankSyncProviderRows
        providers={trackedProviders}
        permissionWarning={permissionWarning}
        selectedProviderId={selectedProvider.id}
        onSelectProvider={setSelectedProviderId}
      />
    ) : (
      <MobileSheetSection>
        <BankSyncProviderRows
          providers={trackedProviders}
          permissionWarning={permissionWarning}
          selectedProviderId={null}
          onSelectProvider={setSelectedProviderId}
        />
      </MobileSheetSection>
    );
  } else {
    content = (
      <View
        style={{
          padding: isNarrowWidth
            ? `0 ${spacing.lg}px ${spacing.lg}px`
            : spacing.sm,
        }}
      >
        <BuiltInProviders
          providers={trackedProviders}
          syncServerStatus={syncServerStatus}
          permissionWarning={permissionWarning}
        />
      </View>
    );
  }

  return (
    <MobileSheet
      name="bank-sync-providers"
      title={
        (resettingProvider ?? (isNarrowWidth ? selectedProvider : undefined))
          ?.displayName ?? t('Providers')
      }
      hasWideDialogLabel
    >
      <View innerRef={contentRef}>{content}</View>
      <span aria-live="polite" style={styles.visuallyHidden}>
        {resetAnnouncement}
      </span>
    </MobileSheet>
  );
}
