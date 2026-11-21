import * as monthUtils from '@actual-app/core/shared/months';
import type { ScheduleStatuses } from '@actual-app/core/shared/schedules';
import type { ScheduleEntity } from '@actual-app/core/types/models';
import { LocalNotifications } from '@capacitor/local-notifications';

// Reminders for scheduled transactions in the iOS and Android apps. They are
// local notifications: the device itself fires them at a set time, so they
// arrive while the app is closed and nothing is sent to a server. The other
// side of that is that they are only as fresh as the last time the app was
// open, which is when the pending set is rebuilt from the schedules.

/** Local hour of the due date at which the reminder is shown. */
const NOTIFICATION_HOUR = 9;

// iOS keeps only the soonest 64 pending notifications per app and silently
// drops the rest. Staying under that keeps what was asked for and what is
// pending the same.
const MAX_PENDING_NOTIFICATIONS = 60;

export type ScheduleNotification = {
  id: number;
  title: string;
  body: string;
  at: Date;
};

type BuildScheduleNotificationsOptions = {
  budgetId: string;
  schedules: readonly ScheduleEntity[];
  statuses: ScheduleStatuses;
  /** Title shown on every reminder. */
  title: string;
  /** The line describing one schedule, e.g. "Rent: -1,200.00". */
  getBody: (schedule: ScheduleEntity) => string;
  now?: Date;
};

/**
 * One reminder per schedule, on the morning of its next date. Schedules that
 * are completed or already paid for that date get none, and neither does one
 * whose reminder time has already passed.
 */
export function buildScheduleNotifications({
  budgetId,
  schedules,
  statuses,
  title,
  getBody,
  now = new Date(),
}: BuildScheduleNotificationsOptions): ScheduleNotification[] {
  return schedules
    .flatMap(schedule => {
      const status = statuses.get(schedule.id);
      if (
        !schedule.next_date ||
        schedule.completed ||
        status === 'completed' ||
        status === 'paid'
      ) {
        return [];
      }

      const at = monthUtils.parseDate(schedule.next_date);
      at.setHours(NOTIFICATION_HOUR, 0, 0, 0);
      if (at <= now) {
        return [];
      }

      return [
        {
          id: getNotificationId(`${budgetId}:${schedule.id}`),
          title,
          body: getBody(schedule),
          at,
        },
      ];
    })
    .sort((a, b) => a.at.getTime() - b.at.getTime() || a.id - b.id)
    .slice(0, MAX_PENDING_NOTIFICATIONS);
}

// The native side identifies a notification by a 32-bit integer (a Java
// int on Android), so the budget and schedule ids are hashed down to one.
function getNotificationId(key: string) {
  let hash = 0;
  for (let i = 0; i < key.length; i++) {
    hash = (Math.imul(hash, 31) + key.charCodeAt(i)) | 0;
  }
  return Math.abs(hash) % 2147483647;
}

export async function hasScheduleNotificationPermission() {
  const { display } = await LocalNotifications.checkPermissions();
  return display === 'granted';
}

/** Shows the system permission prompt if the user has not answered it yet. */
export async function requestScheduleNotificationPermission() {
  const { display } = await LocalNotifications.requestPermissions();
  return display === 'granted';
}

// Each budget on the device has its own setting and its own reminders, so a
// reminder carries the id of the budget it came from and a budget only ever
// replaces its own.
export async function cancelScheduleNotifications(budgetId: string) {
  const { notifications } = await LocalNotifications.getPending();
  const ownNotifications = notifications.filter(
    notification => notification.extra?.budgetId === budgetId,
  );
  if (ownNotifications.length > 0) {
    await LocalNotifications.cancel({
      notifications: ownNotifications.map(({ id }) => ({ id })),
    });
  }
}

/** Replaces the budget's pending reminders with the given ones. */
export async function replaceScheduleNotifications(
  budgetId: string,
  notifications: ScheduleNotification[],
) {
  await cancelScheduleNotifications(budgetId);
  if (notifications.length > 0) {
    await LocalNotifications.schedule({
      notifications: notifications.map(({ id, title, body, at }) => ({
        id,
        title,
        body,
        extra: { budgetId },
        // Still delivered when the device is in Doze mode (Android).
        schedule: { at, allowWhileIdle: true },
      })),
    });
  }
}
