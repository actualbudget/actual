import constants from '../constants';

const uuid = require('../../platform/uuid');

export function addNotification(notification) {
  return {
    type: constants.ADD_NOTIFICATION,
    notification: {
      ...notification,
      id: notification.id || uuid.v4Sync()
    }
  };
}

export function addGenericErrorNotification() {
  return addNotification({
    type: 'error',
    message:
      'Something internally went wrong. You may want to restart the app if anything looks wrong. ' +
      'We have been notified of the issue and will try to fix it soon.'
  });
}

export function removeNotification(id) {
  return {
    type: constants.REMOVE_NOTIFICATION,
    id
  };
}
