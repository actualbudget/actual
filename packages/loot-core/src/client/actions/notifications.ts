import * as uuid from '../../platform/uuid';
import * as constants from '../constants';

export function addNotification(notification) {
  return {
    type: constants.ADD_NOTIFICATION,
    notification: {
      ...notification,
      id: notification.id || uuid.v4Sync(),
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

export function removeNotification(id) {
  return {
    type: constants.REMOVE_NOTIFICATION,
    id,
  };
}
