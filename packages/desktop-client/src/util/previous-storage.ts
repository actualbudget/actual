import {
  setStoredStorageBackend,
  STORAGE_BACKEND_URL_PARAM,
} from '@actual-app/core/platform/client/browser-preload';
import { send } from '@actual-app/core/platform/client/connection';
import { t } from 'i18next';

export type PreviousStorageError =
  | 'budget-in-use'
  | 'other-budgets-moved'
  | 'revert-failed';

// Puts this browser back on the previous storage engine and starts the app
// again on it. Budgets already moved to the new storage are moved back
// first, so nothing is lost. Asked for one budget, it goes back for that
// one alone and starts on it, and is refused while any other budget has
// moved. Resolves what went wrong when it could not; otherwise the page
// loads again.
export async function returnToPreviousStorage(
  forBudget?: string,
): Promise<PreviousStorageError | null> {
  const result = await send('storage-revert', { forBudget }).catch(() => ({
    error: 'revert-failed' as const,
  }));
  if ('error' in result) {
    return result.error;
  }
  setStoredStorageBackend('legacy');
  // The address names the engine as well: it decides the next load even
  // where the choice could not be stored, and is taken off again there.
  // It takes this page's place in the history, so that going back in the
  // browser cannot return to a page still running the new engine
  const address = new URL(window.location.href);
  address.searchParams.set(STORAGE_BACKEND_URL_PARAM, 'legacy');
  window.location.replace(address);
  return null;
}

export function describePreviousStorageError(
  error: PreviousStorageError,
): string {
  return error === 'budget-in-use'
    ? t('Close Actual in your other tabs first, then try again.')
    : t('Switching back failed. Actual is still using the new storage engine.');
}
