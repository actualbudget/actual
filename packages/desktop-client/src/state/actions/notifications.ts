import { t } from 'i18next';
import { v4 as uuidv4 } from 'uuid';

import * as constants from '../constants';
import { type Notification, type NotificationWithId } from '../notifications';

type AddNotificationAction = {
  type: typeof constants.ADD_NOTIFICATION;
  notification: NotificationWithId;
};

type RemoveNotificationAction = {
  type: typeof constants.REMOVE_NOTIFICATION;
  id: string;
};

type SetNotificationInsetAction = {
  type: typeof constants.SET_NOTIFICATION_INSET;
  inset: {
    bottom?: number;
    top?: number;
    right?: number;
    left?: number;
  };
};

export type NotificationsActions =
  | AddNotificationAction
  | RemoveNotificationAction
  | SetNotificationInsetAction;

export function addNotification(
  notification: Notification,
): AddNotificationAction {
  return {
    type: constants.ADD_NOTIFICATION,
    notification: {
      ...notification,
      id: notification.id || uuidv4(),
    },
  };
}

export function addGenericErrorNotification() {
  return addNotification({
    type: 'error',
    message: t(
      'Something internally went wrong. You may want to restart the app if anything looks wrong. ' +
        'Please report this as a new issue on Github.',
    ),
  });
}

export function removeNotification(id: string): RemoveNotificationAction {
  return {
    type: constants.REMOVE_NOTIFICATION,
    id,
  };
}

export function setNotificationInset(
  inset?: SetNotificationInsetAction['inset'] | null,
): SetNotificationInsetAction {
  return {
    type: constants.SET_NOTIFICATION_INSET,
    inset: inset ? inset : {},
  };
}
