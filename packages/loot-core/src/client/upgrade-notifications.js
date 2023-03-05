import { send } from '../platform/client/fetch';

import * as Platform from './platform';

export default function checkForUpgradeNotifications(
  addNotification,
  resetSync,
  // Note: history is only available on desktop
  history,
) {
  // TODO: Probably should only show one of these at at time?
  send('get-upgrade-notifications').then(types => {
    types.forEach(type => {
      switch (type) {
        case 'schedules': {
          let message =
            'Track bills and subscriptions and much more with scheduled transactions. We can search all your existing transactions and try to find existing schedules.\n\n' +
            (global.IS_BETA
              ? 'NOTE: You are using the beta version, and this will not reset your sync data. This is safe to do.'
              : '');

          if (Platform.env === 'mobile') {
            message =
              'Track bills and subscriptions and much more with scheduled transactions. Upcoming transactions will be shown in the accounts screen. Use the desktop app to create schedules.';
          }

          addNotification({
            type: 'message',
            title: 'Scheduled transactions are now available!',
            message,
            sticky: true,
            id: 'find-schedules',
            button: Platform.env !== 'mobile' && {
              title: 'Find schedules',
              action: async () => {
                window.__history &&
                  window.__history.push('/schedule/discover', {
                    locationPtr: window.__history.location,
                  });
              },
            },
            onClose: () => {
              send('seen-upgrade-notification', { type: 'schedules' });
            },
          });
          break;
        }

        case 'repair-splits':
          if (history) {
            addNotification({
              type: 'message',
              title: 'Split transactions now support transfers & payees',
              message:
                'The payee field is now available on split transactions, allowing you to perform transfers on individual split transactions.\n\nAll existing split transactions have a blank payee and we recommend using the tool below to set the payee from the parent. [View a video walkthrough](https://www.youtube.com/watch?v=5kTtAsB0Oqk)',
              sticky: true,
              id: 'repair-splits',
              button: {
                title: 'Repair splits...',
                action: () =>
                  history.push('/tools/fix-splits', {
                    locationPtr: history.location,
                  }),
              },
              onClose: () => {
                send('seen-upgrade-notification', { type: 'repair-splits' });
              },
            });
          }
          break;

        default:
      }
    });
  });
}
