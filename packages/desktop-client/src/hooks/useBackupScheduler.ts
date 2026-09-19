import { useEffect, useEffectEvent } from 'react';
import { useTranslation } from 'react-i18next';

import { listen } from '@actual-app/core/platform/client/connection';
import { isElectron } from '@actual-app/core/shared/environment';

import {
  clearBackupState,
  createBackupScheduler,
  getBackupState,
  getLastBackupAt,
  getLastChangeAt,
  getSupportedProviders,
  listenForBackupChanges,
  loadBackupState,
  performBackup,
  setLastChangeAt,
  subscribeBackupState,
} from '#backups';
import { useFeatureFlag } from '#hooks/useFeatureFlag';
import { useMetadataPref } from '#hooks/useMetadataPref';
import { useNavigate } from '#hooks/useNavigate';
import { addNotification } from '#notifications/notificationsSlice';
import { useDispatch } from '#redux';

const PAUSED_NOTIFICATION_ID = 'backups-paused';

/**
 * Runs automatic backups to the user's chosen destination while a budget
 * is open. Every tab loads the backup state so the settings panel can show
 * it, but only one tab (the holder of a Web Lock) runs the scheduler, and
 * another tab takes over automatically when it closes.
 */
export function useBackupScheduler() {
  const [budgetId] = useMetadataPref('id');
  const [budgetName] = useMetadataPref('budgetName');
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { t } = useTranslation();

  const isAutomaticBackupsEnabled = useFeatureFlag('automaticBackups');
  const isEnabled =
    isAutomaticBackupsEnabled &&
    !isElectron() &&
    getSupportedProviders().length > 0;

  const runBackup = useEffectEvent(async () => {
    if (!budgetId) {
      return;
    }
    const result = await performBackup({
      budgetId,
      budgetName: budgetName ?? 'budget',
    });
    if (result.ok === false && result.reason === 'access-lost') {
      dispatch(
        addNotification({
          notification: {
            id: PAUSED_NOTIFICATION_ID,
            type: 'warning',
            sticky: true,
            title: t('Automatic backups are paused'),
            message: t(
              'Actual lost access to your backup location. Allow access again to keep backing up.',
            ),
            button: {
              title: t('Open settings'),
              action: () => navigate('/settings'),
            },
          },
        }),
      );
    }
  });

  const loadState = useEffectEvent(async () => {
    if (budgetId) {
      await loadBackupState({ budgetId, budgetName: budgetName ?? 'budget' });
    }
  });

  useEffect(() => {
    if (!isEnabled || !budgetId) {
      return;
    }

    let isCancelled = false;
    let releaseLock: (() => void) | null = null;
    const lockHeld = new Promise<void>(resolve => {
      releaseLock = resolve;
    });

    void loadState();
    const unlistenChanges = listenForBackupChanges(budgetId, () => {
      void loadState();
    });

    if ('locks' in navigator) {
      void navigator.locks.request(`actual-backups:${budgetId}`, async () => {
        if (isCancelled) {
          return;
        }

        // Another tab may have changed the destination while it held the
        // lock.
        await loadState();

        const scheduler = createBackupScheduler({
          isAllowed: () => getBackupState().status === 'ready',
          getLastBackupAt: () => getLastBackupAt(budgetId),
          getLastChangeAt: () => getLastChangeAt(budgetId),
          setLastChangeAt: time => setLastChangeAt(budgetId, time),
          runBackup,
        });

        const unlistenSync = listen('sync-event', event => {
          if (event.type === 'applied') {
            scheduler.notifyChange();
          }
        });
        const unsubscribeState = subscribeBackupState(() =>
          scheduler.reevaluate(),
        );
        const onVisibilityChange = () => {
          if (document.visibilityState === 'visible') {
            scheduler.reevaluate();
          }
        };
        document.addEventListener('visibilitychange', onVisibilityChange);

        scheduler.reevaluate();
        await lockHeld;

        document.removeEventListener('visibilitychange', onVisibilityChange);
        unsubscribeState();
        unlistenSync();
        scheduler.stop();
      });
    }

    return () => {
      isCancelled = true;
      releaseLock?.();
      unlistenChanges();
      clearBackupState();
    };
  }, [budgetId, isEnabled]);
}
