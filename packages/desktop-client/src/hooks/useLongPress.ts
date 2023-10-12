import { useCallback, useRef } from 'react';

type LongPressEvents = {
  onPointerDown: () => void;
  onPointerUp: () => void;
  onPointerMove: () => void;
  onPointerLeave: () => void;
};

type UseLongPressResult = {
  getLongPressEvents: () => LongPressEvents;
};

export default function useLongPress(
  onLongPress: () => void,
  ms = 300,
): UseLongPressResult {
  const timeout = useRef<NodeJS.Timeout>();

  const start = useCallback(() => {
    timeout.current = setTimeout(() => {
      onLongPress();
    }, ms);
  }, [onLongPress]);

  const stop = useCallback(() => {
    if (timeout.current) {
      clearTimeout(timeout.current);
    }
  }, []);

  return {
    getLongPressEvents: () => ({
      onPointerDown: start,
      onPointerUp: stop,
      onPointerMove: stop,
      onPointerLeave: stop,
    }),
  };
}
