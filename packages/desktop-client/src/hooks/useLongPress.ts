import { type PointerEventHandler, useCallback, useRef } from 'react';

type LongPressEvents = {
  onPointerDown: PointerEventHandler;
  onPointerUp: PointerEventHandler;
  onPointerMove: PointerEventHandler;
  onPointerLeave: PointerEventHandler;
};

type UseLongPressResult = {
  getLongPressEvents: () => LongPressEvents;
};

// eslint-disable-next-line import/no-unused-modules
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
    getLongPressEvents: (events?: LongPressEvents) => ({
      onPointerDown: e => {
        events?.onPointerDown?.(e);
        start();
      },
      onPointerUp: e => {
        events?.onPointerUp?.(e);
        stop();
      },
      onPointerMove: e => {
        events?.onPointerMove?.(e);
        stop();
      },
      onPointerLeave: e => {
        events?.onPointerLeave?.(e);
        stop();
      },
    }),
  };
}
