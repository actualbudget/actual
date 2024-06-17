import React, {
  useState,
  useCallback,
  useRef,
  type PointerEventHandler,
} from 'react';

type UseLongPressOptions = {
  delay?: number;
};

type UseLongPressHandlers = {
  onPointerDown: PointerEventHandler;
  onPointerUp: PointerEventHandler;
  onPointerLeave: PointerEventHandler;
  onPointerCancel: PointerEventHandler;
};

export const useLongPress = (
  onLongPress: (event: PointerEvent) => void,
  { delay = 300 }: UseLongPressOptions = {},
): UseLongPressHandlers => {
  const [longPressTriggered, setLongPressTriggered] = useState(false);
  const timeoutRef = useRef<number | null>(null);

  const start = useCallback(
    (event: PointerEvent) => {
      event.preventDefault();
      timeoutRef.current = setTimeout(() => {
        onLongPress(event);
        setLongPressTriggered(true);
      }, delay);
    },
    [onLongPress, delay],
  );

  const clear = useCallback(
    (event: PointerEvent, shouldTriggerClick = false) => {
      if (timeoutRef.current !== null) {
        clearTimeout(timeoutRef.current);
      }
      if (shouldTriggerClick && !longPressTriggered) {
        onLongPress(event);
      }
      setLongPressTriggered(false);
    },
    [longPressTriggered, onLongPress],
  );

  return {
    onPointerDown: event => start(event),
    onPointerUp: event => clear(event),
    onPointerLeave: event => clear(event, false),
    onPointerCancel: event => clear(event, false),
  };
};
