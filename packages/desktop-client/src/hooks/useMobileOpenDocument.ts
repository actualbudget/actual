import { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';

import * as Platform from '@actual-app/core/shared/platform';
import { App as CapacitorApp } from '@capacitor/app';
import { Capacitor } from '@capacitor/core';

import { importBudget } from '#budgetfiles/budgetfilesSlice';
import { useAccounts } from '#hooks/useAccounts';
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

/** Avoid re-importing the same cold-start / share URL if the effect rebinds. */
const handledOpenUrls = new Set<string>();

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
 * documents declared in Info.plist / the Android intent filter.
 *
 * Capacitor delivers the path via `appUrlOpen` (and `getLaunchUrl` on cold
 * start). We upload into the in-memory `/uploads` tree the same way the web
 * file picker does, then route to budget import or transaction import.
 */
export function useMobileOpenDocument({
  budgetOpen,
}: {
  budgetOpen: boolean;
}) {
  const { t } = useTranslation();
  const dispatch = useDispatch();
  const { data: accounts = [], isSuccess: accountsReady } = useAccounts();
  const accountsRef = useRef(accounts);
  accountsRef.current = accounts;

  useEffect(() => {
    if (!Platform.isNativeMobileApp) {
      return;
    }

    // Transaction import needs the account list; wait until it has loaded when
    // a budget is open so we do not flash a false “create an account” error.
    if (budgetOpen && !accountsReady) {
      return;
    }

    let cancelled = false;

    async function handleUrl(url: string) {
      if (!isFileOpenUrl(url) || handledOpenUrls.has(url)) {
        return;
      }

      const extension = getExtensionFromUrl(url);
      if (!extension) {
        return;
      }

      const originalName = getFilenameFromUrl(url);
      // Match browser-preload: normalize to file.<ext> inside /uploads.
      const uploadName = `file.${extension}`;

      try {
        if (BUDGET_IMPORT_EXTENSIONS.has(extension)) {
          const contents = await readOpenDocument(url);
          if (cancelled) {
            return;
          }

          handledOpenUrls.add(url);
          await window.__actionsForMenu.uploadFile(uploadName, contents);
          await dispatch(
            importBudget({ filepath: `/uploads/${uploadName}`, type: 'actual' }),
          );
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

        if (!budgetOpen) {
          // Do not mark handled — FinancesApp should pick this up after a
          // budget is opened (same launch URL via getLaunchUrl).
          dispatch(
            addNotification({
              notification: {
                type: 'message',
                message: t(
                  'Open a budget, then use Open in Actual again to import transactions.',
                ),
              },
            }),
          );
          return;
        }

        const onBudgetAccounts = accountsRef.current.filter(a => !a.closed);
        if (onBudgetAccounts.length === 0) {
          handledOpenUrls.add(url);
          dispatch(
            addNotification({
              notification: {
                type: 'error',
                message: t(
                  'Create an account before importing transactions.',
                ),
              },
            }),
          );
          return;
        }

        const contents = await readOpenDocument(url);
        if (cancelled) {
          return;
        }

        handledOpenUrls.add(url);
        await window.__actionsForMenu.uploadFile(uploadName, contents);
        const filepath = `/uploads/${uploadName}`;

        // Prefer a single on-budget account; otherwise import into the first and
        // tell the user they can change account from the import UI.
        const account = onBudgetAccounts[0];
        dispatch(
          pushModal({
            modal: {
              name: 'import-transactions',
              options: {
                accountId: account.id,
                filename: filepath,
                onImported: () => {},
              },
            },
          }),
        );

        if (onBudgetAccounts.length > 1) {
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

    return () => {
      cancelled = true;
      void listener.then(handle => handle.remove());
    };
  }, [accountsReady, budgetOpen, dispatch, t]);
}
