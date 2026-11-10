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
      description={
        <Trans>
          <span>Reset budget cache</span> will clear all cached values for the
          budget and recalculate the entire budget. All values in the budget are
          cached for performance reasons, and if there is a bug in the cache you
          won't see correct values. There is no danger in resetting the cache.
          Hopefully you never have to do this.
        </Trans>
      }
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
  const dispatch = useDispatch();

  const [resetting, setResetting] = useState(false);

  async function onResetSync() {
    setResetting(true);
    await dispatch(resetSync());
    setResetting(false);
  }

  if (!groupId) {
    return null;
  }

  return (
    <SettingsRow
      title={t('Sync')}
      description={
        <Trans>
          Reset sync will remove all local data used to track changes for
          syncing, and create a fresh sync ID on the server. This file on other
          devices will have to be re-downloaded to use the new sync ID. Use this
          if there is a problem with syncing and you want to start fresh. This
          can also improve performance on large budgets.
        </Trans>
      }
      control={
        <ButtonWithLoading isLoading={resetting} onPress={onResetSync}>
          <Trans>Reset sync</Trans>
        </ButtonWithLoading>
      }
    />
  );
}
