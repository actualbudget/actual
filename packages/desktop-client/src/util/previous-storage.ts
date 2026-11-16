import { setStoredStorageBackend } from '@actual-app/core/platform/client/browser-preload';
import { send } from '@actual-app/core/platform/client/connection';
import { t } from 'i18next';

export type PreviousStorageError = 'budget-in-use' | 'revert-failed';

// Puts this browser back on the previous storage engine and starts the app
// again on it, on the given budget if there is one. Budgets already moved
// to the new storage are moved back first, so nothing is lost. Resolves
// what went wrong when it could not; otherwise the page reloads.
export async function returnToPreviousStorage(
  budgetToStartOn?: string,
): Promise<PreviousStorageError | null> {
  const result = await send('storage-revert', { budgetToStartOn }).catch(
    () => ({ error: 'revert-failed' as const }),
  );
  if ('error' in result) {
    return result.error;
  }
  setStoredStorageBackend('legacy');
  window.Actual.relaunch();
  return null;
}

export function describePreviousStorageError(
  error: PreviousStorageError,
): string {
  return error === 'budget-in-use'
    ? t('Close Actual in your other tabs first, then try again.')
    : t('Switching back failed. Your budgets stay on the new storage engine.');
}
