import { useTranslation } from 'react-i18next';

import { theme } from '@actual-app/components/theme';
import { radius } from '@actual-app/components/tokens';
import { View } from '@actual-app/components/view';

export type SyncDotStatus = 'synced' | 'error' | 'pending' | 'unlinked';

export function useSyncDotLabel(status: SyncDotStatus): string {
  const { t } = useTranslation();

  const labels: Record<SyncDotStatus, string> = {
    synced: t('Synced'),
    error: t('Sync error'),
    pending: t('Syncing'),
    unlinked: t('Not linked'),
  };

  return labels[status];
}

type SyncDotProps = {
  status: SyncDotStatus;
};

export function SyncDot({ status }: SyncDotProps) {
  const label = useSyncDotLabel(status);

  return (
    <View
      aria-hidden
      title={label}
      style={{
        width: 7,
        height: 7,
        borderRadius: radius.pill,
        flexShrink: 0,
        ...(status === 'synced' && {
          backgroundColor: theme.sidebarItemBackgroundPositive,
        }),
        ...(status === 'error' && {
          backgroundColor: theme.sidebarItemBackgroundFailed,
        }),
        ...(status === 'pending' && {
          backgroundColor: theme.sidebarItemBackgroundPending,
        }),
        ...(status === 'unlinked' && {
          border: `1.25px solid ${theme.sidebarTextMuted}`,
        }),
      }}
    />
  );
}
