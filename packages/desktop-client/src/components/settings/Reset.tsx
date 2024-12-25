import React, { useState } from 'react';
import { Trans } from 'react-i18next';
import { useDispatch } from 'react-redux';

import { resetSync } from 'loot-core/client/actions';
import { send } from 'loot-core/src/platform/client/fetch';

import { useMetadataPref } from '../../hooks/useMetadataPref';
import { ButtonWithLoading } from '../common/Button2';
import { Text } from '../common/Text';

import { Setting } from './UI';

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
          </Trans>
        </Text>
      )}
    </Setting>
  );
}
