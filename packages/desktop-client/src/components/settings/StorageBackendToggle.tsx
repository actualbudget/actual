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

import { SettingsRow } from './SettingsRow';

/**
 * Opt-in to the sqlite-wasm storage for budget files (hidden behind a dev
 * flag while it is being tried out). Switching on only stores the choice:
 * budgets move over when they are next opened. Switching off moves every
 * budget back first, so nothing is lost either way. Both relaunch the app.
 */
export function StorageBackendToggle() {
  const { t } = useTranslation();
  const dispatch = useDispatch();
  const [activeBackend, setActiveBackend] = useState<StorageBackend | null>(
    null,
  );
  const [isSwitching, setIsSwitching] = useState(false);
  const isEnabled = getStoredStorageBackend() !== 'legacy';

  useEffect(() => {
    let isCancelled = false;
    void send('storage-info').then(info => {
      if (!isCancelled) {
        setActiveBackend(info.backend);
      }
    });
    return () => {
      isCancelled = true;
    };
  }, []);

  async function toggle() {
    setIsSwitching(true);
    if (isEnabled) {
      const result = await send('storage-revert');
      if ('error' in result) {
        dispatch(
          addNotification({
            notification: {
              type: 'error',
              message:
                result.error === 'budget-in-use'
                  ? t('Close Actual in your other tabs first, then try again.')
                  : t('Switching back failed. Nothing was changed.'),
            },
          }),
        );
        setIsSwitching(false);
        return;
      }
      setStoredStorageBackend('legacy');
    } else {
      setStoredStorageBackend('opfs');
    }
    window.Actual.relaunch();
  }

  const backendDescription =
    activeBackend === 'opfs'
      ? t('private file system (OPFS)')
      : activeBackend === 'memory-idb'
        ? t('in memory, saved to IndexedDB')
        : activeBackend === 'legacy'
          ? t('IndexedDB blocks (current engine)')
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
