import { splitSqlitePath } from './paths';

// Web Locks guard a budget's storage across workers: the sqlite-wasm stores
// hold a budget's lock exclusively, the legacy engine shares it, so a
// migration waits for legacy connections to close and a legacy open waits
// for the new storage to let go. Locks are released automatically when the
// worker that holds them ends. Where the API is missing (insecure contexts,
// tests) they are no-ops.

export const BUDGET_LOCK_TIMEOUT_MS = 10_000;

export function budgetLockName(path: string): string {
  return 'actual-budget:' + splitSqlitePath(path).dirId;
}

export function acquireWebLock(
  name: string,
  timeoutMs: number,
  mode: LockMode = 'exclusive',
): Promise<() => void> {
  const locks =
    typeof navigator !== 'undefined' && 'locks' in navigator
      ? navigator.locks
      : undefined;
  if (!locks) {
    return Promise.resolve(() => {
      // Nothing was taken, nothing to release
    });
  }

  return new Promise((resolve, reject) => {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    locks
      .request(
        name,
        { mode, signal: controller.signal },
        () =>
          new Promise<void>(release => {
            clearTimeout(timer);
            resolve(() => release());
          }),
      )
      .catch(error => {
        clearTimeout(timer);
        reject(error);
      });
  });
}
