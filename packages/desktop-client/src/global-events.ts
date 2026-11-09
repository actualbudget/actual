import {
  releaseBackendStorage,
  STORAGE_BACKEND_KEY,
} from '@actual-app/core/platform/client/browser-preload';
import { listen, send } from '@actual-app/core/platform/client/connection';
import * as undo from '@actual-app/core/platform/client/undo';
// @ts-strict-ignore
import type { QueryClient } from '@tanstack/react-query';
import { t } from 'i18next';

import { accountQueries } from './accounts';
import { setAppState } from './app/appSlice';
import { categoryQueries } from './budget';
import { closeBudgetUI } from './budgetfiles/budgetfilesSlice';
import { closeModal, pushModal, replaceModal } from './modals/modalsSlice';
import type { Modal } from './modals/modalsSlice';
import {
  addGenericErrorNotification,
  addNotification,
} from './notifications/notificationsSlice';
import { payeeQueries } from './payees';
import { loadPrefs } from './prefs/prefsSlice';
import type { AppStore } from './redux/store';
import { dashboardQueries, reportQueries } from './reports';
import * as syncEvents from './sync-events';

export function handleGlobalEvents(store: AppStore, queryClient: QueryClient) {
  const unlistenServerError = listen('server-error', () => {
    store.dispatch(addGenericErrorNotification());
  });

  const unlistenOrphanedPayees = listen(
    'orphaned-payees',
    ({ orphanedIds, updatedPayeeIds }) => {
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
    },
  );

  const unlistenSchedulesOffline = listen('schedules-offline', () => {
    store.dispatch(
      pushModal({ modal: { name: 'schedule-posts-offline-notification' } }),
    );
  });

  const unlistenSync = syncEvents.listenForSyncEvent(store, queryClient);

  const unlistenUndo = listen('undo-event', undoState => {
    const { tables, undoTag } = undoState;
    const promises: Promise<unknown>[] = [];

    if (
      tables.includes('categories') ||
      tables.includes('category_groups') ||
      tables.includes('category_mapping')
    ) {
      promises.push(
        queryClient.invalidateQueries({
          queryKey: categoryQueries.lists(),
        }),
      );
    }

    if (
      tables.includes('accounts') ||
      tables.includes('payees') ||
      tables.includes('payee_mapping')
    ) {
      void queryClient.invalidateQueries({
        queryKey: payeeQueries.lists(),
      });
    }

    if (tables.includes('accounts')) {
      promises.push(
        queryClient.invalidateQueries({
          queryKey: accountQueries.lists(),
        }),
      );
    }

    if (tables.includes('dashboard') || tables.includes('dashboard_pages')) {
      promises.push(
        queryClient.invalidateQueries({
          queryKey: dashboardQueries.lists(),
        }),
      );
    }

    if (tables.includes('custom_reports')) {
      promises.push(
        queryClient.invalidateQueries({
          queryKey: reportQueries.lists(),
        }),
      );
    }

    const tagged = undo.getTaggedState(undoTag);

    if (tagged) {
      void Promise.all(promises).then(() => {
        undo.setUndoState('undoEvent', undoState);

        // If a modal has been tagged, open it instead of navigating
        if (tagged.openModal) {
          // The undo store keeps modals as an opaque structural shape; re-narrow
          // to the real Modal union now that we're back in desktop-client.
          // TODO: drop this cast once the Modal type lives somewhere both
          // loot-core and desktop-client can import (e.g. consolidated under
          // @actual-app/core types).
          const openModal = tagged.openModal as Modal;
          const { modalStack } = store.getState().modals;

          if (
            modalStack.length === 0 ||
            modalStack[modalStack.length - 1].name !== openModal.name
          ) {
            store.dispatch(replaceModal({ modal: openModal }));
          }
        } else {
          store.dispatch(closeModal());

          if (
            window.location.href.replace(window.location.origin, '') !==
            tagged.url
          ) {
            void window.__navigate(tagged.url);
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
        notification: {
          type: 'error',
          title: 'Unable to save changes',
          sticky: true,
          message:
            'This browser only supports using the app in one tab at a time, ' +
            'and another tab has opened the app. No changes will be saved ' +
            'from this tab; please close it and continue working in the other one.',
        },
      }),
    );
  });

  // The IndexedDB fallback could not store the budget, retry included; the
  // id keeps one notification up however many writes fail
  const unlistenStorageWriteFailed = listen('storage-write-failed', () => {
    store.dispatch(
      addNotification({
        notification: {
          id: 'storage-write-failed',
          type: 'error',
          title: t('Unable to save changes'),
          sticky: true,
          message: t(
            'Your latest changes could not be stored in this browser, which may be out of space. They are kept in memory for now: free up space, or export your budget before closing this tab.',
          ),
        },
      }),
    );
  });

  const unlistenIndexeddbQuotaError = listen('indexeddb-quota-error', () => {
    alert(
      t(
        'We hit a limit on the local storage available. Edits may not be saved. Please get in touch https://actualbudget.org/contact/ so we can help debug this.',
      ),
    );
  });

  const unlistenStartLoad = listen('start-load', () => {
    void store.dispatch(closeBudgetUI());
    store.dispatch(setAppState({ loadingText: '' }));
  });

  const unlistenFinishLoad = listen('finish-load', () => {
    store.dispatch(closeModal());
    store.dispatch(setAppState({ loadingText: null }));
    void store.dispatch(loadPrefs());
  });

  const unlistenStartImport = listen('start-import', () => {
    void store.dispatch(closeBudgetUI());
  });

  const unlistenFinishImport = listen('finish-import', () => {
    store.dispatch(closeModal());
    store.dispatch(setAppState({ loadingText: null }));
    void store.dispatch(loadPrefs());
  });

  const unlistenShowBudgets = listen('show-budgets', () => {
    void store.dispatch(closeBudgetUI());
    store.dispatch(setAppState({ loadingText: null }));
  });

  const unlistenApiFetchRedirected = listen('api-fetch-redirected', () => {
    void window.Actual.reload();
  });

  // Progress while a budget is moved into the new browser storage; the
  // budget loader shows it on the loading screen
  const unlistenStorageMigration = listen(
    'storage-migration',
    ({ phase, percent }) => {
      let loadingText: string;
      if (phase === 'copy') {
        loadingText = t(
          'Moving your budget to the new storage... {{percent}}%',
          { percent: Math.round(percent ?? 0) },
        );
      } else if (phase === 'verify') {
        loadingText = t('Checking the moved budget...');
      } else if (phase === 'cleanup') {
        loadingText = t('Cleaning up the old storage...');
      } else {
        loadingText = t('Loading...');
      }
      store.dispatch(setAppState({ loadingText }));
    },
  );

  // The IndexedDB fallback of the new storage persists lazily; ask for a
  // flush whenever the tab is hidden
  const flushStorage = () => {
    send('storage-flush').catch(() => {
      // No backend to flush, or it is already gone
    });
  };
  const onVisibilityChange = () => {
    if (document.visibilityState === 'hidden') {
      flushStorage();
    }
  };
  document.addEventListener('visibilitychange', onVisibilityChange);

  // A page that is leaving gives its budget up, flushing first: the browser
  // frees a destroyed worker's locks and handles itself, but WebKit keeps
  // those of a worker whose page went into the back/forward cache, where
  // they would block the next page's open until the cached page is evicted.
  // Restored from that cache, the page relaunches, as its worker no longer
  // holds the budget
  const onPageHide = () => {
    releaseBackendStorage();
  };
  const onPageShow = (event: PageTransitionEvent) => {
    if (event.persisted) {
      window.Actual.relaunch();
    }
  };
  window.addEventListener('pagehide', onPageHide);
  window.addEventListener('pageshow', onPageShow);

  // The storage engine is one choice for the whole origin. When another tab
  // changes it, this tab relaunches into the same engine: a tab left on the
  // old one would keep the budgets there, or move them straight back
  const onStorageBackendChange = (event: StorageEvent) => {
    if (event.key === STORAGE_BACKEND_KEY) {
      window.Actual.relaunch();
    }
  };
  window.addEventListener('storage', onStorageBackendChange);

  return () => {
    unlistenServerError();
    unlistenOrphanedPayees();
    unlistenSchedulesOffline();
    unlistenSync();
    unlistenUndo();
    unlistenFallbackWriteError();
    unlistenStorageWriteFailed();
    unlistenIndexeddbQuotaError();
    unlistenStartLoad();
    unlistenFinishLoad();
    unlistenStartImport();
    unlistenFinishImport();
    unlistenShowBudgets();
    unlistenApiFetchRedirected();
    unlistenStorageMigration();
    document.removeEventListener('visibilitychange', onVisibilityChange);
    window.removeEventListener('pagehide', onPageHide);
    window.removeEventListener('pageshow', onPageShow);
    window.removeEventListener('storage', onStorageBackendChange);
  };
}
