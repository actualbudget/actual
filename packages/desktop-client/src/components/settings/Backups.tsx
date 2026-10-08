import React from 'react';
import { Trans, useTranslation } from 'react-i18next';

import { SettingsRow } from './SettingsRow';

export function Backups() {
  const { t } = useTranslation();
  const BACKUP_FREQUENCY_MINS = 15;
  const MAX_BACKUPS = 10;

  return (
    <SettingsRow
      title={t('Backups')}
      description={
        <Trans>
          Backups are taken every {{ BACKUP_FREQUENCY_MINS }} minutes and stored
          in{' '}
          <span>
            <span>Actual's data directory</span>
          </span>
          . Actual retains a maximum of {{ MAX_BACKUPS }} backups at any time.
        </Trans>
      }
    />
  );
}
