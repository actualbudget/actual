import { useEffect, useEffectEvent } from 'react';

// Dispatched on `window` by the iOS and Android shells (AppDelegate.swift and
// BackgroundSyncWorker.java) from a system background task. `detail` is a
// function to call once the work is done, so the shell can end the task.
// Cancelling the event tells the shell that the request was taken: without
// that it knows nothing was listening yet (the app is still loading, or no
// budget is open).
const BACKGROUND_SYNC_EVENT = 'actual-background-sync';

/**
 * Runs the given callback when the iOS or Android app is given time to sync
 * in the background, and tells the app when it has finished (or failed).
 */
export function useBackgroundSync(callback: () => Promise<unknown>) {
  const runCallback = useEffectEvent(async (done: () => void) => {
    try {
      await callback();
    } catch {
      // The system decides when this runs, so the server may well be
      // unreachable. Nobody is looking at the app: fail quietly.
    } finally {
      done();
    }
  });

  useEffect(() => {
    function onBackgroundSync(event: Event) {
      if (event instanceof CustomEvent && typeof event.detail === 'function') {
        event.preventDefault();
        void runCallback(event.detail);
      }
    }

    window.addEventListener(BACKGROUND_SYNC_EVENT, onBackgroundSync);
    return () =>
      window.removeEventListener(BACKGROUND_SYNC_EVENT, onBackgroundSync);
  }, []);
}
