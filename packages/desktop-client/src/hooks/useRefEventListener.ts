import { useEffect, useRef } from 'react';
import type { RefObject } from 'react';

export function useRefEventListener<
  ElementType extends EventTarget,
  EventType extends keyof HTMLElementEventMap,
>(
  ref: RefObject<ElementType | null> | Document | Window,
  event: EventType,
  // oxlint-disable-next-line typescript/no-explicit-any
  callback: (this: ElementType, ev: HTMLElementEventMap[EventType]) => any,
) {
  // Keep the latest callback in a ref so the effect below doesn't need to
  // depend on it. Callers routinely pass a new inline function every render,
  // which would otherwise tear down and re-add the native listener on every
  // render instead of only when `ref`/`event` change.
  const callbackRef = useRef(callback);
  callbackRef.current = callback;

  // Track which element is currently under the ref. Components such as
  // table cells swap out their DOM node while keeping the same ref object
  // (e.g. switching between an unexposed label and an exposed input), so
  // the effect below must re-run when the target element itself changes,
  // not just when the ref object or event name changes. Reading ref.current
  // during render is safe here because the value is only consumed at
  // effect time, after React has committed any ref updates.
  const currentTarget =
    ref instanceof Document || ref instanceof Window ? ref : ref.current;

  useEffect(() => {
    const el =
      ref instanceof Document || ref instanceof Window ? ref : ref.current;
    if (!el) return;

    const listener: EventListener = e =>
      callbackRef.current.call(
        el as ElementType,
        e as HTMLElementEventMap[EventType],
      );
    el.addEventListener(event, listener);
    return () => {
      el.removeEventListener(event, listener);
    };
  }, [ref, event, currentTarget]);
}
