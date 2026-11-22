import { useId } from 'react';
import { Trans, useTranslation } from 'react-i18next';

import { Button } from '@actual-app/components/button';
import { styles } from '@actual-app/components/styles';
import { Text } from '@actual-app/components/text';
import { theme } from '@actual-app/components/theme';
import { spacing } from '@actual-app/components/tokens';
import { View } from '@actual-app/components/view';

import type { BuiltInBankSyncProviderState } from './useBuiltInBankSyncProviders';

type BankSyncProviderChooserProps = {
  providers: BuiltInBankSyncProviderState[];
};

export function BankSyncProviderChooser({
  providers,
}: BankSyncProviderChooserProps) {
  const { t } = useTranslation();
  const regionIdPrefix = useId();

  return (
    <ul
      // oxlint-disable-next-line jsx-a11y/no-redundant-roles -- list-style none drops list semantics in Safari
      role="list"
      aria-label={t('Providers')}
      style={{ listStyle: 'none', margin: 0, padding: 0 }}
    >
      {providers.map(provider => {
        const isDisabled = !provider.isConfigured && !provider.canConfigure;
        const regionId = `${regionIdPrefix}-${provider.id}`;
        return (
          <li key={provider.id}>
            <Button
              variant="bare"
              isDisabled={isDisabled}
              data-testid={`bank-sync-provider-${provider.id}`}
              aria-describedby={regionId}
              aria-label={
                provider.isConfigured
                  ? t('Link with {{provider}}', {
                      provider: provider.displayName,
                    })
                  : t('Set up {{provider}}', {
                      provider: provider.displayName,
                    })
              }
              onPress={() => {
                if (provider.isConfigured) {
                  void provider.onLink();
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
                  id={regionId}
                  style={{
                    ...styles.smallText,
                    textAlign: 'left',
                    color: theme.pageTextLight,
                  }}
                >
                  {provider.region}
                </Text>
              </View>
              {!isDisabled && (
                <Text
                  style={{
                    ...styles.mediumText,
                    flexShrink: 0,
                    fontWeight: 500,
                    color: theme.pageTextLink,
                  }}
                >
                  {provider.isConfigured ? (
                    <Trans>Link</Trans>
                  ) : (
                    <Trans>Set up</Trans>
                  )}
                </Text>
              )}
            </Button>
          </li>
        );
      })}
    </ul>
  );
}
