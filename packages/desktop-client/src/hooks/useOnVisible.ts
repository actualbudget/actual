import { useEffect, useEffectEvent, useRef } from 'react';

import * as Platform from '@actual-app/core/shared/platform';
import { App as CapacitorApp } from '@capacitor/app';

type UseOnVisibleOptions = {
  /** When false, the visibility listener is not attached. Default true. */
  isEnabled?: boolean;
};

/**
 * Runs the given callback when the document becomes visible (e.g. user
 * switches back to the tab). Inside the iOS and Android apps it also runs
 * when the app returns to the foreground. Uses a guard so the callback is
 * not invoked again until the previous invocation has finished (handles
 * async callbacks).
 */
export function useOnVisible(
  callback: () => void | Promise<void>,
  options: UseOnVisibleOptions = {},
) {
  const { isEnabled = true } = options;
  const inProgress = useRef(false);

  const runCallback = useEffectEvent(async () => {
    if (inProgress.current) {
      return;
    }
    inProgress.current = true;
    try {
      await callback();
    } finally {
      inProgress.current = false;
    }
  });

  useEffect(() => {
    if (!isEnabled) {
      return;
    }
    function onVisibilityChange() {
      if (document.visibilityState !== 'visible') {
        return;
      }
      void runCallback();
    }

    document.addEventListener('visibilitychange', onVisibilityChange);

    // The web view does not reliably fire `visibilitychange` when the app is
    // backgrounded and resumed, so listen to the native app state as well.
    const appStateListener = Platform.isNativeMobileApp
      ? CapacitorApp.addListener('appStateChange', ({ isActive }) => {
          if (isActive) {
            void runCallback();
          }
        })
      : null;

    return () => {
      document.removeEventListener('visibilitychange', onVisibilityChange);
      void appStateListener?.then(handle => handle.remove());
    };
  }, [isEnabled]);
}
