import { listen } from 'loot-core/src/platform/client/fetch';
import * as sharedListeners from 'loot-core/src/client/shared-listeners';
import { invalidatePurchaserInfoCache } from './src/util/iap';

export function handleGlobalEvents(actions, store) {
  // listen('server-error', info => {
  //   actions.addGenericErrorNotification();
  // });

  listen('update-loading-status', status => {
    switch (status) {
      case 'updating':
        actions.updateStatusText('Updating...');
        break;
      default:
    }
  });

  listen('sync-event', async ({ type }) => {
    if (type === 'unauthorized') {
      // This means their account expired, so invalidate the purchaser
      // cache to make sure it gets the changes
     await invalidatePurchaserInfoCache();

      let userData = await actions.getUserData();

      let msg;
      if (userData) {
        if (userData.status === 'trial_ended') {
          msg =
            'Your trial has ended. Any changes will not be saved until you subscribe.';
        } else if (userData.status === 'cancelled') {
          msg =
            'Your subscription has been cancelled. Any changes will not be saved until you subscribe again.';
        } else {
          msg =
            'We had problems billing your account. Any changes will not be saved ' +
            'until this is fixed.';
        }
      } else {
        msg =
          'You are not logged in. Any changes will not be saved. Close the budget in settings and log in.';
      }

      actions.addNotification({
        type: 'warning',
        message: msg,
        sticky: true,
        id: 'trial-ended',
        button: userData && {
          title: 'Go to Settings',
          // There is no spoon. Settings modal doesn't exist, this is
          // a hack because right now the only way we can navigate
          // outside of react is to use the modal listener (see ModalListener.js)
          action: async () => {
            actions.pushModal('settings');
          }
        }
      });
    }
  });

  sharedListeners.listenForSyncEvent(actions, store);
}
