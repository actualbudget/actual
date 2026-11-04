// Exclusive Web Locks guard a budget's storage against a second worker.
// They are released automatically when the worker that holds them ends.
// Where the API is missing (insecure contexts, tests) they are no-ops.

export function acquireWebLock(
  name: string,
  timeoutMs: number,
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
        { mode: 'exclusive', signal: controller.signal },
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
