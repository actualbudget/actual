import { useEffect, useState } from 'react';
import { Trans, useTranslation } from 'react-i18next';

import { Button } from '@actual-app/components/button';
import { theme } from '@actual-app/components/theme';
import { View } from '@actual-app/components/view';
import { listen } from '@actual-app/core/platform/client/connection';
import { tsToRelativeTime } from '@actual-app/core/shared/util';

import { sync } from '#app/appSlice';
import { AnimatedRefresh } from '#components/AnimatedRefresh';
import { useLocale } from '#hooks/useLocale';
import { useDispatch } from '#redux';

type AccountsSyncStatusProps = {
  showLabel?: boolean;
};

// There's no existing "last successful sync" timestamp anywhere in app
// state (only per-account bank-sync timestamps) — this listens to the same
// sync-event stream the titlebar's sync button uses and tracks it locally.
export function AccountsSyncStatus({
  showLabel = true,
}: AccountsSyncStatusProps) {
  const { t } = useTranslation();
  const locale = useLocale();
  const dispatch = useDispatch();
  const [syncing, setSyncing] = useState(false);
  const [lastSyncedAt, setLastSyncedAt] = useState<string | null>(null);

  useEffect(() => {
    const unlisten = listen('sync-event', event => {
      if (event.type === 'start') {
        setSyncing(true);
      } else {
        setSyncing(false);
        if (event.type === 'success') {
          setLastSyncedAt(String(Date.now()));
        }
      }
    });
    return unlisten;
  }, []);

  const onSync = () => void dispatch(sync());

  const label = syncing
    ? t('Syncing…')
    : lastSyncedAt
      ? t('Synced {{relativeTime}}', {
          relativeTime: tsToRelativeTime(lastSyncedAt, locale),
        })
      : t('Sync');

  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 6,
      }}
    >
      {showLabel && (
        <span
          style={{
            fontSize: 10,
            letterSpacing: 1.4,
            color: theme.pageTextSubdued,
            textTransform: 'uppercase',
          }}
        >
          <Trans>Accounts</Trans>
        </span>
      )}
      <Button
        variant="bare"
        aria-label={label}
        onPress={onSync}
        style={{
          display: 'flex',
          flexDirection: 'row',
          alignItems: 'center',
          gap: 4,
          fontSize: 10.5,
          color: theme.pageTextSubdued,
          marginLeft: showLabel ? undefined : 'auto',
        }}
      >
        <AnimatedRefresh
          animating={syncing}
          width={11}
          height={11}
          iconStyle={{ color: theme.sidebarItemBackgroundPositive }}
        />
        {showLabel && label}
      </Button>
    </View>
  );
}
