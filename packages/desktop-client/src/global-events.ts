// @ts-strict-ignore
import { type Store } from 'redux';

import * as sharedListeners from 'loot-core/src/client/shared-listeners';
import type { State } from 'loot-core/src/client/state-types';
import { listen } from 'loot-core/src/platform/client/fetch';
import * as undo from 'loot-core/src/platform/client/undo';

import { type BoundActions } from './hooks/useActions';

export function handleGlobalEvents(actions: BoundActions, store: Store<State>) {
  global.Actual.onEventFromMain('update-downloaded', (event, updateInfo) => {
    actions.setAppState({ updateInfo });
  });

  global.Actual.onEventFromMain('update-error', () => {
    // Ignore errors. We don't want to constantly bug the user if they
    // always have a flaky connection or have intentionally disabled
    // updates. They will see the error in the about page if they try
    // to update.
  });

  listen('server-error', () => {
    actions.addGenericErrorNotification();
  });

  listen('orphaned-payees', ({ orphanedIds, updatedPayeeIds }) => {
    // Right now, it prompts to merge into the first payee
    actions.pushModal('merge-unused-payees', {
      payeeIds: orphanedIds,
      targetPayeeId: updatedPayeeIds[0],
    });
  });

  listen('schedules-offline', ({ payees }) => {
    actions.pushModal('schedule-posts-offline-notification', { payees });
  });

  // This is experimental: we sync data locally automatically when
  // data changes from the backend
  listen('sync-event', async ({ type, tables }) => {
    // We don't need to query anything until the file is loaded, and
    // sync events might come in if the file is being synced before
    // being loaded (happens when downloading)
    const prefs = store.getState().prefs.local;
    if (prefs && prefs.id) {
      if (type === 'applied') {
        if (tables.includes('payees') || tables.includes('payee_mapping')) {
          actions.getPayees();
        }
      }
    }
  });

  // TODO: Should this run on mobile too?
  listen('sync-event', async ({ type }) => {
    if (type === 'unauthorized') {
      actions.addNotification({
        type: 'warning',
        message: 'Unable to authenticate with server',
        sticky: true,
        id: 'auth-issue',
      });
    }
  });

  sharedListeners.listenForSyncEvent(actions, store);

  listen('undo-event', undoState => {
    const { tables, undoTag } = undoState;
    const promises: Promise<unknown>[] = [];

    if (
      tables.includes('categories') ||
      tables.includes('category_groups') ||
      tables.includes('category_mapping')
    ) {
      promises.push(actions.getCategories());
    }

    if (tables.includes('accounts')) {
      promises.push(actions.getAccounts());
    }

    const tagged = undo.getTaggedState(undoTag);

    if (tagged) {
      Promise.all(promises).then(() => {
        actions.setLastUndoState(undoState);

        // If a modal has been tagged, open it instead of navigating
        if (tagged.openModal) {
          const { modalStack } = store.getState().modals;

          if (
            modalStack.length === 0 ||
            modalStack[modalStack.length - 1].name !== tagged.openModal
          ) {
            actions.replaceModal(tagged.openModal);
          }
        } else {
          actions.closeModal();

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
    actions.addNotification({
      type: 'error',
      title: 'Unable to save changes',
      sticky: true,
      message:
        'This browser only supports using the app in one tab at a time, ' +
        'and another tab has opened the app. No changes will be saved ' +
        'from this tab; please close it and continue working in the other one.',
    });
  });

  listen('start-load', () => {
    actions.closeBudgetUI();
    actions.setAppState({ loadingText: '' });
  });

  listen('finish-load', () => {
    actions.closeModal();
    actions.setAppState({ loadingText: null });
    actions.loadPrefs();
  });

  listen('start-import', () => {
    actions.closeBudgetUI();
  });

  listen('finish-import', () => {
    actions.closeModal();
    actions.setAppState({ loadingText: null });
    actions.loadPrefs();
  });

  listen('show-budgets', () => {
    actions.closeBudgetUI();
    actions.setAppState({ loadingText: null });
  });

  listen('api-fetch-redirected', () => {
    actions.reloadApp();
  });
}
