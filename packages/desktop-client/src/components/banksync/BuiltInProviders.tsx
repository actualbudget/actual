import { Dialog, DialogTrigger } from 'react-aria-components';
import { Trans, useTranslation } from 'react-i18next';

import { Button, ButtonWithLoading } from '@actual-app/components/button';
import { SvgDotsHorizontalTriple } from '@actual-app/components/icons/v1';
import { Menu } from '@actual-app/components/menu';
import { Popover } from '@actual-app/components/popover';
import { styles } from '@actual-app/components/styles';
import { Text } from '@actual-app/components/text';
import { theme } from '@actual-app/components/theme';
import { spacing } from '@actual-app/components/tokens';
import { View } from '@actual-app/components/view';

import { BankSyncPermissionWarning } from './BankSyncPermissionWarning';
import { BankSyncServerRequired } from './BankSyncServerRequired';
import { getProviderStatusText } from './bankSyncUtils';
import type { BuiltInBankSyncProviderState } from './useBuiltInBankSyncProviders';

type BuiltInProvidersProps = {
  providers: BuiltInBankSyncProviderState[];
  syncServerStatus: 'offline' | 'no-server' | 'online';
  permissionWarning: 'general' | 'file-owner' | null;
};

export function BuiltInProviders({
  providers,
  syncServerStatus,
  permissionWarning,
}: BuiltInProvidersProps) {
  const { t } = useTranslation();

  if (syncServerStatus !== 'online') {
    return <BankSyncServerRequired syncServerStatus={syncServerStatus} />;
  }

  return (
    <View style={{ gap: spacing.md, flexShrink: 0 }}>
      {permissionWarning && (
        <BankSyncPermissionWarning permissionWarning={permissionWarning} />
      )}

      <ul
        // oxlint-disable-next-line jsx-a11y/no-redundant-roles -- list-style none drops list semantics in Safari
        role="list"
        aria-label={t('Providers')}
        style={{
          listStyle: 'none',
          margin: 0,
          padding: 0,
          border: `1px solid ${theme.tableBorder}`,
          borderRadius: 6,
          backgroundColor: theme.tableBackground,
          overflow: 'hidden',
        }}
      >
        {providers.map((provider, index) => (
          <li
            key={provider.id}
            data-testid={`bank-sync-provider-${provider.id}`}
            style={{
              display: 'flex',
              flexDirection: 'column',
              padding: `${spacing.sm}px ${spacing.md}px`,
              gap: spacing.xs,
              borderTop:
                index === 0 ? undefined : `1px solid ${theme.tableBorder}`,
            }}
          >
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: spacing.sm,
              }}
            >
              <View
                style={{
                  flex: '1 1 160px',
                  minWidth: 0,
                  gap: spacing.xxs,
                }}
              >
                <Text style={{ ...styles.mediumText, fontWeight: 600 }}>
                  {provider.displayName}
                </Text>
                <Text
                  style={{
                    ...styles.smallText,
                    color: provider.isConfigured
                      ? theme.noticeTextDark
                      : theme.pageTextLight,
                  }}
                >
                  {getProviderStatusText(provider, t)}
                </Text>
              </View>

              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  flexWrap: 'wrap',
                  gap: spacing.sm,
                }}
              >
                <Button
                  variant={provider.isConfigured ? 'bare' : 'normal'}
                  isDisabled={!provider.canConfigure}
                  aria-label={
                    provider.isConfigured
                      ? t('Edit setup for {{provider}}', {
                          provider: provider.displayName,
                        })
                      : t('Set up {{provider}}', {
                          provider: provider.displayName,
                        })
                  }
                  onPress={() => provider.onConfigure()}
                >
                  {provider.isConfigured ? (
                    <Trans>Edit setup</Trans>
                  ) : (
                    <Trans>Set up</Trans>
                  )}
                </Button>
                {provider.isConfigured && (
                  <ButtonWithLoading
                    isLoading={provider.isLoading}
                    aria-label={t('Link bank account with {{provider}}', {
                      provider: provider.displayName,
                    })}
                    onPress={() => provider.onLink()}
                  >
                    <Trans>Link bank account</Trans>
                  </ButtonWithLoading>
                )}
                {provider.isConfigured && (
                  <DialogTrigger>
                    <Button
                      variant="bare"
                      aria-label={t('{{provider}} menu', {
                        provider: provider.displayName,
                      })}
                    >
                      <SvgDotsHorizontalTriple
                        width={15}
                        height={15}
                        style={{ transform: 'rotateZ(90deg)' }}
                      />
                    </Button>

                    <Popover>
                      <Dialog>
                        <Menu
                          onMenuSelect={item => {
                            if (item === 'reset') {
                              void provider.onReset();
                            }
                          }}
                          items={[
                            { name: 'reset', text: t('Reset credentials') },
                          ]}
                        />
                      </Dialog>
                    </Popover>
                  </DialogTrigger>
                )}
              </View>
            </View>
            {provider.supportsPerBudgetFile &&
              provider.credentialSource === 'global' &&
              !provider.canConfigure && (
                <Text
                  style={{ ...styles.smallText, color: theme.pageTextLight }}
                >
                  <Trans>
                    Reset credentials before setting credentials for this budget
                    file.
                  </Trans>
                </Text>
              )}
          </li>
        ))}
      </ul>
    </View>
  );
}
