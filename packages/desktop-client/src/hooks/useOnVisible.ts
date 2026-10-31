import { useEffect, useEffectEvent, useRef } from 'react';

import * as Platform from '@actual-app/core/shared/platform';
import { App as CapacitorApp } from '@capacitor/app';

type UseOnVisibleOptions = {
  /** When false, the visibility listener is not attached. Default true. */
  isEnabled?: boolean;
};

/**
 * Runs the given callback when the document becomes visible (e.g. user
 * switches back to the tab). Inside the iOS and Android apps it runs when
 * the app returns to the foreground instead. Only one invocation runs at a
 * time: events arriving while the callback is still running are coalesced
 * into a single follow-up run once it finishes.
 */
export function useOnVisible(
  callback: () => void | Promise<void>,
  options: UseOnVisibleOptions = {},
) {
  const { isEnabled = true } = options;
  const inProgress = useRef(false);
  const isPending = useRef(false);

  const runCallback = useEffectEvent(async () => {
    if (inProgress.current) {
      isPending.current = true;
      return;
    }
    inProgress.current = true;
    try {
      do {
        isPending.current = false;
        await callback();
      } while (isPending.current);
    } finally {
      inProgress.current = false;
    }
  });

  useEffect(() => {
    if (!isEnabled) {
      return;
    }

    // Cleanup can race a late event: Capacitor removes its listener
    // asynchronously, and a run still in flight may have a follow-up queued.
    let isActive = true;
    function onVisible() {
      if (isActive) {
        void runCallback();
      }
    }

    // One event source per platform: the web view also fires
    // `visibilitychange` on resume, which would run the callback twice.
    const unsubscribe = Platform.isNativeMobileApp
      ? subscribeToAppResume(onVisible)
      : subscribeToDocumentVisible(onVisible);

    return () => {
      isActive = false;
      isPending.current = false;
      unsubscribe();
    };
  }, [isEnabled]);
}

function subscribeToAppResume(onResume: () => void) {
  const listener = CapacitorApp.addListener(
    'appStateChange',
    ({ isActive }) => {
      if (isActive) {
        onResume();
      }
    },
  );
  return () => {
    void listener.then(handle => handle.remove());
  };
}

function subscribeToDocumentVisible(onVisible: () => void) {
  function onVisibilityChange() {
    if (document.visibilityState === 'visible') {
      onVisible();
    }
  }
  document.addEventListener('visibilitychange', onVisibilityChange);
  return () =>
    document.removeEventListener('visibilitychange', onVisibilityChange);
}
