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
  // Keep the latest callback in a ref so the effects below don't need to
  // depend on it. Callers routinely pass a new inline function every render,
  // which would otherwise tear down and re-add the native listener on every
  // render instead of only when the target element or `event` change.
  const callbackRef = useRef(callback);
  callbackRef.current = callback;

  const attachedRef = useRef<{
    el: EventTarget;
    event: string;
    listener: EventListener;
  } | null>(null);

  // Runs after every render (no dependency array) so the listener follows
  // `ref.current` when the trigger element unmounts and a new one mounts
  // (e.g. a trigger button temporarily replaced by an input). The listener is
  // only re-attached when the target element or event name actually change.
  useEffect(() => {
    const el =
      ref instanceof Document || ref instanceof Window ? ref : ref.current;
    const attached = attachedRef.current;

    if (attached && (attached.el !== el || attached.event !== event)) {
      attached.el.removeEventListener(attached.event, attached.listener);
      attachedRef.current = null;
    }

    if (el && !attachedRef.current) {
      const listener: EventListener = e =>
        callbackRef.current.call(
          el as ElementType,
          e as HTMLElementEventMap[EventType],
        );
      el.addEventListener(event, listener);
      attachedRef.current = { el, event, listener };
    }
  });

  useEffect(() => {
    return () => {
      const attached = attachedRef.current;
      if (attached) {
        attached.el.removeEventListener(attached.event, attached.listener);
        attachedRef.current = null;
      }
    };
  }, []);
}
