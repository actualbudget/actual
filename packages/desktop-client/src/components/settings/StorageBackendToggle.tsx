import { useEffect, useState } from 'react';
import { Trans, useTranslation } from 'react-i18next';

import { Text } from '@actual-app/components/text';
import { theme } from '@actual-app/components/theme';
import {
  getStoredStorageBackend,
  setStoredStorageBackend,
} from '@actual-app/core/platform/client/browser-preload';
import type { StorageBackend } from '@actual-app/core/platform/client/browser-preload';
import { send } from '@actual-app/core/platform/client/connection';

import { Checkbox } from '#components/forms';
import { addNotification } from '#notifications/notificationsSlice';
import { useDispatch } from '#redux';
import {
  describePreviousStorageError,
  returnToPreviousStorage,
} from '#util/previous-storage';

import { SettingsRow } from './SettingsRow';

/**
 * Opt-in to the sqlite-wasm storage for budget files while it is being
 * tried out. Switching on only stores the choice: budgets move over when
 * they are next opened. Switching off moves every budget back first, so
 * nothing is lost either way. Both relaunch the app.
 */
export function StorageBackendToggle() {
  const { t } = useTranslation();
  const dispatch = useDispatch();
  const [activeBackend, setActiveBackend] = useState<StorageBackend | null>(
    null,
  );
  const [isSwitching, setIsSwitching] = useState(false);
  // The engine actually running decides, so the box agrees with the
  // description and one click puts the stored choice right when they differ
  const isEnabled = (activeBackend ?? getStoredStorageBackend()) !== 'legacy';

  useEffect(() => {
    let isCancelled = false;
    void send('storage-info')
      .then(info => {
        if (!isCancelled) {
          setActiveBackend(info.backend);
        }
      })
      .catch(() => {
        // No answer from the backend: the stored choice decides
      });
    return () => {
      isCancelled = true;
    };
  }, []);

  async function toggle() {
    setIsSwitching(true);
    if (isEnabled) {
      const error = await returnToPreviousStorage();
      if (error) {
        dispatch(
          addNotification({
            notification: {
              type: 'error',
              message: describePreviousStorageError(error),
            },
          }),
        );
        setIsSwitching(false);
      }
      return;
    }
    setStoredStorageBackend('opfs');
    window.Actual.relaunch();
  }

  const backendDescription =
    activeBackend === 'opfs'
      ? t('private file system (OPFS)')
      : activeBackend === 'memory-idb'
        ? t('in memory, saved to IndexedDB')
        : activeBackend === 'legacy'
          ? t('absurd-sql, IndexedDB blocks (current engine)')
          : null;

  return (
    <SettingsRow
      htmlFor="settings-storage-backend"
      title={<Trans>New browser storage engine</Trans>}
      description={
        <Text style={{ color: theme.warningText }}>
          <Trans>
            Keeps budget files in the browser's private file system using
            SQLite's own WebAssembly build. Budgets move over when they are next
            opened. Close Actual in all other tabs before changing this; the app
            reloads.
          </Trans>{' '}
          {backendDescription && (
            <Trans>Currently active: {{ backendDescription }}.</Trans>
          )}
        </Text>
      }
      control={
        <Checkbox
          id="settings-storage-backend"
          checked={isEnabled}
          disabled={isSwitching}
          onChange={() => void toggle()}
          style={{ marginRight: 0 }}
        />
      }
    />
  );
}
