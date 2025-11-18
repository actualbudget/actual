import React, { useState } from 'react';
import { Trans } from 'react-i18next';

import { ButtonWithLoading } from '@actual-app/components/button';
import { Text } from '@actual-app/components/text';

import { send } from 'loot-core/platform/client/fetch';
import { isElectron } from 'loot-core/shared/environment';

import { Setting } from './UI';

import { resetSync } from '@desktop-client/app/appSlice';
import { useMetadataPref } from '@desktop-client/hooks/useMetadataPref';
import { useDispatch } from '@desktop-client/redux';

export function ResetCache() {
  const [resetting, setResetting] = useState(false);

  async function onResetCache() {
    setResetting(true);
    await send('reset-budget-cache');
    setResetting(false);
  }

  return (
    <Setting
      primaryAction={
        <ButtonWithLoading isLoading={resetting} onPress={onResetCache}>
          <Trans>Reset budget cache</Trans>
        </ButtonWithLoading>
      }
    >
      <Text>
        <Trans>
          <strong>Reset budget cache</strong> will clear all cached values for
          the budget and recalculate the entire budget. All values in the budget
          are cached for performance reasons, and if there is a bug in the cache
          you won’t see correct values. There is no danger in resetting the
          cache. Hopefully you never have to do this.
        </Trans>
      </Text>
    </Setting>
  );
}

export function ResetSync() {
  const [groupId] = useMetadataPref('groupId');
  const isEnabled = !!groupId;
  const dispatch = useDispatch();

  const [resetting, setResetting] = useState(false);

  async function onResetSync() {
    setResetting(true);
    await dispatch(resetSync());
    setResetting(false);
  }

  return (
    <Setting
      primaryAction={
        <ButtonWithLoading
          isLoading={resetting}
          isDisabled={!isEnabled}
          onPress={onResetSync}
        >
          <Trans>Reset sync</Trans>
        </ButtonWithLoading>
      }
    >
      {isEnabled ? (
        <Text>
          <Trans>
            <strong>Reset sync</strong> will remove all local data used to track
            changes for syncing, and create a fresh sync ID on the server. This
            file on other devices will have to be re-downloaded to use the new
            sync ID. Use this if there is a problem with syncing and you want to
            start fresh.
          </Trans>
        </Text>
      ) : (
        <Text>
          <Trans>
            <strong>Reset sync</strong> is only available when syncing is
            enabled.
          </Trans>
        </Text>
      )}
    </Setting>
  );
}

export function ForceReload() {
  const [reloading, setReloading] = useState(false);

  async function onForceReload() {
    setReloading(true);
    try {
      if (!isElectron()) {
        const registration =
          await window.navigator.serviceWorker.getRegistration('/');
        if (registration) {
          await registration.update();
          if (registration.waiting) {
            registration.waiting.postMessage({ type: 'SKIP_WAITING' });
          }
        }
      }
    } catch (error) {
      // Do nothing
    } finally {
      window.location.reload();
    }
  }

  return (
    <Setting
      primaryAction={
        <ButtonWithLoading isLoading={reloading} onPress={onForceReload}>
          <Trans>Force reload app</Trans>
        </ButtonWithLoading>
      }
    >
      <Text>
        <Trans>
          <strong>Force reload app</strong> will clear the cached version of the
          app and load a fresh one. This is useful if you&apos;re experiencing
          issues with the app after an update or if cached files are causing
          problems. The app will reload automatically after clearing the cache.
        </Trans>
      </Text>
    </Setting>
  );
}
