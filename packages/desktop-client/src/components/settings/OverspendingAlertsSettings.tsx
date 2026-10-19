import React from 'react';
import { Trans, useTranslation } from 'react-i18next';

import { Text } from '@actual-app/components/text';

import { Checkbox } from '#components/forms';
import { useSyncedPref } from '#hooks/useSyncedPref';

import { SettingsRow } from './SettingsRow';

export function OverspendingAlertsSettings() {
  const { t } = useTranslation();
  const [overspendingAlerts, setOverspendingAlertsPref] =
    useSyncedPref('overspendingAlerts');

  return (
    <SettingsRow
      htmlFor="settings-overspendingAlerts"
      title={t('Overspending alerts')}
      description={
        <Text>
          <Trans>
            Show a notification on the budget page when a category becomes
            overspent in the months you are viewing.
          </Trans>
        </Text>
      }
      control={
        <Checkbox
          id="settings-overspendingAlerts"
          checked={String(overspendingAlerts) !== 'false'}
          onChange={e =>
            setOverspendingAlertsPref(String(e.currentTarget.checked))
          }
          style={{ marginRight: 0 }}
        />
      }
    />
  );
}
