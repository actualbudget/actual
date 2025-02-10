// @ts-strict-ignore
import {
  addGenericErrorNotification,
  addNotification,
  closeBudgetUI,
  closeModal,
  loadPrefs,
  pushModal,
  replaceModal,
} from 'loot-core/client/actions';
import { setAppState } from 'loot-core/client/app/appSlice';
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
  const unlistenServerError = listen('server-error', () => {
    store.dispatch(addGenericErrorNotification());
  });

  const unlistenOrphanedPayees = listen(
    'orphaned-payees',
    ({ orphanedIds, updatedPayeeIds }) => {
      // Right now, it prompts to merge into the first payee
      store.dispatch(
        pushModal('merge-unused-payees', {
          payeeIds: orphanedIds,
          targetPayeeId: updatedPayeeIds[0],
        }),
      );
    },
  );

  const unlistenSchedulesOffline = listen('schedules-offline', () => {
    store.dispatch(pushModal('schedule-posts-offline-notification'));
  });

  const unlistenSync = sharedListeners.listenForSyncEvent(store);

  const unlistenUndo = listen('undo-event', undoState => {
    const { tables, undoTag } = undoState;
    const promises: Promise<unknown>[] = [];

    if (
      tables.includes('categories') ||
      tables.includes('category_groups') ||
      tables.includes('category_mapping')
    ) {
      promises.push(store.dispatch(getCategories()));
    }

    if (
      tables.includes('accounts') ||
      tables.includes('payees') ||
      tables.includes('payee_mapping')
    ) {
      promises.push(store.dispatch(getPayees()));
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
            modalStack[modalStack.length - 1].name !== tagged.openModal
          ) {
            store.dispatch(replaceModal(tagged.openModal));
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

  const unlistenFallbackWriteError = listen('fallback-write-error', () => {
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

  const unlistenStartLoad = listen('start-load', () => {
    store.dispatch(closeBudgetUI());
    store.dispatch(setAppState({ loadingText: '' }));
  });

  const unlistenFinishLoad = listen('finish-load', () => {
    store.dispatch(closeModal());
    store.dispatch(setAppState({ loadingText: null }));
    store.dispatch(loadPrefs());
  });

  const unlistenStartImport = listen('start-import', () => {
    store.dispatch(closeBudgetUI());
  });

  const unlistenFinishImport = listen('finish-import', () => {
    store.dispatch(closeModal());
    store.dispatch(setAppState({ loadingText: null }));
    store.dispatch(loadPrefs());
  });

  const unlistenShowBudgets = listen('show-budgets', () => {
    store.dispatch(closeBudgetUI());
    store.dispatch(setAppState({ loadingText: null }));
  });

  const unlistenApiFetchRedirected = listen('api-fetch-redirected', () => {
    window.Actual.reload();
  });

  return () => {
    unlistenServerError();
    unlistenOrphanedPayees();
    unlistenSchedulesOffline();
    unlistenSync();
    unlistenUndo();
    unlistenFallbackWriteError();
    unlistenStartLoad();
    unlistenFinishLoad();
    unlistenStartImport();
    unlistenFinishImport();
    unlistenShowBudgets();
    unlistenApiFetchRedirected();
  };
}
