import { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';

import * as Platform from '@actual-app/core/shared/platform';
import { App as CapacitorApp } from '@capacitor/app';
import { Capacitor } from '@capacitor/core';
import { useQuery } from '@tanstack/react-query';

import { accountQueries } from '#accounts';
import { importBudget } from '#budgetfiles/budgetfilesSlice';
import { pushModal } from '#modals/modalsSlice';
import { addNotification } from '#notifications/notificationsSlice';
import { useDispatch } from '#redux';

import {
  BUDGET_IMPORT_EXTENSIONS,
  getExtensionFromUrl,
  getFilenameFromUrl,
  isFileOpenUrl,
  TRANSACTION_IMPORT_EXTENSIONS,
} from './mobileOpenDocument';

/** URLs already finished (success or permanent error). */
const handledOpenUrls = new Set<string>();
/** URLs currently mid-read/upload so getLaunchUrl + appUrlOpen cannot double-fire. */
const pendingOpenUrls = new Set<string>();
/**
 * Transaction file opens that arrived before a budget was open / accounts
 * finished loading. Replayed once both are ready (warm opens are not re-emitted).
 */
const deferredTransactionUrls = new Set<string>();
/** Budget ZIP opens interrupted by effect teardown — not transaction-deferred. */
const deferredBudgetUrls = new Set<string>();
/** Multi-account picker is open for this URL — block deferred replay until chosen. */
const awaitingAccountChoiceUrls = new Set<string>();

/**
 * Latest mounted handler. Cancelled async work can hand the URL back to the
 * active effect after `pendingOpenUrls` is cleared (the replacement effect may
 * already have finished its initial drain).
 */
let activeHandleUrl: ((url: string) => Promise<void>) | null = null;

function retryWithActiveHandler(url: string) {
  void Promise.resolve().then(() => {
    void activeHandleUrl?.(url);
  });
}

async function readOpenDocument(url: string): Promise<ArrayBuffer> {
  // convertFileSrc turns a native file:// (or Capacitor) URL into something
  // the WebView can fetch. Without it, WKWebView blocks raw file:// reads.
  const src = Capacitor.convertFileSrc(url);
  const response = await fetch(src);
  if (!response.ok) {
    throw new Error(`Failed to read opened file (${response.status})`);
  }
  return response.arrayBuffer();
}

function uniqueUploadName(extension: string): string {
  // Keep the extension for the import parser; uniquify so two CSVs cannot
  // overwrite the same `/uploads/file.csv` while both modals are open.
  return `open-${crypto.randomUUID()}.${extension}`;
}

/**
 * Handles iOS/Android “Open in Actual” for OFX/QFX/CSV/ZIP (and related)
 * documents declared in Info.plist.
 *
 * Capacitor delivers the path via `appUrlOpen` (and `getLaunchUrl` on cold
 * start). We upload into the in-memory `/uploads` tree the same way the web
 * file picker does, then route to budget import or transaction import.
 */
export function useMobileOpenDocument({ budgetOpen }: { budgetOpen: boolean }) {
  const { t } = useTranslation();
  const dispatch = useDispatch();
  // Only fetch accounts when a budget is open — ManagementApp must not call
  // accounts-get during onboarding / file selection.
  // placeholderData: [] makes isSuccess true before the real fetch finishes;
  // wait until placeholder data is gone so we do not treat "no accounts yet"
  // as "user has zero accounts".
  const {
    data: accounts = [],
    isSuccess,
    isPlaceholderData,
  } = useQuery({
    ...accountQueries.list(),
    enabled: budgetOpen,
  });
  const accountsReady = isSuccess && !isPlaceholderData;
  const accountsRef = useRef(accounts);
  const accountsReadyRef = useRef(accountsReady);
  const budgetOpenRef = useRef(budgetOpen);

  useEffect(() => {
    accountsRef.current = accounts;
  }, [accounts]);

  useEffect(() => {
    accountsReadyRef.current = accountsReady;
  }, [accountsReady]);

  useEffect(() => {
    budgetOpenRef.current = budgetOpen;
  }, [budgetOpen]);

  useEffect(() => {
    if (!Platform.isNativeMobileApp) {
      return;
    }

    let cancelled = false;

    async function handleUrl(url: string) {
      if (
        !isFileOpenUrl(url) ||
        handledOpenUrls.has(url) ||
        pendingOpenUrls.has(url) ||
        awaitingAccountChoiceUrls.has(url)
      ) {
        return;
      }

      const extension = getExtensionFromUrl(url);
      const originalName = getFilenameFromUrl(url);

      if (!extension) {
        handledOpenUrls.add(url);
        dispatch(
          addNotification({
            notification: {
              type: 'error',
              message: t('Unsupported file type: {{name}}', {
                name: originalName,
              }),
            },
          }),
        );
        return;
      }

      const uploadName = uniqueUploadName(extension);

      pendingOpenUrls.add(url);

      try {
        if (BUDGET_IMPORT_EXTENSIONS.has(extension)) {
          const contents = await readOpenDocument(url);
          if (cancelled) {
            deferredBudgetUrls.add(url);
            retryWithActiveHandler(url);
            return;
          }

          await window.__actionsForMenu.uploadFile(uploadName, contents);
          if (cancelled) {
            // Do not importBudget after unmount — hand off to the new effect.
            deferredBudgetUrls.add(url);
            retryWithActiveHandler(url);
            return;
          }

          await dispatch(
            importBudget({
              filepath: `/uploads/${uploadName}`,
              type: 'actual',
            }),
          );
          handledOpenUrls.add(url);
          deferredBudgetUrls.delete(url);
          return;
        }

        if (!TRANSACTION_IMPORT_EXTENSIONS.has(extension)) {
          handledOpenUrls.add(url);
          dispatch(
            addNotification({
              notification: {
                type: 'error',
                message: t('Unsupported file type: {{name}}', {
                  name: originalName,
                }),
              },
            }),
          );
          return;
        }

        if (!budgetOpenRef.current) {
          // Queue until FinancesApp mounts with a budget; getLaunchUrl only
          // keeps the latest URL so earlier opens would otherwise be lost.
          deferredTransactionUrls.add(url);
          dispatch(
            addNotification({
              notification: {
                type: 'message',
                message: t(
                  'Open a budget to finish importing these transactions.',
                ),
              },
            }),
          );
          return;
        }

        // Keep the listener mounted while accounts load; queue warm opens and
        // replay them once accountsReady is true.
        if (!accountsReadyRef.current) {
          deferredTransactionUrls.add(url);
          return;
        }

        const openAccounts = accountsRef.current.filter(a => !a.closed);
        const onBudgetAccounts = openAccounts.filter(a => !a.offbudget);
        const importAccounts =
          onBudgetAccounts.length > 0 ? onBudgetAccounts : openAccounts;

        if (importAccounts.length === 0) {
          handledOpenUrls.add(url);
          dispatch(
            addNotification({
              notification: {
                type: 'error',
                message: t('Create an account before importing transactions.'),
              },
            }),
          );
          return;
        }

        const contents = await readOpenDocument(url);
        if (cancelled) {
          deferredTransactionUrls.add(url);
          retryWithActiveHandler(url);
          return;
        }

        await window.__actionsForMenu.uploadFile(uploadName, contents);
        if (cancelled) {
          deferredTransactionUrls.add(url);
          retryWithActiveHandler(url);
          return;
        }

        const filepath = `/uploads/${uploadName}`;

        const openImportForAccount = (accountId: string) => {
          dispatch(
            pushModal({
              modal: {
                name: 'import-transactions',
                options: {
                  accountId,
                  filename: filepath,
                },
              },
            }),
          );
        };

        if (importAccounts.length === 1) {
          openImportForAccount(importAccounts[0].id);
          handledOpenUrls.add(url);
          deferredTransactionUrls.delete(url);
        } else {
          // Let the user pick the target account — the import modal itself
          // has no account switcher. Only mark handled after a selection so
          // dismissing the picker can still retry the same document.
          const allowedIds = new Set(importAccounts.map(a => a.id));
          let accountChosen = false;
          awaitingAccountChoiceUrls.add(url);
          deferredTransactionUrls.delete(url);
          dispatch(
            pushModal({
              modal: {
                name: 'account-autocomplete',
                options: {
                  includeClosedAccounts: false,
                  hiddenAccounts: accountsRef.current
                    .filter(a => !allowedIds.has(a.id))
                    .map(a => a.id),
                  onSelect: accountId => {
                    accountChosen = true;
                    awaitingAccountChoiceUrls.delete(url);
                    deferredTransactionUrls.delete(url);
                    handledOpenUrls.add(url);
                    openImportForAccount(accountId);
                  },
                  onClose: () => {
                    // Autocomplete closes before onSelect (also setTimeout 0).
                    // Schedule dismiss after that macrotask so a real selection
                    // can set accountChosen first.
                    void Promise.resolve().then(() => {
                      setTimeout(() => {
                        if (accountChosen || handledOpenUrls.has(url)) {
                          return;
                        }
                        awaitingAccountChoiceUrls.delete(url);
                        deferredTransactionUrls.add(url);
                      }, 0);
                    });
                  },
                },
              },
            }),
          );
          dispatch(
            addNotification({
              notification: {
                type: 'message',
                message: t('Choose an account to import {{name}} into.', {
                  name: originalName,
                }),
              },
            }),
          );
        }
      } catch (error) {
        handledOpenUrls.delete(url);
        // Re-queue transaction opens for a later ready pass; budget zips go to
        // the budget deferral set instead.
        if (TRANSACTION_IMPORT_EXTENSIONS.has(extension)) {
          deferredTransactionUrls.add(url);
        } else if (BUDGET_IMPORT_EXTENSIONS.has(extension)) {
          deferredBudgetUrls.add(url);
        }
        dispatch(
          addNotification({
            notification: {
              type: 'error',
              message:
                error instanceof Error
                  ? error.message
                  : t('Failed to open document in Actual.'),
            },
          }),
        );
      } finally {
        pendingOpenUrls.delete(url);
      }
    }

    activeHandleUrl = handleUrl;

    const listener = CapacitorApp.addListener('appUrlOpen', ({ url }) => {
      void handleUrl(url);
    });

    void CapacitorApp.getLaunchUrl()
      .then(result => {
        if (!cancelled && result?.url) {
          void handleUrl(result.url);
        }
      })
      .catch(() => {
        // getLaunchUrl rejects when the app was not launched from a URL.
      });

    // Do not remove from the set before handleUrl finishes — a cancelled or
    // failed attempt must leave the URL queued for the next ready pass.
    for (const url of [...deferredBudgetUrls]) {
      void handleUrl(url);
    }
    if (budgetOpen && accountsReady && deferredTransactionUrls.size > 0) {
      for (const url of [...deferredTransactionUrls]) {
        void handleUrl(url);
      }
    }

    return () => {
      cancelled = true;
      if (activeHandleUrl === handleUrl) {
        activeHandleUrl = null;
      }
      void listener.then(handle => handle.remove());
    };
  }, [accountsReady, budgetOpen, dispatch, t]);
}
