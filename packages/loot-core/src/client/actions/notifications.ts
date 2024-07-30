import { v4 as uuidv4 } from 'uuid';

import * as constants from '../constants';
import type {
  AddNotificationAction,
  RemoveNotificationAction,
  Notification,
  SetNotificationInsetAction,
} from '../state-types/notifications';

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
    message:
      'Something internally went wrong. You may want to restart the app if anything looks wrong. ' +
      'Please report this as a new issue on Github.',
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
