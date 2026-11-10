import { Trans, useTranslation } from 'react-i18next';

import { Button } from '@actual-app/components/button';
import {
  SvgCheveronLeft,
  SvgCheveronRight,
} from '@actual-app/components/icons/v1';
import { styles } from '@actual-app/components/styles';
import { Text } from '@actual-app/components/text';
import { theme } from '@actual-app/components/theme';
import { spacing } from '@actual-app/components/tokens';
import { View } from '@actual-app/components/view';

import { BankSyncPermissionWarning } from '#components/banksync/BankSyncPermissionWarning';
import { getProviderStatusText } from '#components/banksync/bankSyncUtils';
import type { BuiltInBankSyncProviderState } from '#components/banksync/useBuiltInBankSyncProviders';
import { MobileSheetRow } from '#components/mobile/MobileSheetRow';
import { MobileSheetSection } from '#components/mobile/MobileSheetSection';

type BankSyncProviderRowsProps = {
  providers: BuiltInBankSyncProviderState[];
  permissionWarning: 'general' | 'file-owner' | null;
  selectedProviderId?: string | null;
  onSelectProvider?: (id: string | null) => void;
};

export function BankSyncProviderRows({
  providers,
  permissionWarning,
  selectedProviderId,
  onSelectProvider,
}: BankSyncProviderRowsProps) {
  const { t } = useTranslation();
  const selectedProvider = providers.find(
    provider => provider.id === selectedProviderId && provider.isConfigured,
  );

  if (selectedProvider) {
    const isEditBlockedByGlobalCredentials =
      selectedProvider.supportsPerBudgetFile &&
      selectedProvider.credentialSource === 'global' &&
      !selectedProvider.canConfigure;

    return (
      <View>
        <Button
          variant="bare"
          onPress={() => onSelectProvider?.(null)}
          style={{
            ...styles.mediumText,
            alignSelf: 'flex-start',
            minHeight: styles.mobileMinHeight,
            padding: `${spacing.sm}px ${spacing.lg}px ${spacing.sm}px ${spacing.sm}px`,
            gap: spacing.xs,
            fontWeight: 500,
            color: theme.pageText,
          }}
        >
          <SvgCheveronLeft width={20} height={20} />
          <Trans>All providers</Trans>
        </Button>
        <Text
          data-testid="bank-sync-provider-scope"
          style={{
            ...styles.smallText,
            color: theme.noticeTextDark,
            padding: `0 ${spacing.lg}px ${spacing.sm}px`,
          }}
        >
          {getProviderStatusText(selectedProvider, t)}
        </Text>
        <MobileSheetSection>
          <MobileSheetRow
            label={t('Link bank account')}
            onPress={() => void selectedProvider.onLink()}
          />
          {selectedProvider.canConfigure && (
            <MobileSheetRow
              label={t('Edit setup')}
              onPress={() => void selectedProvider.onConfigure()}
            />
          )}
          {isEditBlockedByGlobalCredentials && (
            <Text
              style={{
                ...styles.smallText,
                color: theme.pageTextLight,
                padding: `${spacing.sm}px ${spacing.lg}px`,
                borderTop: `1px solid ${theme.tooltipBorder}`,
              }}
            >
              <Trans>
                Reset credentials before setting credentials for this budget
                file.
              </Trans>
            </Text>
          )}
          <MobileSheetRow
            label={t('Reset credentials')}
            isDestructive
            onPress={() => void selectedProvider.onReset()}
          />
        </MobileSheetSection>
      </View>
    );
  }

  return (
    <View>
      {permissionWarning && (
        <View style={{ padding: `0 ${spacing.lg}px ${spacing.sm}px` }}>
          <BankSyncPermissionWarning permissionWarning={permissionWarning} />
        </View>
      )}

      <ul
        // oxlint-disable-next-line jsx-a11y/no-redundant-roles -- list-style none drops list semantics in Safari
        role="list"
        aria-label={t('Providers')}
        style={{ listStyle: 'none', margin: 0, padding: 0 }}
      >
        {providers.map(provider => {
          const isDisabled = !provider.isConfigured && !provider.canConfigure;
          return (
            <li key={provider.id}>
              <Button
                variant="bare"
                isDisabled={isDisabled}
                data-testid={`bank-sync-provider-${provider.id}`}
                onPress={() => {
                  if (provider.isConfigured) {
                    onSelectProvider?.(provider.id);
                  } else {
                    void provider.onConfigure();
                  }
                }}
                style={{
                  width: '100%',
                  minHeight: 56,
                  justifyContent: 'space-between',
                  padding: `${spacing.sm}px ${spacing.lg}px`,
                  gap: spacing.md,
                  borderRadius: 0,
                  borderTop: `1px solid ${theme.tooltipBorder}`,
                  color: theme.pageText,
                  opacity: isDisabled ? 0.6 : 1,
                }}
              >
                <View style={{ alignItems: 'flex-start', gap: spacing.xxs }}>
                  <Text style={{ ...styles.mediumText, fontWeight: 500 }}>
                    {provider.displayName}
                  </Text>
                  <Text
                    style={{
                      ...styles.smallText,
                      textAlign: 'left',
                      color: provider.isConfigured
                        ? theme.noticeTextDark
                        : theme.pageTextLight,
                    }}
                  >
                    {getProviderStatusText(provider, t)}
                  </Text>
                </View>
                {provider.isConfigured && (
                  <SvgCheveronRight
                    width={20}
                    height={20}
                    style={{ flexShrink: 0, color: theme.pageTextLight }}
                  />
                )}
                {!provider.isConfigured && !isDisabled && (
                  <Text
                    style={{
                      ...styles.mediumText,
                      flexShrink: 0,
                      fontWeight: 500,
                      color: theme.pageTextLink,
                    }}
                  >
                    <Trans>Set up</Trans>
                  </Text>
                )}
              </Button>
            </li>
          );
        })}
      </ul>
    </View>
  );
}
