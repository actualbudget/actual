import React from 'react';
import type { ComponentType, SVGProps } from 'react';
import { Trans, useTranslation } from 'react-i18next';

import { Button } from '@actual-app/components/button';
import { SvgCloud, SvgFolder } from '@actual-app/components/icons/v1';
import { Text } from '@actual-app/components/text';
import { theme } from '@actual-app/components/theme';
import { View } from '@actual-app/components/view';

import type { BackupDestinationKind, BackupProvider } from '#backups';

type ProviderCopy = {
  name: string;
  description: string;
  connect: string;
  change: string;
  /** Shown instead of a button when this browser cannot use the provider. */
  unsupportedReason: string;
  Icon: ComponentType<SVGProps<SVGSVGElement>>;
};

/**
 * User-facing copy for each backup provider. Providers themselves carry no
 * strings, so adding a provider means adding an entry here.
 */
function useProviderCopy(): Record<BackupDestinationKind, ProviderCopy> {
  const { t } = useTranslation();
  return {
    folder: {
      name: t('Folder on this device'),
      description: t(
        'Saves backup files to a folder you choose on this device.',
      ),
      connect: t('Choose backup folder'),
      change: t('Change folder'),
      unsupportedReason: t(
        'Not supported in this browser. Works in Chrome, Edge and other Chromium-based desktop browsers.',
      ),
      Icon: SvgFolder,
    },
    'google-drive': {
      name: t('Google Drive'),
      description: t('Back up to a folder in your Google Drive.'),
      connect: t('Connect'),
      change: t('Change account'),
      unsupportedReason: t('Not supported in this browser.'),
      Icon: SvgCloud,
    },
  };
}

type BackupDestinationListProps = {
  providers: BackupProvider[];
  connectedKind: BackupDestinationKind | null;
  connectedLabel: string | null;
  onConnect: (kind: BackupDestinationKind) => void;
};

/**
 * Lists every backup destination Actual knows about, including ones that
 * are not available in this browser or not built yet, so people can see
 * what exists and why an option cannot be used.
 */
export function BackupDestinationList({
  providers,
  connectedKind,
  connectedLabel,
  onConnect,
}: BackupDestinationListProps) {
  const copy = useProviderCopy();
  const hasConnection = connectedKind !== null;

  return (
    <View style={{ gap: 10, width: '100%' }}>
      {providers.map(provider => {
        const providerCopy = copy[provider.kind];
        const isConnected = provider.kind === connectedKind;
        const isComingSoon = provider.availability === 'coming-soon';
        const isSupported = !isComingSoon && provider.isSupported();

        return (
          <View
            key={provider.kind}
            data-testid={`backup-destination-${provider.kind}`}
            style={{
              flexDirection: 'row',
              alignItems: 'flex-start',
              gap: 12,
              padding: 12,
              borderRadius: 8,
              border: '1px solid ' + theme.tableBorder,
              // Differs from the surrounding Setting background in every theme
              // (pillBackground vs pillBackgroundLight), unlike tableBackground.
              backgroundColor: theme.pillBackgroundLight,
            }}
          >
            <providerCopy.Icon
              width={20}
              height={20}
              style={{
                color: theme.pageTextLight,
                flexShrink: 0,
                marginTop: 2,
              }}
            />
            <View style={{ flex: 1, gap: 4, minWidth: 0 }}>
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  flexWrap: 'wrap',
                  gap: 8,
                }}
              >
                <Text style={{ fontSize: 15, fontWeight: 600 }}>
                  {providerCopy.name}
                </Text>
                {isConnected && (
                  <Text
                    style={{
                      color: theme.noticeTextDark,
                      fontSize: 13,
                      fontWeight: 500,
                    }}
                  >
                    {connectedLabel ? (
                      <Trans>Connected: {{ connectedLabel }}</Trans>
                    ) : (
                      <Trans>Connected</Trans>
                    )}
                  </Text>
                )}
                {isComingSoon && (
                  <Text
                    style={{
                      borderRadius: 999,
                      backgroundColor: theme.pillBackground,
                      color: theme.pageText,
                      fontSize: 12,
                      fontWeight: 500,
                      padding: '2px 8px',
                    }}
                  >
                    <Trans>Coming soon</Trans>
                  </Text>
                )}
              </View>
              <Text style={{ color: theme.pageTextLight, fontSize: 13 }}>
                {providerCopy.description}
              </Text>
              {isComingSoon && (
                <Text style={{ color: theme.pageTextLight, fontSize: 13 }}>
                  <Trans>This option is not available yet.</Trans>
                </Text>
              )}
              {!isComingSoon && !isSupported && (
                <Text style={{ color: theme.warningText, fontSize: 13 }}>
                  {providerCopy.unsupportedReason}
                </Text>
              )}
            </View>
            {isSupported && (
              <Button
                variant={isConnected || hasConnection ? 'normal' : 'primary'}
                onPress={() => onConnect(provider.kind)}
                style={{ flexShrink: 0 }}
              >
                {isConnected ? providerCopy.change : providerCopy.connect}
              </Button>
            )}
          </View>
        );
      })}
    </View>
  );
}
