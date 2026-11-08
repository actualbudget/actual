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
 * Transaction file opens that arrived before accounts finished loading.
 * Replayed once accountsReady flips true (warm opens are not re-emitted).
 */
const deferredTransactionUrls = new Set<string>();

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
  const { data: accounts = [], isSuccess: accountsReady } = useQuery({
    ...accountQueries.list(),
    enabled: budgetOpen,
  });
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
        pendingOpenUrls.has(url)
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

      // Match browser-preload: normalize to file.<ext> inside /uploads.
      const uploadName = `file.${extension}`;

      pendingOpenUrls.add(url);

      try {
        if (BUDGET_IMPORT_EXTENSIONS.has(extension)) {
          const contents = await readOpenDocument(url);
          if (cancelled) {
            return;
          }

          await window.__actionsForMenu.uploadFile(uploadName, contents);
          await dispatch(
            importBudget({
              filepath: `/uploads/${uploadName}`,
              type: 'actual',
            }),
          );
          handledOpenUrls.add(url);
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
          // Do not mark handled — FinancesApp should pick this up after a
          // budget is opened (same launch URL via getLaunchUrl).
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
          return;
        }

        await window.__actionsForMenu.uploadFile(uploadName, contents);
        const filepath = `/uploads/${uploadName}`;

        // Prefer an on-budget account; otherwise fall back to any open account
        // and tell the user they can switch from the import UI.
        const account = importAccounts[0];
        dispatch(
          pushModal({
            modal: {
              name: 'import-transactions',
              options: {
                accountId: account.id,
                filename: filepath,
              },
            },
          }),
        );
        handledOpenUrls.add(url);
        deferredTransactionUrls.delete(url);

        if (importAccounts.length > 1) {
          dispatch(
            addNotification({
              notification: {
                type: 'message',
                message: t(
                  'Importing {{name}} into {{account}}. Open Import from another account if that is not right.',
                  { name: originalName, account: account.name },
                ),
              },
            }),
          );
        }
      } catch (error) {
        handledOpenUrls.delete(url);
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

    if (budgetOpen && accountsReady && deferredTransactionUrls.size > 0) {
      for (const url of [...deferredTransactionUrls]) {
        deferredTransactionUrls.delete(url);
        void handleUrl(url);
      }
    }

    return () => {
      cancelled = true;
      void listener.then(handle => handle.remove());
    };
  }, [accountsReady, budgetOpen, dispatch, t]);
}
