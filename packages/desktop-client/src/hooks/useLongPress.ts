import React, {
  useState,
  useCallback,
  useRef,
  type PointerEventHandler,
  type PointerEvent,
} from 'react';

type UseLongPressOptions = {
  delay?: number;
};

type UseLongPressHandlers<T extends Element> = {
  onPointerDown: PointerEventHandler<T>;
  onPointerUp: PointerEventHandler<T>;
  onPointerLeave: PointerEventHandler<T>;
  onPointerCancel: PointerEventHandler<T>;
};

export const useLongPress = <T extends Element>(
  onLongPress: (event: PointerEvent<T>) => void,
  { delay = 300 }: UseLongPressOptions = {},
): UseLongPressHandlers<T> => {
  const [longPressTriggered, setLongPressTriggered] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const start = useCallback(
    (event: PointerEvent<T>) => {
      event.preventDefault();
      timeoutRef.current = setTimeout(() => {
        onLongPress(event);
        setLongPressTriggered(true);
      }, delay);
    },
    [onLongPress, delay],
  );

  const clear = useCallback(
    (event: PointerEvent<T>, shouldTriggerClick = false) => {
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
