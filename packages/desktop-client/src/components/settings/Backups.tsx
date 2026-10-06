import React from 'react';
import { useTranslation } from 'react-i18next';

import { SettingsRow } from './SettingsRow';

export function Backups() {
  const { t } = useTranslation();
  const BACKUP_FREQUENCY_MINS = 15;
  const MAX_BACKUPS = 10;

  return (
    <SettingsRow
      title={t('Backups')}
      description={t(
        "Backups are taken every {{BACKUP_FREQUENCY_MINS}} minutes and stored in Actual's data directory. Actual keeps a maximum of {{MAX_BACKUPS}} backups at any time.",
        { BACKUP_FREQUENCY_MINS, MAX_BACKUPS },
      )}
    />
  );
}
