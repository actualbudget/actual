import { useEffect, useRef } from 'react';
import type { PointerEvent, SyntheticEvent } from 'react';

const DEFAULT_DELAY_MS = 500;
const MOVE_THRESHOLD_PX = 10;
const SUPPRESS_WINDOW_MS = 700;

/**
 * Fires `onLongPress` when a pointer is held still on the element.
 *
 * Spread `handlers` onto the element and call `wasRecentLongPress()` in
 * the element's tap handlers so the pointer-up that ends a long press does
 * not also trigger the tap action. The handlers listen in the capture
 * phase so nested react-aria buttons, which stop pointer events from
 * bubbling, still take part in the hold.
 */
export function useLongPress(
  onLongPress: () => void,
  delayMs: number = DEFAULT_DELAY_MS,
) {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const startRef = useRef<{ x: number; y: number } | null>(null);
  const firedAtRef = useRef(0);

  const clear = () => {
    if (timerRef.current != null) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    startRef.current = null;
  };

  useEffect(() => {
    return () => {
      if (timerRef.current != null) {
        clearTimeout(timerRef.current);
      }
    };
  }, []);

  const onPointerDown = (event: PointerEvent<HTMLElement>) => {
    if (event.pointerType === 'mouse' && event.button !== 0) {
      return;
    }
    clear();
    startRef.current = { x: event.clientX, y: event.clientY };
    timerRef.current = setTimeout(() => {
      timerRef.current = null;
      startRef.current = null;
      firedAtRef.current = Date.now();
      onLongPress();
    }, delayMs);
  };

  const onPointerMove = (event: PointerEvent<HTMLElement>) => {
    if (!startRef.current) {
      return;
    }
    const distance = Math.hypot(
      event.clientX - startRef.current.x,
      event.clientY - startRef.current.y,
    );
    if (distance > MOVE_THRESHOLD_PX) {
      clear();
    }
  };

  const wasRecentLongPress = () =>
    Date.now() - firedAtRef.current < SUPPRESS_WINDOW_MS;

  const onContextMenu = (event: SyntheticEvent) => {
    if (startRef.current != null || wasRecentLongPress()) {
      event.preventDefault();
    }
  };

  return {
    wasRecentLongPress,
    handlers: {
      onPointerDownCapture: onPointerDown,
      onPointerMoveCapture: onPointerMove,
      onPointerUpCapture: clear,
      onPointerCancelCapture: clear,
      onPointerLeave: clear,
      onContextMenuCapture: onContextMenu,
    },
  };
}
