// @ts-strict-ignore
import {
  addGenericErrorNotification,
  addNotification,
  loadPrefs,
} from 'loot-core/client/actions';
import { setAppState } from 'loot-core/client/app/appSlice';
import { closeBudgetUI } from 'loot-core/client/budgets/budgetsSlice';
import {
  closeModal,
  pushModal,
  replaceModal,
} from 'loot-core/client/modals/modalsSlice';
import {
  getAccounts,
  getCategories,
  getPayees,
} from 'loot-core/client/queries/queriesSlice';
import { type AppStore } from 'loot-core/client/store';
import * as sharedListeners from 'loot-core/src/client/shared-listeners';
import { listen } from 'loot-core/src/platform/client/fetch';
import * as undo from 'loot-core/src/platform/client/undo';

export function handleGlobalEvents(store: AppStore) {
  listen('server-error', () => {
    store.dispatch(addGenericErrorNotification());
  });

  listen('orphaned-payees', ({ orphanedIds, updatedPayeeIds }) => {
    // Right now, it prompts to merge into the first payee
    store.dispatch(
      pushModal({
        modal: {
          name: 'merge-unused-payees',
          options: {
            payeeIds: orphanedIds,
            targetPayeeId: updatedPayeeIds[0],
          },
        },
      }),
    );
  });

  listen('schedules-offline', () => {
    store.dispatch(
      pushModal({ modal: { name: 'schedule-posts-offline-notification' } }),
    );
  });

  // This is experimental: we sync data locally automatically when
  // data changes from the backend
  listen('sync-event', async event => {
    // We don't need to query anything until the file is loaded, and
    // sync events might come in if the file is being synced before
    // being loaded (happens when downloading)
    const prefs = store.getState().prefs.local;
    if (prefs && prefs.id) {
      if (event.type === 'applied') {
        const tables = event.tables;
        if (tables.includes('payees') || tables.includes('payee_mapping')) {
          store.dispatch(getPayees());
        }
      }
    }
  });

  // TODO: Should this run on mobile too?
  listen('sync-event', async ({ type }) => {
    if (type === 'unauthorized') {
      store.dispatch(
        addNotification({
          type: 'warning',
          message: 'Unable to authenticate with server',
          sticky: true,
          id: 'auth-issue',
        }),
      );
    }
  });

  sharedListeners.listenForSyncEvent(store);

  listen('undo-event', undoState => {
    const { tables, undoTag } = undoState;
    const promises: Promise<unknown>[] = [];

    if (
      tables.includes('categories') ||
      tables.includes('category_groups') ||
      tables.includes('category_mapping')
    ) {
      promises.push(store.dispatch(getCategories()));
    }

    if (tables.includes('accounts')) {
      promises.push(store.dispatch(getAccounts()));
    }

    const tagged = undo.getTaggedState(undoTag);

    if (tagged) {
      Promise.all(promises).then(() => {
        undo.setUndoState('undoEvent', undoState);

        // If a modal has been tagged, open it instead of navigating
        if (tagged.openModal) {
          const { modalStack } = store.getState().modals;

          if (
            modalStack.length === 0 ||
            modalStack[modalStack.length - 1].name !== tagged.openModal.name
          ) {
            store.dispatch(replaceModal({ modal: tagged.openModal }));
          }
        } else {
          store.dispatch(closeModal());

          if (
            window.location.href.replace(window.location.origin, '') !==
            tagged.url
          ) {
            window.__navigate(tagged.url);
            // This stops propagation of the undo event, which is
            // important because if we are changing URLs any existing
            // undo listeners on the current page don't need to be run
            return true;
          }
        }
      });
    }
  });

  listen('fallback-write-error', () => {
    store.dispatch(
      addNotification({
        type: 'error',
        title: 'Unable to save changes',
        sticky: true,
        message:
          'This browser only supports using the app in one tab at a time, ' +
          'and another tab has opened the app. No changes will be saved ' +
          'from this tab; please close it and continue working in the other one.',
      }),
    );
  });

  listen('start-load', () => {
    store.dispatch(closeBudgetUI());
    store.dispatch(setAppState({ loadingText: '' }));
  });

  listen('finish-load', () => {
    store.dispatch(closeModal());
    store.dispatch(setAppState({ loadingText: null }));
    store.dispatch(loadPrefs());
  });

  listen('start-import', () => {
    store.dispatch(closeBudgetUI());
  });

  listen('finish-import', () => {
    store.dispatch(closeModal());
    store.dispatch(setAppState({ loadingText: null }));
    store.dispatch(loadPrefs());
  });

  listen('show-budgets', () => {
    store.dispatch(closeBudgetUI());
    store.dispatch(setAppState({ loadingText: null }));
  });

  listen('api-fetch-redirected', () => {
    window.Actual.reload();
  });
}
