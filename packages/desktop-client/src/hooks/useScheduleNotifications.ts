import { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';

import * as Platform from '@actual-app/core/shared/platform';
import { q } from '@actual-app/core/shared/query';
import { getScheduledAmount } from '@actual-app/core/shared/schedules';
import type { ScheduleEntity } from '@actual-app/core/types/models';
import { LocalNotifications } from '@capacitor/local-notifications';

import {
  buildScheduleNotifications,
  hasScheduleNotificationPermission,
  replaceScheduleNotifications,
} from '#util/scheduleNotifications';

import { useFormat } from './useFormat';
import { useLocalPref } from './useLocalPref';
import { useMetadataPref } from './useMetadataPref';
import { useNavigate } from './useNavigate';
import { usePayeesById } from './usePayees';
import { useSchedules } from './useSchedules';

const allSchedulesQuery = q('schedules').select('*');

/**
 * Inside the iOS and Android apps, keeps the device's pending reminders in
 * step with the open budget's schedules while its "Schedule reminders"
 * setting is on, and opens the schedules page when a reminder is tapped.
 * Turning the setting off is what removes the reminders (see
 * ScheduleNotificationsSettings). Does nothing on the web and desktop.
 */
export function useScheduleNotifications() {
  const { t } = useTranslation();
  const format = useFormat();
  const navigate = useNavigate();
  const [budgetId] = useMetadataPref('id');
  const [isEnabledPref] = useLocalPref('mobile.scheduleNotifications');
  const isEnabled = Platform.isNativeMobileApp && isEnabledPref === true;

  const { schedules, statuses, isLoading } = useSchedules({
    query: isEnabled ? allSchedulesQuery : undefined,
  });
  const { data: payeesById } = usePayeesById();

  // Rebuilding the pending set takes several native calls, so runs are
  // queued one after another, and a run that would change nothing is skipped.
  const queue = useRef<Promise<void>>(Promise.resolve());
  const lastSynced = useRef<string | null>(null);

  useEffect(() => {
    if (!isEnabled || !budgetId || isLoading || !payeesById) {
      return;
    }

    function getBody(schedule: ScheduleEntity) {
      const name =
        schedule.name ||
        (schedule._payee && payeesById?.[schedule._payee]?.name) ||
        t('Unnamed schedule');
      const amount = getScheduledAmount(schedule._amount);
      const amountStr =
        (schedule._amountOp === 'isapprox' || schedule._amountOp === 'isbetween'
          ? '~'
          : '') + format(amount, 'financial');
      return `${name}: ${amountStr}`;
    }

    const notifications = buildScheduleNotifications({
      budgetId,
      schedules,
      statuses,
      title: t('Scheduled transaction due today'),
      getBody,
    });
    const key = JSON.stringify([budgetId, notifications]);

    queue.current = queue.current
      .then(async () => {
        if (lastSynced.current === key) {
          return;
        }
        // The permission can be withdrawn in the system settings at any
        // time. Nothing is recorded as synced then, so the reminders come
        // back once it is granted again.
        if (await hasScheduleNotificationPermission()) {
          await replaceScheduleNotifications(budgetId, notifications);
          lastSynced.current = key;
        }
      })
      .catch(() => {
        // Reminders are best effort: a failure here (e.g. a native shell
        // without the plugin) must not disturb the app.
      });
  }, [
    isEnabled,
    budgetId,
    isLoading,
    schedules,
    statuses,
    payeesById,
    t,
    format,
  ]);

  useEffect(() => {
    if (!Platform.isNativeMobileApp) {
      return;
    }

    const listener = LocalNotifications.addListener(
      'localNotificationActionPerformed',
      () => void navigate('/schedules'),
    );
    return () => {
      void listener.then(handle => handle.remove());
    };
  }, [navigate]);
}
