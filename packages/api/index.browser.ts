import { startBackendWorker } from '@actual-app/core/platform/client/backend-worker';
import { send } from '@actual-app/core/platform/client/connection';
import type { InitConfig } from '@actual-app/core/server/main';

import InlineWorker from './browser-worker?worker&inline';

export * from './methods';
export * as utils from './utils';

let worker: Worker | null = null;
let ownsSession = false;
let unlistenPageLifecycle: (() => void) | null = null;

export async function init(
  config: InitConfig = {},
): Promise<{ send: typeof send }> {
  // One backend at a time: a second worker could not open the budget the
  // first one holds, and the first would be out of reach, along with any
  // changes it has not saved
  if (worker) {
    throw new Error(
      'The API is already running. Call shutdown() before calling init() again.',
    );
  }
  worker = new InlineWorker();

  try {
    await startBackendWorker(worker, config);
    ownsSession = Boolean(config.serverURL && config.password);
  } catch (error) {
    worker.terminate();
    worker = null;
    throw error;
  }

  unlistenPageLifecycle = listenForPageLifecycle(worker);
  return { send };
}

// Where sync access handles are missing, the engine keeps the budget in
// memory and saves it to IndexedDB a moment after each change. A page that
// is hidden asks for that save at once, as the web client does, so a reload
// right after a change does not lose it even without `shutdown()`.
//
// A page that is leaving gives the budget up altogether, saving first:
// WebKit keeps the locks and file handles of a worker whose page went into
// the back/forward cache, where they would keep the next page from opening
// the same budget until the cached page is evicted. A page that comes back
// out of that cache opens its budget again, and what was asked of the API in
// between is held back until then: the worker would run it against the
// database it closed.
//
// Best effort: a page that unloads at once may not give the worker the time
// to finish.
function listenForPageLifecycle(backend: Worker): (() => void) | null {
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    return null;
  }

  // Requests kept from the worker while the budget is given up. Each is
  // copied as posting it would have: what cannot be sent fails for its
  // caller, and later changes to it do not count
  let heldRequests: unknown[] | null = null;
  let isSendingAhead = false;
  const post = backend.postMessage.bind(backend);
  backend.postMessage = (message: unknown) => {
    if (heldRequests && !isSendingAhead) {
      heldRequests.push(structuredClone(message));
    } else {
      post(message);
    }
  };

  // For the requests that give the budget up and open it again, which go
  // ahead of the held ones; `send` posts before it returns
  function sendAhead<Result>(request: () => Promise<Result>): Promise<Result> {
    isSendingAhead = true;
    try {
      return request();
    } finally {
      isSendingAhead = false;
    }
  }

  // What the page that left asked of the worker, until the page that came
  // back has waited for it
  let leaving: Promise<unknown> | null = null;
  let reopening: Promise<void> = Promise.resolve();
  // Counts departures, so a reopening can tell that the page left again
  let departures = 0;
  // The budget to open again. Kept until it is open, as a reopening the
  // page left in the middle of may already have closed it
  let budgetToReopen: string | null = null;

  // `left` and `departure` are what the page had at its return
  async function reopenBudget(left: Promise<unknown>, departure: number) {
    // Once the page has left again, nothing more is asked of the worker:
    // the next return starts over
    const hasLeftAgain = () => departures !== departure;
    try {
      // Frozen along with its page, the worker may not have finished
      await left;
      if (!hasLeftAgain()) {
        await sendAhead(() => send('storage-resume'));
        // The worker still counts the budget it gave up as open
        const loaded = await sendAhead(() => send('load-prefs'));
        budgetToReopen ??= loaded?.id ?? null;
      }
      const budgetId = budgetToReopen;
      if (budgetId && !hasLeftAgain()) {
        await sendAhead(() => send('close-budget'));
        if (!hasLeftAgain()) {
          await sendAhead(() => send('load-budget', { id: budgetId }));
        }
      }
    } catch {
      // The held requests meet the same trouble, and report it
    }
    // The held requests wait for the next return too
    if (hasLeftAgain()) {
      return;
    }
    budgetToReopen = null;
    const requests = heldRequests ?? [];
    heldRequests = null;
    requests.forEach(request => post(request));
  }

  const onVisibilityChange = () => {
    if (document.visibilityState === 'hidden') {
      void send('storage-flush').catch(() => undefined);
    }
  };
  const onPageHide = () => {
    departures += 1;
    heldRequests ??= [];
    leaving = sendAhead(() => send('storage-release')).catch(() => undefined);
  };
  const onPageShow = (event: PageTransitionEvent) => {
    const left = leaving;
    if (event.persisted && left) {
      leaving = null;
      const departure = departures;
      reopening = reopening.then(() => reopenBudget(left, departure));
    }
  };
  window.addEventListener('pagehide', onPageHide);
  window.addEventListener('pageshow', onPageShow);
  document.addEventListener('visibilitychange', onVisibilityChange);
  return () => {
    window.removeEventListener('pagehide', onPageHide);
    window.removeEventListener('pageshow', onPageShow);
    document.removeEventListener('visibilitychange', onVisibilityChange);
  };
}

// Where the engine saves to IndexedDB, the worker holds the only copy of
// whatever a save has not stored yet, and a save can fail, on a full disk
// for one. The worker is not ended over such changes: the caller hears
// about it and can try again.
async function ensureStored() {
  try {
    await send('storage-flush');
  } catch (cause) {
    throw new Error(
      "Could not save the last changes to the browser's storage, so the " +
        'backend was left running with them. The storage is most likely ' +
        'full: make room and call shutdown() again, loading the budget ' +
        'again first if it is no longer open.',
      { cause },
    );
  }
}

export async function shutdown() {
  if (worker) {
    try {
      await send('sync');
    } catch {
      // most likely that no budget is loaded, so the sync failed
    }
    // Before closing, so that a budget whose changes cannot be stored
    // stays open, and after, because closing saves once more
    await ensureStored();
    await send('close-budget');
    await ensureStored();
    try {
      if (ownsSession) {
        await send('subscribe-sign-out');
      }
    } finally {
      ownsSession = false;
      worker.terminate();
      worker = null;
      unlistenPageLifecycle?.();
      unlistenPageLifecycle = null;
    }
  }
}
