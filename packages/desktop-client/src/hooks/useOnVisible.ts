import { useEffect, useEffectEvent, useRef } from 'react';

type UseOnVisibleOptions = {
  /** When false, the visibility listener is not attached. Default true. */
  isEnabled?: boolean;
};

/**
 * Runs the given callback when the document becomes visible (e.g. user
 * switches back to the tab). Uses a guard so the callback is not invoked
 * again until the previous invocation has finished (handles async callbacks).
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
    return () =>
      document.removeEventListener('visibilitychange', onVisibilityChange);
  }, [isEnabled]);
}
