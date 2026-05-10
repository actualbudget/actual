import { useEffect, useEffectEvent, useRef } from 'react';

type UsePendingSyncPollingOptions = {
  enabled: boolean;
  intervalMs?: number;
  onPoll: () => void | Promise<void>;
};

export function usePendingSyncPolling({
  enabled,
  intervalMs = 2000,
  onPoll,
}: UsePendingSyncPollingOptions) {
  const inProgress = useRef(false);

  const poll = useEffectEvent(async () => {
    if (document.visibilityState !== 'visible' || inProgress.current) {
      return;
    }

    inProgress.current = true;
    try {
      await onPoll();
    } finally {
      inProgress.current = false;
    }
  });

  useEffect(() => {
    if (!enabled) {
      return;
    }

    void poll();

    const intervalId = window.setInterval(() => {
      void poll();
    }, intervalMs);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [enabled, intervalMs]);
}
