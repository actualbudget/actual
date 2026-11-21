import React from 'react';
import { useTranslation } from 'react-i18next';

import { Checkbox } from '#components/forms';
import { useLocalPref } from '#hooks/useLocalPref';
import { useMetadataPref } from '#hooks/useMetadataPref';
import { addNotification } from '#notifications/notificationsSlice';
import { useDispatch } from '#redux';
import {
  cancelScheduleNotifications,
  requestScheduleNotificationPermission,
} from '#util/scheduleNotifications';

import { SettingsGroup } from './SettingsGroup';
import { SettingsRow } from './SettingsRow';

/**
 * The switch for schedule reminders in the iOS and Android apps. Turning it
 * on is what brings up the system's permission prompt, so the prompt always
 * follows something the user asked for. The reminders themselves are kept up
 * to date by useScheduleNotifications.
 */
export function ScheduleNotificationsSettings() {
  const { t } = useTranslation();
  const dispatch = useDispatch();
  const [budgetId] = useMetadataPref('id');
  const [isEnabled = false, setIsEnabled] = useLocalPref(
    'mobile.scheduleNotifications',
  );

  async function onChange(shouldEnable: boolean) {
    if (!shouldEnable) {
      setIsEnabled(false);
      if (budgetId) {
        await cancelScheduleNotifications(budgetId).catch(() => undefined);
      }
      return;
    }

    const isAllowed = await requestScheduleNotificationPermission().catch(
      () => false,
    );
    if (!isAllowed) {
      // The system only asks once; after a refusal it is the device's
      // settings that have to change.
      dispatch(
        addNotification({
          notification: {
            type: 'warning',
            message: t(
              "Notifications are turned off for Actual. Allow them in your device's settings, then try again.",
            ),
          },
        }),
      );
      return;
    }
    setIsEnabled(true);
  }

  return (
    <SettingsGroup title={t('Notifications')}>
      <SettingsRow
        htmlFor="settings-scheduleNotifications"
        title={t('Schedule reminders')}
        description={t(
          'Get a notification on this device on the morning a scheduled transaction is due.',
        )}
        control={
          <Checkbox
            id="settings-scheduleNotifications"
            checked={isEnabled}
            onChange={e => void onChange(e.currentTarget.checked)}
            style={{ marginRight: 0 }}
          />
        }
      />
    </SettingsGroup>
  );
}
