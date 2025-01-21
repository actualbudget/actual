// @ts-strict-ignore
import { t } from 'i18next';

import { listen, send } from '../platform/client/fetch';

import { addNotification, loadPrefs, signOut } from './actions';
import { resetSync, sync } from './app/appSlice';
import { closeAndDownloadBudget, uploadBudget } from './budgets/budgetsSlice';
import { pushModal } from './modals/modalsSlice';
import { getAccounts, getCategories, getPayees } from './queries/queriesSlice';
import type { Notification } from './state-types/notifications';
import { type AppStore } from './store';

export function listenForSyncEvent(store: AppStore) {
  let attemptedSyncRepair = false;

  listen('sync-event', event => {
    const prefs = store.getState().prefs.local;
    if (!prefs || !prefs.id) {
      // Do nothing if no budget is loaded
      return;
    }

    if (event.type === 'success') {
      if (attemptedSyncRepair) {
        attemptedSyncRepair = false;

        store.dispatch(
          addNotification({
            title: t('Syncing has been fixed!'),
            message: t('Happy budgeting!'),
            type: 'message',
          }),
        );
      }

      const tables = event.tables;

      if (tables.includes('prefs')) {
        store.dispatch(loadPrefs());
      }

      if (
        tables.includes('categories') ||
        tables.includes('category_groups') ||
        tables.includes('category_mapping')
      ) {
        store.dispatch(getCategories());
      }

      if (tables.includes('payees') || tables.includes('payee_mapping')) {
        store.dispatch(getPayees());
      }

      if (tables.includes('accounts')) {
        store.dispatch(getAccounts());
      }
    } else if (event.type === 'error') {
      let notif: Notification | null = null;
      const learnMore = `[${t('Learn more')}](https://actualbudget.org/docs/getting-started/sync/#debugging-sync-issues)`;
      const githubIssueLink =
        'https://github.com/actualbudget/actual/issues/new?assignees=&labels=bug&template=bug-report.yml&title=%5BBug%5D%3A+';

      switch (event.subtype) {
        case 'out-of-sync':
          if (attemptedSyncRepair) {
            notif = {
              title: t('Your data is still out of sync'),
              message:
                t(
                  'We were unable to repair your sync state, sorry! You need to reset your sync state.',
                ) +
                ' ' +
                learnMore,
              sticky: true,
              id: 'reset-sync',
              button: {
                title: t('Reset sync'),
                action: () => {
                  store.dispatch(resetSync());
                },
              },
            };
          } else {
            // A bug happened during the sync process. Sync state needs
            // to be reset.
            notif = {
              title: t('Your data is out of sync'),
              message:
                t(
                  'There was a problem syncing your data. We can try to repair your sync state to fix it.',
                ) +
                ' ' +
                learnMore,
              type: 'warning',
              sticky: true,
              id: 'repair-sync',
              button: {
                title: t('Repair'),
                action: async () => {
                  attemptedSyncRepair = true;
                  await send('sync-repair');
                  store.dispatch(sync());
                },
              },
            };
          }
          break;

        case 'file-old-version':
          // Tell the user something is wrong with the key state on
          // the server and the key needs to be recreated
          notif = {
            title: t('Actual has updated the syncing format'),
            message: t(
              'This happens rarely (if ever again). The internal syncing format ' +
                'has changed and you need to reset sync. This will upload data from ' +
                'this device and revert all other devices. ' +
                '[Learn more about what this means](https://actualbudget.org/docs/getting-started/sync/#what-does-resetting-sync-mean).' +
                '\n\n' +
                'Old encryption keys are not migrated. If using encryption, [reset encryption here](#makeKey).',
            ),
            messageActions: {
              makeKey: () =>
                store.dispatch(
                  pushModal({
                    modal: { name: 'create-encryption-key', options: {} },
                  }),
                ),
            },
            sticky: true,
            id: 'old-file',
            button: {
              title: t('Reset sync'),
              action: () => {
                store.dispatch(resetSync());
              },
            },
          };
          break;

        case 'file-key-mismatch':
          // Tell the user something is wrong with the key state on
          // the server and the key needs to be recreated
          notif = {
            title: t('Your encryption key need to be reset'),
            message:
              t(
                'Something went wrong when registering your encryption key id. ' +
                  'You need to recreate your key. ',
              ) + learnMore,
            sticky: true,
            id: 'invalid-key-state',
            button: {
              title: t('Reset key'),
              action: () => {
                store.dispatch(
                  pushModal({
                    modal: { name: 'create-encryption-key', options: {} },
                  }),
                );
              },
            },
          };

          break;

        case 'file-not-found':
          notif = {
            title: t('This file is not a cloud file'),
            message:
              t(
                'You need to register it to take advantage ' +
                  'of syncing which allows you to use it across devices and never worry ' +
                  'about losing your data.',
              ) +
              ' ' +
              learnMore,
            type: 'warning',
            sticky: true,
            id: 'register-file',
            button: {
              title: t('Register'),
              action: async () => {
                await store.dispatch(uploadBudget({}));
                store.dispatch(sync());
                store.dispatch(loadPrefs());
              },
            },
          };
          break;

        case 'file-needs-upload':
          notif = {
            title: t('File needs upload'),
            message:
              t(
                'Something went wrong when creating this cloud file. You need ' +
                  'to upload this file to fix it.',
              ) +
              ' ' +
              learnMore,
            sticky: true,
            id: 'upload-file',
            button: {
              title: t('Upload'),
              action: () => {
                store.dispatch(resetSync());
              },
            },
          };
          break;

        case 'file-has-reset':
        case 'file-has-new-key':
          // These two cases happen when the current group or key on
          // the server does not match the local one. This can mean a
          // few things depending on the state, and we try to show an
          // appropriate message and call to action to fix it.
          const { cloudFileId } = store.getState().prefs.local;

          notif = {
            title: t('Syncing has been reset on this cloud file'),
            message:
              t(
                'You need to revert it to continue syncing. Any unsynced ' +
                  'data will be lost. If you like, you can instead ' +
                  '[upload this file](#upload) to be the latest version.',
              ) +
              ' ' +
              learnMore,
            messageActions: { upload: () => store.dispatch(resetSync()) },
            sticky: true,
            id: 'needs-revert',
            button: {
              title: t('Revert'),
              action: () => {
                store.dispatch(closeAndDownloadBudget({ cloudFileId }));
              },
            },
          };
          break;
        case 'encrypt-failure':
        case 'decrypt-failure':
          if (event.meta.isMissingKey) {
            notif = {
              title: t('Missing encryption key'),
              message: t(
                'Unable to encrypt your data because you are missing the key. ' +
                  'Create your key to sync your data.',
              ),
              sticky: true,
              id: 'encrypt-failure-missing',
              button: {
                title: t('Create key'),
                action: () => {
                  store.dispatch(
                    pushModal({
                      modal: {
                        name: 'fix-encryption-key',
                        options: {
                          onSuccess: () => store.dispatch(sync()),
                        },
                      },
                    }),
                  );
                },
              },
            };
          } else {
            notif = {
              message: t(
                'Unable to encrypt your data. You have the correct ' +
                  'key so this is likely an internal failure. To fix this, ' +
                  'reset your sync data with a new key.',
              ),
              sticky: true,
              id: 'encrypt-failure',
              button: {
                title: t('Reset key'),
                action: () => {
                  store.dispatch(
                    pushModal({
                      modal: { name: 'create-encryption-key', options: {} },
                    }),
                  );
                },
              },
            };
          }
          break;
        case 'invalid-schema':
          console.trace('invalid-schema', event.meta);
          notif = {
            title: t('Update required'),
            message: t(
              'We couldn’t apply changes from the server. This probably means you ' +
                'need to update the app to support the latest database.',
            ),
            type: 'warning',
          };
          break;
        case 'apply-failure':
          console.trace('apply-failure', event.meta);
          notif = {
            message: t(
              'We couldn’t apply that change to the database. Please report this as a bug by [opening a GitHub issue]({{githubIssueLink}}).',
              { githubIssueLink },
            ),
          };
          break;
        case 'network':
          // Show nothing
          break;
        case 'token-expired':
          notif = {
            title: 'Login expired',
            message: 'Please login again.',
            sticky: true,
            id: 'login-expired',
            button: {
              title: 'Go to login',
              action: () => store.dispatch(signOut()),
            },
          };
          break;
        default:
          console.trace('unknown error', event);
          notif = {
            message: t(
              'We had problems syncing your changes. Please report this as a bug by [opening a GitHub issue]({{githubIssueLink}}).',
              { githubIssueLink },
            ),
          };
      }

      if (notif) {
        store.dispatch(addNotification({ type: 'error', ...notif }));
      }
    }
  });
}
