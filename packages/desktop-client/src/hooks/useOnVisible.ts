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
      await callback();
    } finally {
      inProgress.current = false;
      if (isPending.current) {
        isPending.current = false;
        void runCallback();
      }
    }
  });

  useEffect(() => {
    if (!isEnabled) {
      return;
    }

    if (Platform.isNativeMobileApp) {
      // One event source per platform: the web view also fires
      // `visibilitychange` on resume, which would run the callback twice.
      // Removal is async, so an event can still arrive after cleanup.
      let isRemoved = false;
      const listener = CapacitorApp.addListener(
        'appStateChange',
        ({ isActive }) => {
          if (isActive && !isRemoved) {
            void runCallback();
          }
        },
      );
      return () => {
        isRemoved = true;
        isPending.current = false;
        void listener.then(handle => handle.remove());
      };
    }

    function onVisibilityChange() {
      if (document.visibilityState !== 'visible') {
        return;
      }
      void runCallback();
    }

    document.addEventListener('visibilitychange', onVisibilityChange);
    return () => {
      isPending.current = false;
      document.removeEventListener('visibilitychange', onVisibilityChange);
    };
  }, [isEnabled]);
}
