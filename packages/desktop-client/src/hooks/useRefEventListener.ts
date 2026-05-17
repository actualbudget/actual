import { useCallback, useEffect } from 'react';
import type { RefObject } from 'react';

export function useRefEventListener<
  ElementType extends EventTarget,
  EventType extends keyof HTMLElementEventMap,
>(
  ref: RefObject<ElementType | null>,
  event: EventType,
  // oxlint-disable-next-line typescript/no-explicit-any
  callback: (this: ElementType, ev: HTMLElementEventMap[EventType]) => any,
  // oxlint-disable-next-line typescript/no-explicit-any
  deps: any[],
) {
  // oxlint-disable-next-line eslint-plugin-react-hooks/exhaustive-deps
  const _callback = useCallback(callback, deps);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const callbackRef = _callback as EventListener; // closure?
    el.addEventListener(event, callbackRef);
    return () => {
      el.removeEventListener(event, callbackRef);
    };
  }, [ref, event, _callback]);
}
