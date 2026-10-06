import React, { useState } from 'react';
import { Trans, useTranslation } from 'react-i18next';

import { ButtonWithLoading } from '@actual-app/components/button';
import { send } from '@actual-app/core/platform/client/connection';

import { resetSync } from '#app/appSlice';
import { useMetadataPref } from '#hooks/useMetadataPref';
import { useDispatch } from '#redux';

import { SettingsRow } from './SettingsRow';

export function ResetCache() {
  const { t } = useTranslation();
  const [resetting, setResetting] = useState(false);

  async function onResetCache() {
    setResetting(true);
    await send('reset-budget-cache');
    setResetting(false);
  }

  return (
    <SettingsRow
      title={t('Budget cache')}
      description={t(
        'Resetting the budget cache clears all cached values and recalculates the entire budget. Budget values are cached for performance, and a bug in the cache can show incorrect values. There is no danger in resetting it.',
      )}
      control={
        <ButtonWithLoading isLoading={resetting} onPress={onResetCache}>
          <Trans>Reset budget cache</Trans>
        </ButtonWithLoading>
      }
    />
  );
}

export function ResetSync() {
  const { t } = useTranslation();
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
    <SettingsRow
      title={t('Sync')}
      description={t(
        'Resetting sync removes all local data used to track changes for syncing and creates a fresh sync ID on the server. This file will have to be downloaded again on other devices to use the new sync ID. Use this if there is a problem with syncing and you want to start fresh. It is only available when syncing is enabled.',
      )}
      control={
        <ButtonWithLoading
          isLoading={resetting}
          isDisabled={!isEnabled}
          onPress={onResetSync}
        >
          <Trans>Reset sync</Trans>
        </ButtonWithLoading>
      }
    />
  );
}
